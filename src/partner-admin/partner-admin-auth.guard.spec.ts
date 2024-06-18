import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';
import { AuthService } from 'src/auth/auth.service';
import { PartnerAdminEntity } from 'src/entities/partner-admin.entity';
import { UserEntity } from 'src/entities/user.entity';
import { EMAIL_REMINDERS_FREQUENCY } from 'src/utils/constants';
import { Repository } from 'typeorm';
import { createQueryBuilderMock } from '../../test/utils/mockUtils';
import { PartnerAdminAuthGuard } from './partner-admin-auth.guard';

const userEntity: UserEntity = {
  updatedAt: null,
  createdAt: new Date(),
  firebaseUid: '123',
  id: 'userid',
  email: 'usermail',
  name: 'name',
  contactPermission: false,
  serviceEmailsPermission: true,
  emailRemindersFrequency: EMAIL_REMINDERS_FREQUENCY.TWO_MONTHS,
  isSuperAdmin: false,
  crispTokenId: '123',
  partnerAccess: [],
  partnerAdmin: { id: 'partnerAdminId', active: true, partner: {} } as PartnerAdminEntity,
  isActive: true,
  lastActiveAt: new Date(),
  courseUser: [],
  signUpLanguage: 'en',
  subscriptionUser: [],
  therapySession: [],
  eventLog: [],
};
describe('PartnerAdminAuthGuard', () => {
  let guard: PartnerAdminAuthGuard;
  let mockAuthService: DeepMocked<AuthService>;
  let mockUserRepository: DeepMocked<Repository<UserEntity>>;
  let context: ExecutionContext;

  beforeEach(() => {
    mockAuthService = createMock<AuthService>();
    mockUserRepository = createMock<Repository<UserEntity>>();
    guard = new PartnerAdminAuthGuard(mockAuthService, mockUserRepository);
    context = createMock<ExecutionContext>({
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ headers: { authorization: 'authed!' } }),
      }),
    });
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when the user is a partner admin', async () => {
    jest.spyOn(mockAuthService, 'parseAuth').mockImplementation(() =>
      Promise.resolve({
        uid: 'uuid',
      } as DecodedIdToken),
    );
    jest.spyOn(mockUserRepository, 'createQueryBuilder').mockImplementationOnce(
      createQueryBuilderMock({
        getOne: jest.fn().mockResolvedValue(userEntity),
      }) as never, // TODO resolve this typescript issue
    );

    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(true);
  });
  it('should return false when the user is not a partner admin', async () => {
    jest.spyOn(mockAuthService, 'parseAuth').mockImplementation(() =>
      Promise.resolve({
        uid: 'uuid',
      } as DecodedIdToken),
    );
    jest.spyOn(mockUserRepository, 'createQueryBuilder').mockImplementationOnce(
      createQueryBuilderMock({
        getOne: jest.fn().mockResolvedValue({ ...userEntity, partnerAdmin: null }),
      }) as never, // TODO resolve this typescript issue
    );

    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(false);
  });

  it('should return true when the partner admin is active', async () => {
    jest.spyOn(mockAuthService, 'parseAuth').mockImplementation(() =>
      Promise.resolve({
        uid: 'uuid',
      } as DecodedIdToken),
    );
    jest.spyOn(mockUserRepository, 'createQueryBuilder').mockImplementationOnce(
      createQueryBuilderMock({
        getOne: jest.fn().mockResolvedValue(userEntity),
      }) as never, // TODO resolve this typescript issue
    );

    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(true);
  });

  it('should return error when the partner admin is inactive', async () => {
    jest.spyOn(mockAuthService, 'parseAuth').mockImplementation(() =>
      Promise.resolve({
        uid: 'uuid',
      } as DecodedIdToken),
    );
    jest.spyOn(mockUserRepository, 'createQueryBuilder').mockImplementationOnce(
      createQueryBuilderMock({
        getOne: jest.fn().mockResolvedValue({
          ...userEntity,
          partnerAdmin: { id: 'partnerAdminId', active: false, partner: {} },
        }),
      }) as never, // TODO resolve this typescript issue
    );

    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(false);
  });

  it('should return false when the authtoken cannot be resolved', async () => {
    const badAuthMessage = 'bad auth token';
    jest
      .spyOn(mockAuthService, 'parseAuth')
      .mockImplementation(() => Promise.reject(badAuthMessage));
    try {
      await guard.canActivate(context);
      fail('it should not reach here');
    } catch (error) {
      expect(error.message).toBe(
        `PartnerAdminAuthGuard - Error parsing firebase user: ${badAuthMessage}`,
      );
    }
  });
});
