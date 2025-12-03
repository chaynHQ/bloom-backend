import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateBy,
  ValidationOptions,
  buildMessage,
} from 'class-validator';
import * as validator from 'validator';

// DOMPurify setup for Node.js environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let DOMPurify: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JSDOM } = require('jsdom');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const createDOMPurify = require('dompurify');
  const window = new JSDOM('').window;
  DOMPurify = createDOMPurify(window);
} catch {
  // Fallback if JSDOM is not available (e.g., in browser environment)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  DOMPurify = require('dompurify');
}

type SecureInputType = 'text' | 'email' | 'html' | 'plaintext' | 'id' | 'password';

type SecureInputOptions = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  allowedTags?: string[];
  allowedAttributes?: string[];
  customValidation?: ValidationOptions;
};

type DOMPurifyConfig = {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: string[];
  [key: string]: unknown;
};

/**
 * Unified secure input decorator that handles sanitization and validation
 * Provides comprehensive protection against XSS, SQL injection, and other attacks
 *
 * @param type - The type of input field ('text', 'email', 'html', 'plaintext', 'id', 'password')
 * @param options - Configuration options for validation and sanitization
 *
 * Usage examples:
 * @SecureInput('text', { required: true, maxLength: 50 })
 * @SecureInput('email', { required: true })
 * @SecureInput('html', { maxLength: 5000, allowedTags: ['b', 'i', 'p'] })
 * @SecureInput('id', { maxLength: 36 })
 */
export function SecureInput(type: SecureInputType, options: SecureInputOptions = {}) {
  const {
    required = false,
    minLength,
    maxLength,
    allowedTags,
    allowedAttributes,
    customValidation,
  } = options;

  return function (target: object, propertyName: string) {
    // Apply transformation first
    const transformDecorator = getSecureTransform(type, {
      allowedTags,
      allowedAttributes,
      maxLength,
    });
    transformDecorator(target, propertyName);

    // Apply validation decorators
    const validators = getSecureValidators(type, {
      required,
      minLength,
      maxLength,
      customValidation,
    });

    validators.forEach((validator) => validator(target, propertyName));
  };
}

/**
 * Gets the appropriate transformation for the input type
 */
function getSecureTransform(
  type: SecureInputType,
  options: Pick<SecureInputOptions, 'allowedTags' | 'allowedAttributes' | 'maxLength'>,
) {
  const { allowedTags, allowedAttributes, maxLength } = options;

  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;

    // Remove control characters first (C0 and C1 control characters)
    // eslint-disable-next-line no-control-regex
    let cleanedValue = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

    // Trim whitespace
    cleanedValue = cleanedValue.trim();

    // Truncate if maxLength specified (prevent DoS attacks)
    if (maxLength && cleanedValue.length > maxLength) {
      cleanedValue = cleanedValue.substring(0, maxLength);
    }

    // Apply type-specific sanitization
    switch (type) {
      case 'email': {
        // Normalize email and ensure lowercase
        const normalized = validator.normalizeEmail(cleanedValue, {
          gmail_remove_dots: false,
          gmail_remove_subaddress: false,
          outlookdotcom_remove_subaddress: false,
          yahoo_remove_subaddress: false,
          icloud_remove_subaddress: false,
        });
        return normalized || cleanedValue.toLowerCase();
      }

      case 'html': {
        // Allow specific HTML tags with strict attribute control
        const htmlConfig: DOMPurifyConfig = {
          ALLOWED_TAGS: allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
          ALLOWED_ATTR: allowedAttributes || [],
          ALLOW_DATA_ATTR: false,
          ALLOW_ARIA_ATTR: false,
          ALLOW_UNKNOWN_PROTOCOLS: false,
          KEEP_CONTENT: true,
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'style', 'meta'],
          FORBID_ATTR: [
            'onerror',
            'onload',
            'onclick',
            'onmouseover',
            'onfocus',
            'onblur',
            'onchange',
            'onsubmit',
          ],
        };
        return DOMPurify.sanitize(cleanedValue, htmlConfig);
      }

      case 'plaintext':
      case 'text':
      case 'password':
        // Strip all HTML for plain text fields with maximum security
        return DOMPurify.sanitize(cleanedValue, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: [],
          KEEP_CONTENT: true,
        });

      case 'id':
        // Very strict - only alphanumeric, hyphens, underscores
        return validator.whitelist(
          cleanedValue,
          'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_',
        );

      default:
        // Default to plain text sanitization for unknown types
        return DOMPurify.sanitize(cleanedValue, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    }
  });
}

/**
 * Gets the appropriate validators for the input type
 */
