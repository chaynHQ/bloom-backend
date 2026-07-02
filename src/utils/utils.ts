import { webcrypto } from 'crypto';
import { cypressReservedTestEmails, isProduction } from './constants';
const crypto = webcrypto as unknown as Crypto;

export const generateRandomString = (length: number) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  const randomValues = new Uint32Array(length);
  const cryptoedValues = crypto.getRandomValues(randomValues);

  return [...cryptoedValues]
    .map((val) => {
      return characters.charAt(val % charactersLength);
    })
    .join('');
};

export const getAcronym = (text: string) => {
  const exclude = ['in', 'and', 'the', 'from', 'as', 'or', 'to'];
  const string = text.split(' ').filter((word) => !exclude.includes(word));
  const abbreviatedString = string
    .reduce((response, word) => (response + word.slice(0, 1)), '')
    .toUpperCase();

  return abbreviatedString;
};

export const isCypressTestEmail = (email: string): boolean => {
  return email.includes('cypresstestemail');
};

// Reserved Cypress test accounts are protected from the bulk test-user deletion on
// non-production environments only. On production they are not protected, so a
// superadmin cleanup there will still remove them.
export const isProtectedReservedTestEmail = (email: string): boolean => {
  if (isProduction || !email) return false;
  return cypressReservedTestEmails.includes(email.trim().toLowerCase());
};
