/**
 * PII redaction utilities for log messages and error objects.
 *
 * - redactPii()        – scrubs emails and phone numbers from free-text strings.
 *                        Applied automatically by the Logger as a safety net.
 * - safeErrorMessage() – extracts a loggable message from an error without
 *                        dumping the full object (which may contain PII).
 */

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /\+?\d[\d\s\-()]{7,}\d/g;

export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex < 1) return '[REDACTED_EMAIL]';
  return `${email[0]}***@${email.slice(atIndex + 1)}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '[REDACTED_PHONE]';
  return `****${digits.slice(-4)}`;
}

/** Scrub emails and phone numbers from a string. */
export function redactPii(message: string): string {
  return message.replace(EMAIL_PATTERN, (m) => maskEmail(m)).replace(PHONE_PATTERN, (m) => maskPhone(m));
}

/**
 * Safely extract a loggable message from an error without leaking PII.
 * Use this instead of JSON.stringify(error).
 */
export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    const parts: string[] = [];
    if (err.message) parts.push(String(err.message));
    if (err.status) parts.push(`status: ${err.status}`);
    if (err.code) parts.push(`code: ${err.code}`);
    return parts.length > 0 ? parts.join(', ') : 'Unknown error';
  }
  return 'Unknown error';
}
