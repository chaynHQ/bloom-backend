import dotenv from 'dotenv';
dotenv.config();

export enum ENVIRONMENTS {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

export enum SIGNUP_TYPE {
  PUBLIC_USER = 'PUBLIC_USER',
  PARTNER_USER_WITH_CODE = 'PARTNER_USER_WITH_CODE',
  PARTNER_USER_WITHOUT_CODE = 'PARTNER_USER_WITHOUT_CODE',
}

export enum LANGUAGE_DEFAULT {
  EN = 'en',
  ES = 'es',
}

export enum EMAIL_REMINDERS_FREQUENCY {
  TWO_WEEKS = 'TWO_WEEKS',
  ONE_MONTH = 'ONE_MONTH',
  TWO_MONTHS = 'TWO_MONTHS',
  NEVER = 'NEVER',
}

export enum FEATURES {
  AUTOMATIC_ACCESS_CODE = 'AUTOMATIC_ACCESS_CODE',
}

export enum PROGRESS_STATUS {
  STARTED = 'Started',
  COMPLETED = 'Completed',
  NOT_STARTED = 'Not Started',
}

export enum SIMPLYBOOK_ACTION_ENUM {
  NEW_BOOKING = 'NEW_BOOKING',
  CANCELLED_BOOKING = 'CANCELLED_BOOKING',
  UPDATED_BOOKING = 'UPDATED_BOOKING',
  COMPLETED_BOOKING = 'COMPLETED_BOOKING', // currently not in use as no webhook available - could be updated in cron job
}

export enum FEEDBACK_TAGS_ENUM {
  RELATABLE = 'relatable',
  USEFUL = 'useful',
  INSPIRING = 'inspiring',
  TOO_LONG = 'too long',
  TOO_COMPLICATED = 'too complicated',
  NOT_USEFUL = 'not useful',
}

export enum STORYBLOK_STORY_STATUS_ENUM {
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
  DELETED = 'deleted',
}

export enum PartnerAccessCodeStatusEnum {
  VALID = 'VALID',
  INVALID_CODE = 'INVALID_CODE',
  DOES_NOT_EXIST = 'DOES_NOT_EXIST',
  ALREADY_IN_USE = 'ALREADY_IN_USE',
  ALREADY_APPLIED = 'ALREADY_APPLIED',
  CODE_EXPIRED = 'CODE_EXPIRED',
}

export enum WhatsappSubscriptionStatusEnum {
  ALREADY_EXISTS = 'ALREADY_EXISTS',
}

export enum COMMUNICATION_SERVICE {
  CRISP = 'CRISP',
  MAILCHIMP = 'MAILCHIMP',
}

const getEnv = (env: string, envName: string): string => {
  try {
    if (!env) throw `Unable to get environment variable ${envName}`;

    return env;
  } catch (error) {
    if (nodeEnv !== ENVIRONMENTS.TEST) console.log(error);
  }
};

export const nodeEnv = getEnv(process.env.NODE_ENV, 'NODE_ENV');
export const isProduction = nodeEnv === ENVIRONMENTS.PRODUCTION;
export const frontendAppUrl = getEnv(process.env.FRONTEND_APP_URL, 'FRONTEND_APP_URL');

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
export const crispWebsiteId = getEnv(process.env.CRISP_WEBSITE_ID, 'CRISP_WEBSITE_ID');

export const slackWebhookUrl = getEnv(process.env.SLACK_WEBHOOK_URL, 'SLACK_WEBHOOK_URL');

export const storyblokToken = getEnv(process.env.STORYBLOK_PUBLIC_TOKEN, 'STORYBLOK_PUBLIC_TOKEN');

export const storyblokWebhookSecret =
  getEnv(process.env.STORYBLOK_WEBHOOK_SECRET, 'STORYBLOK_WEBHOOK_SECRET') || '';

export const simplybookCredentials = getEnv(
  process.env.SIMPLYBOOK_CREDENTIALS,
  'SIMPLYBOOK_CREDENTIALS',
);
export const simplybookCompanyName = getEnv(
  process.env.SIMPLYBOOK_COMPANY_NAME,
  'SIMPLYBOOK_COMPANY_NAME',
);

export const respondIoCreateContactWebhook = getEnv(
  process.env.RESPOND_IO_CREATE_CONTACT_WEBHOOK,
  'RESPOND_IO_CREATE_CONTACT_WEBHOOK',
);

export const respondIoDeleteContactWebhook = getEnv(
  process.env.RESPOND_IO_DELETE_CONTACT_WEBHOOK,
  'RESPOND_IO_DELETE_CONTACT_WEBHOOK',
);

export const mailchimpApiKey = getEnv(process.env.MAILCHIMP_API_KEY, 'MAILCHIMP_API_KEY');
export const mailchimpMarketingPermissionId = getEnv(
  process.env.MAILCHIMP_MARKETING_PERMISSION_ID,
  'MAILCHIMP_MARKETING_PERMISSION_ID',
);
export const mailchimpAudienceId = getEnv(
  process.env.MAILCHIMP_AUDIENCE_ID,
  'MAILCHIMP_AUDIENCE_ID',
);
export const mailchimpServerPrefix = getEnv(
  process.env.MAILCHIMP_SERVER_PREFIX,
  'MAILCHIMP_SERVER_PREFIX',
);
