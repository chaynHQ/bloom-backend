import { webcrypto } from 'crypto';
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

export const getYesterdaysDate = () => new Date(new Date().setDate(new Date().getDate() - 1));
