import {
  maskEmail,
  maskPhone,
  partiallyMaskEmail,
  redactPii,
  safeErrorMessage,
} from './pii-redaction';

describe('pii-redaction', () => {
  describe('partiallyMaskEmail', () => {
    it('returns [REDACTED_EMAIL] when there is no @', () => {
      expect(partiallyMaskEmail('not-an-email')).toBe('[REDACTED_EMAIL]');
    });

    it('returns [REDACTED_EMAIL] when the email starts with @', () => {
      expect(partiallyMaskEmail('@chayn.co')).toBe('[REDACTED_EMAIL]');
    });

    it('masks the single local-part character but keeps the domain', () => {
      expect(partiallyMaskEmail('a@chayn.co')).toBe('*@chayn.co');
    });

    it('masks both characters of a two-character local part', () => {
      expect(partiallyMaskEmail('ab@chayn.co')).toBe('**@chayn.co');
    });

    it('keeps first and last chars of a three-char local part and masks the middle', () => {
      expect(partiallyMaskEmail('eve@chayn.co')).toBe('e*e@chayn.co');
    });

    it('keeps first and last chars of a longer local part and length-preserves the mask', () => {
      expect(partiallyMaskEmail('eleanor@chayn.co')).toBe('e*****r@chayn.co');
    });

    it('produces different outputs for different local parts (recognisability)', () => {
      expect(partiallyMaskEmail('alice@chayn.co')).not.toBe(partiallyMaskEmail('bob@chayn.co'));
    });
  });

  describe('maskEmail', () => {
    it('keeps first char of local part and domain', () => {
      expect(maskEmail('eleanor@chayn.co')).toBe('e***@chayn.co');
    });

    it('returns [REDACTED_EMAIL] for malformed input', () => {
      expect(maskEmail('@chayn.co')).toBe('[REDACTED_EMAIL]');
      expect(maskEmail('no-at-sign')).toBe('[REDACTED_EMAIL]');
    });
  });

  describe('maskPhone', () => {
    it('returns last 4 digits of a phone number prefixed with ****', () => {
      expect(maskPhone('+44 7700 900123')).toBe('****0123');
    });

    it('returns [REDACTED_PHONE] when there are fewer than 4 digits', () => {
      expect(maskPhone('+44')).toBe('[REDACTED_PHONE]');
    });
  });

  describe('redactPii', () => {
    it('scrubs emails from free-text strings', () => {
      expect(redactPii('Booking failed for eleanor@chayn.co please retry')).toBe(
        'Booking failed for e***@chayn.co please retry',
      );
    });

    it('scrubs phone numbers from free-text strings', () => {
      expect(redactPii('User called from +44 7700 900123 about session')).toContain('****0123');
    });

    it('leaves text without PII unchanged', () => {
      expect(redactPii('webhook accepted')).toBe('webhook accepted');
    });
  });

  describe('safeErrorMessage', () => {
    it('returns the message of an Error instance', () => {
      expect(safeErrorMessage(new Error('boom'))).toBe('boom');
    });

    it('returns the string verbatim for string errors', () => {
      expect(safeErrorMessage('bad token')).toBe('bad token');
    });

    it('extracts message/status/code from a plain object error', () => {
      expect(safeErrorMessage({ message: 'oops', status: 500, code: 'E_INT' })).toBe(
        'oops, status: 500, code: E_INT',
      );
    });

    it('falls back to Unknown error when no recognisable shape', () => {
      expect(safeErrorMessage({})).toBe('Unknown error');
      expect(safeErrorMessage(null)).toBe('Unknown error');
      expect(safeErrorMessage(42)).toBe('Unknown error');
    });
  });
});
