import { Transform, TransformFnParams } from 'class-transformer';
import { ValidateBy, buildMessage, ValidationOptions } from 'class-validator';
import * as validator from 'validator';

// DOMPurify setup for Node.js environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let DOMPurify: any;
try {
  const { JSDOM } = require('jsdom');
  const createDOMPurify = require('dompurify');
  const window = new JSDOM('').window;
  DOMPurify = createDOMPurify(window);
} catch (error) {
  // Fallback if JSDOM is not available (e.g., in browser environment)
  DOMPurify = require('dompurify');
}

type DOMPurifyConfig = {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: string[];
  [key: string]: unknown;
};

/**
 * Sanitizes HTML content using DOMPurify to prevent XSS attacks
 */
export const SanitizeHtml = (options?: DOMPurifyConfig) =>
  Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    return DOMPurify.sanitize(value, options || {});
  });

/**
 * Trims whitespace and sanitizes HTML content
 */
export const TrimAndSanitizeHtml = (options?: DOMPurifyConfig) =>
  Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    return DOMPurify.sanitize(value.trim(), options || {});
  });

/**
 * Strips all HTML tags from input
 */
export const StripHtmlTags = () =>
  Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    return value.replace(/<[^>]*>/g, '');
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
 * Escapes SQL-like patterns that could be dangerous
 */
export const EscapeSqlPatterns = () =>
  Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    // Escape common SQL injection patterns
    return value
      .replace(/'/g, "''")  // Escape single quotes
      .replace(/;/g, '\\;')  // Escape semicolons
      .replace(/--/g, '\\-\\-')  // Escape SQL comments
      .replace(/\/\*/g, '\\/\\*')  // Escape multi-line comments
      .replace(/\*\//g, '\\*\\/')
      .replace(/\bUNION\b/gi, 'UNION')  // Normalize but don't remove (let validation catch it)
      .replace(/\bSELECT\b/gi, 'SELECT')
      .replace(/\bINSERT\b/gi, 'INSERT')
      .replace(/\bUPDATE\b/gi, 'UPDATE')
      .replace(/\bDELETE\b/gi, 'DELETE')
      .replace(/\bDROP\b/gi, 'DROP');
  });

/**
 * Removes null bytes and control characters
 */
export const RemoveControlCharacters = () =>
  Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    // Remove null bytes and most control characters except newlines and tabs
    // eslint-disable-next-line no-control-regex
    return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  });

/**
 * Applies comprehensive sanitization for text inputs
 */
export const SanitizeText = () =>
  Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    
    let sanitized = value;
    
    // Remove control characters
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Basic XSS protection - remove script tags and javascript: protocols
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, ''); // Remove event handlers
    
    return sanitized;
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
            /(\|\||&&|\bOR\b.*=.*\bOR\b)/gi
          ];
          
          return !sqlPatterns.some(pattern => pattern.test(value));
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
            /on\w+\s*=/gi,
            /<[^>]+on\w+\s*=/gi,
            /expression\s*\(/gi,
            /@import/gi,
            /document\.(cookie|domain|write)/gi,
            /window\.(location|open)/gi
          ];
          
          return !xssPatterns.some(pattern => pattern.test(value));
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

/**
 * Combined sanitization and validation for user input
 */
export const SecureText = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (target: any, propertyKey: string) {
    // Apply transformations first
    TrimAndSanitizeHtml()(target, propertyKey);
    RemoveControlCharacters()(target, propertyKey);
    
    // Then apply validations
    IsNotSqlInjection()(target, propertyKey);
    IsNotXss()(target, propertyKey);
  };
};