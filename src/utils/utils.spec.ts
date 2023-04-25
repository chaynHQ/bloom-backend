import { generateRandomString } from './utils';

describe('Utils', () => {
  describe('generateRandomString', () => {
    it('should create string of length 10', () => {
      const randomString = generateRandomString(10);
      expect(randomString.length).toBe(10);
    });
    it('should create string of the correct length 2', () => {
      const randomString = generateRandomString(2);
      expect(randomString.length).toBe(2);
    });
  });
});
