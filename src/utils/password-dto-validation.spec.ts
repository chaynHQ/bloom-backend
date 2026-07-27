// DOMPurify's jsdom-backed init is flaky under ts-jest (it silently falls back to the
// factory, leaving `.sanitize` undefined). We only need a deterministic tag-stripper here to
// exercise the *non*-password sanitisation path; password fields bypass DOMPurify entirely.
// The stub doubles as both factory and instance so it works whichever init branch the module
// takes. This does not affect any password assertion below.
jest.mock('dompurify', () => {
  const sanitize = (input: unknown) => String(input).replace(/<[^>]*>/g, '');
  const factory: any = () => ({ sanitize });
  factory.sanitize = sanitize;
  return factory;
});

import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { UserAuthDto } from '../auth/dto/user-auth.dto';
import { CreateUserDto } from '../user/dtos/create-user.dto';

// Exercises the exact transform + validate pipeline the global ValidationPipe
// ({ transform: true, whitelist: true }) applies to incoming request bodies.
async function runDto<T extends object>(
  cls: new () => T,
  payload: Record<string, unknown>,
): Promise<{ instance: T; errors: ValidationError[] }> {
  const instance = plainToInstance(cls, payload);
  const errors = await validate(instance as object);
  return { instance, errors };
}

const errorsForProperty = (errors: ValidationError[], property: string) =>
  errors.filter((error) => error.property === property);

// Passwords that legitimate users choose but the old IsSecureInput matcher rejected,
// causing POST /v1/user to 400 (and login via /auth to fail).
const previouslyRejectedPasswords = [
  'MyP@ss#123', // '#'
  'blue--sky42', // '--'
  'pass||word', // '||'
  'me&&you7', // '&&'
  'v1.0..2', // '..'
  'a<b>c!D9', // HTML-like sequence (was stripped to '')
  'Str0ng&Secure', // '&'
  '  spaces  in!7', // leading/trailing/internal whitespace must be preserved
];

const baseCreateUser = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  contactPermission: true,
};

describe('password DTO validation (opaque secret handling)', () => {
  describe('CreateUserDto', () => {
    it.each(previouslyRejectedPasswords)(
      'accepts %j and preserves it byte-for-byte',
      async (password) => {
        const { instance, errors } = await runDto(CreateUserDto, {
          ...baseCreateUser,
          password,
        });

        expect(errorsForProperty(errors, 'password')).toHaveLength(0);
        // Not trimmed, sanitised or truncated — must match what the user typed at login.
        expect(instance.password).toBe(password);
      },
    );

    it('accepts a fully valid payload with no errors at all', async () => {
      const { errors } = await runDto(CreateUserDto, {
        ...baseCreateUser,
        password: 'Str0ng&Secure#Pass',
      });
      expect(errors).toHaveLength(0);
    });

    it('still requires a password', async () => {
      const { errors } = await runDto(CreateUserDto, { ...baseCreateUser });
      expect(errorsForProperty(errors, 'password').length).toBeGreaterThan(0);
    });

    it('rejects a password over 128 chars rather than silently truncating', async () => {
      const long = 'a'.repeat(129);
      const { instance, errors } = await runDto(CreateUserDto, {
        ...baseCreateUser,
        password: long,
      });
      expect(errorsForProperty(errors, 'password').length).toBeGreaterThan(0);
      expect(instance.password).toBe(long); // preserved, not chopped to 128
    });

    it('still sanitises non-password text fields (name)', async () => {
      const { instance } = await runDto(CreateUserDto, {
        ...baseCreateUser,
        name: '<script>alert(1)</script>Ada',
        password: 'Safe123!',
      });
      // Proves the opaque-password change did not weaken sanitisation elsewhere.
      expect(String(instance.name)).not.toContain('<script>');
    });
  });

  describe('UserAuthDto (login)', () => {
    it.each(previouslyRejectedPasswords)(
      'accepts login password %j exactly',
      async (password) => {
        const { instance, errors } = await runDto(UserAuthDto, {
          email: 'ada@example.com',
          password,
        });
        expect(errorsForProperty(errors, 'password')).toHaveLength(0);
        expect(instance.password).toBe(password);
      },
    );
  });
});
