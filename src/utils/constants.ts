import dotenv from 'dotenv';
dotenv.config();

export enum SIMPLYBOOK_ACTION_ENUM {
  NEW_BOOKING = 'NEW_BOOKING',
  CANCELLED_BOOKING = 'CANCELLED_BOOKING',
}

export enum STORYBLOK_STORY_STATUS_ENUM {
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
  DELETED = 'deleted',
}

export enum LANGUAGE_DEFAULT {
  EN = 'en',
  ES = 'es',
}

export enum PartnerAccessCodeStatusEnum {
  VALID = 'VALID',
  INVALID_CODE = 'INVALID_CODE',
  DOES_NOT_EXIST = 'DOES_NOT_EXIST',
  ALREADY_IN_USE = 'ALREADY_IN_USE',
  CODE_EXPIRED = 'CODE_EXPIRED',
}

const getEnv = (env: string, envName: string): string => {
  try {
    if (!env) throw `Unable to get environemt variable ${envName}`;

    return env;
  } catch (error) {
    console.log(error);
  }
};

const env = getEnv(process.env.NODE_ENV, 'NODE_ENV');
export const isProduction = env === 'production';
export const isDevelopment = env === 'development';

export const rollbarEnv = getEnv(process.env.ROLLBAR_ENV, 'ROLLBAR_ENV');
export const rollbarToken = getEnv(process.env.ROLLBAR_TOKEN, 'ROLLBAR_TOKEN');

export const databaseUrl = getEnv(process.env.DATABASE_URL, 'DATABASE_URL');
export const firebaseType = getEnv(process.env.FIREBASE_TYPE, 'FIREBASE_TYPE');
export const firebaseProjectId = getEnv(process.env.FIREBASE_PROJECT_ID, 'FIREBASE_PROJECT_ID');
export const firebasePrivateKeyId = getEnv(
  process.env.FIREBASE_PRIVATE_KEY_ID,
  'FIREBASE_PRIVATE_KEY_ID',
);
export const firebasePrivateKey = getEnv(process.env.FIREBASE_PRIVATE_KEY, 'FIREBASE_PRIVATE_KEY');
export const firebaseClientEmail = getEnv(
  process.env.FIREBASE_CLIENT_EMAIL,
  'FIREBASE_CLIENT_EMAIL',
);
export const firebaseClientId = getEnv(process.env.FIREBASE_CLIENT_ID, 'FIREBASE_CLIENT_ID');
export const firebaseAuthUri = getEnv(process.env.FIREBASE_AUTH_URI, 'FIREBASE_AUTH_URI');
export const firebaseTokenUri = getEnv(process.env.FIREBASE_TOKEN_URI, 'FIREBASE_TOKEN_URI');
export const firebaseCertUrl = getEnv(process.env.FIREBASE_CERT_URL, 'FIREBASE_CERT_URL');
export const firebaseClientCert = getEnv(process.env.FIREBASE_CLIENT_CERT, 'FIREBASE_CLIENT_CERT');

export const firebaseApiKey = getEnv(process.env.FIREBASE_API_KEY, 'FIREBASE_API_KEY');
export const firebaseAuthDomain = getEnv(process.env.FIREBASE_AUTH_DOMAIN, 'FIREBASE_AUTH_DOMAIN');
export const firebaseStorageBucket = getEnv(
  process.env.FIREBASE_STORAGE_BUCKET,
  'FIREBASE_STORAGE_BUCKET',
);
export const firebaseMessagingSenderId = getEnv(
  process.env.FIREBASE_MESSAGING_SENDER_ID,
  'FIREBASE_MESSAGING_SENDER_ID',
);
export const firebaseAppId = getEnv(process.env.FIREBASE_API_ID, 'FIREBASE_API_ID');
export const firebaseMeasurementId = getEnv(
  process.env.FIREBASE_MEASUREMENT_ID,
  'FIREBASE_MEASUREMENT_ID',
);

export const zapierToken = getEnv(process.env.ZAPIER_TOKEN, 'ZAPIER_TOKEN');

export const crispToken = getEnv(process.env.CRISP_TOKEN, 'CRISP_TOKEN');
export const websiteToken = getEnv(process.env.WEBSITE_TOKEN, 'WEBSITE_TOKEN');

export const slackWebhookUrl = getEnv(process.env.SLACK_WEBHOOK_URL, 'SLACK_WEBHOOK_URL');

export const storyblokToken = getEnv(process.env.STORYBLOK_PUBLIC_TOKEN, 'STORYBLOK_PUBLIC_TOKEN');
