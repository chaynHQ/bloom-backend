import { Transform, TransformFnParams } from 'class-transformer';
import { buildMessage, ValidateBy, ValidationOptions } from 'class-validator';
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

type DOMPurifyConfig = {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: string[];
  [key: string]: unknown;
};

/**
 * Sanitizes HTML content using DOMPurify to prevent XSS attacks
 * Provides safe defaults while allowing customization for specific use cases
 */
export const SanitizeHtml = (options?: DOMPurifyConfig) =>
  Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;

    // Default safe configuration
    const defaultConfig: DOMPurifyConfig = {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      ...options,
    };

    return DOMPurify.sanitize(value, defaultConfig);
  });

/**
 * Trims whitespace from string inputs
 */
export const TrimWhitespace = () =>
  Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  });

/**
 * Normalizes email addresses (lowercase, trim)
 */
export const NormalizeEmail = () =>
  Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    return validator.normalizeEmail(value) || value.toLowerCase().trim();
  });

/**
 * Applies comprehensive sanitization for text inputs
 */
export const SanitizeText = () =>
  Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;

    // Remove control characters first
    // eslint-disable-next-line no-control-regex
    const cleanedValue = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Let DOMPurify handle all the XSS protection - it's designed for this
    return DOMPurify.sanitize(cleanedValue.trim());
  });

/**
 * Custom validator to check for dangerous SQL patterns
 */
export function IsNotSqlInjection(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isNotSqlInjection',
      validator: {
        validate: (value: unknown) => {
          if (typeof value !== 'string') return true;

          const sqlPatterns = [
            /(\bUNION\b.*\bSELECT\b)/gi,
            /(\bSELECT\b.*\bFROM\b)/gi,
            /(\bINSERT\b.*\bINTO\b)/gi,
            /(\bUPDATE\b.*\bSET\b)/gi,
            /(\bDELETE\b.*\bFROM\b)/gi,
            /(\bDROP\b.*\bTABLE\b)/gi,
            /(\bALTER\b.*\bTABLE\b)/gi,
            /(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE))/gi,
            /(';\s*--)/gi,
            /(\|\||&&|\bOR\b.*=.*\bOR\b)/gi,
          ];

          return !sqlPatterns.some((pattern) => pattern.test(value));
        },
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property contains potentially dangerous SQL patterns',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}

/**
 * Custom validator to check for XSS patterns
 */
export function IsNotXss(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isNotXss',
      validator: {
        validate: (value: unknown) => {
          if (typeof value !== 'string') return true;

          const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
            /<embed\b[^<]*>/gi,
            /<link\b[^<]*>/gi,
            /<meta\b[^<]*>/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /data:/gi,
            /on\w+\s*=/gi,
            /<[^>]+on\w+\s*=/gi,
            /expression\s*\(/gi,
            /@import/gi,
            /document\.(cookie|domain|write)/gi,
            /window\.(location|open)/gi,
          ];

          return !xssPatterns.some((pattern) => pattern.test(value));
        },
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property contains potentially dangerous XSS patterns',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