function getSecureValidators(
  type: SecureInputType,
  options: Pick<SecureInputOptions, 'required' | 'minLength' | 'maxLength' | 'customValidation'>,
) {
  const { required, minLength, maxLength, customValidation } = options;
  const validators: PropertyDecorator[] = [];

  // Basic type validation
  validators.push(IsString(customValidation));

  // Required validation
  if (required) {
    validators.push(IsNotEmpty(customValidation));
  } else {
    validators.push(IsOptional());
  }

  // Length validations
  if (minLength) {
    validators.push(
      MinLength(minLength, {
        message: `$property must be at least ${minLength} characters`,
        ...customValidation,
      }),
    );
  }

  if (maxLength) {
    validators.push(
      MaxLength(maxLength, {
        message: `$property must not exceed ${maxLength} characters`,
        ...customValidation,
      }),
    );
  }

  // Type-specific validations
  switch (type) {
    case 'email':
      validators.push(
        IsEmail(undefined, {
          message: '$property must be a valid email address',
          ...customValidation,
        }),
      );
      break;

    case 'id':
      validators.push(IsSecureId(customValidation));
      break;

    default:
      // All types get comprehensive security validation
      validators.push(IsSecureInput(customValidation));
      break;
  }

  return validators;
}

/**
 * Comprehensive security validator using DOMPurify and SQL pattern detection
 * Protects against XSS, SQL injection, and other injection attacks
 */
function IsSecureInput(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isSecureInput',
      validator: {
        validate: (value: unknown) => {
          if (typeof value !== 'string') return true;

          // Enhanced SQL injection patterns (more comprehensive)
          const sqlPatterns = [
            // Union-based injections
            /(\bUNION\b.*\bSELECT\b)/gi,
            // Basic SQL commands
            /(\bSELECT\b.*\bFROM\b)/gi,
            /(\bINSERT\b.*\bINTO\b)/gi,
            /(\bUPDATE\b.*\bSET\b)/gi,
            /(\bDELETE\b.*\bFROM\b)/gi,
            // Schema manipulation
            /(\bDROP\b.*\b(TABLE|DATABASE|SCHEMA)\b)/gi,
            /(\bALTER\b.*\bTABLE\b)/gi,
            /(\bCREATE\b.*\b(TABLE|DATABASE|USER)\b)/gi,
            // Command injection
            /(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE))/gi,
            // Comment-based injections
            /(--|#|\/\*)/gi,
            /('\s*;\s*--)/gi,
            // Boolean-based injections
            /(\|\||&&|\bOR\b.*=.*\bOR\b)/gi,
            /(\bAND\b.*=.*\bAND\b)/gi,
            // Time-based injections
            /(\bSLEEP\b|\bWAITFOR\b)/gi,
            // Information schema attacks
            /(\bINFORMATION_SCHEMA\b)/gi,
            // Stored procedure calls
            /(\bEXEC\b|\bEXECUTE\b|\bsp_)/gi,
          ];

          // Check for SQL injection patterns
          if (sqlPatterns.some((pattern) => pattern.test(value))) {
            return false;
          }

          // Use DOMPurify to detect XSS and other HTML-based attacks
          // Compare original vs sanitized content - if different, something malicious was removed
          const sanitized = DOMPurify.sanitize(value, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true,
          });

          // Additional checks for common attack vectors
          const dangerousPatterns = [
            // JavaScript protocol
            /javascript:/gi,
            /vbscript:/gi,
            // Data URLs (can be used for XSS)
            /data:(?!image\/)/gi,
            // Event handlers
            /on\w+\s*=/gi,
            // Style expressions (IE)
            /expression\s*\(/gi,
            // CSS imports
            /@import/gi,
            // File system access attempts
            /\.\.\/|\.\.\\|\.\./g,
            // Null bytes
            // eslint-disable-next-line no-control-regex
            /\x00/g,
          ];

          if (dangerousPatterns.some((pattern) => pattern.test(value))) {
            return false;
          }

          return value === sanitized;
        },
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property contains potentially dangerous content',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}

/**
 * Validator for ID fields - very strict alphanumeric + hyphens/underscores only
 * Prevents path traversal and injection attacks in ID fields
 */
function IsSecureId(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isSecureId',
      validator: {
        validate: (value: unknown) => {
          if (typeof value !== 'string') return true;

          // Only allow alphanumeric, hyphens, underscores
          // No dots, slashes, or other special characters that could be used for attacks
          if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            return false;
          }

          // Additional checks for common ID-based attacks
          const dangerousIdPatterns = [
            // Path traversal
            /\.\./g,
            // Null bytes
            // eslint-disable-next-line no-control-regex
            /\x00/g,
            // SQL wildcards
            /%/g,
            /\*/g,
            // Command injection attempts
            /[;&|`$()]/g,
          ];

          return !dangerousIdPatterns.some((pattern) => pattern.test(value));
        },
        defaultMessage: buildMessage(
          (eachPrefix) =>
            eachPrefix + '$property must contain only letters, numbers, hyphens, and underscores',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
