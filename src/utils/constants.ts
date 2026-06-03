import dotenv from 'dotenv';
dotenv.config();

enum ENVIRONMENTS {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

export const LANGUAGE_DEFAULT = 'en';

export enum SIGNUP_TYPE {
  PUBLIC_USER = 'PUBLIC_USER',
  PARTNER_USER_WITH_CODE = 'PARTNER_USER_WITH_CODE',
  PARTNER_USER_WITHOUT_CODE = 'PARTNER_USER_WITHOUT_CODE',
}

export enum RESOURCE_CATEGORIES {
  SHORT_VIDEO = 'short_video',
  SINGLE_VIDEO = 'single_video',
  CONVERSATION = 'conversation',
}

export enum STORYBLOK_PAGE_COMPONENTS {
  COURSE = 'Course',
  SESSION = 'Session',
  SESSION_IBA = 'session_iba',
  RESOURCE_SINGLE_VIDEO = 'resource_single_video',
  RESOURCE_SHORT_VIDEO = 'resource_short_video',
  RESOURCE_CONVERSATION = 'resource_conversation',
  MEET_THE_TEAM = 'meet_the_team',
  WELCOME = 'Welcome',
  PAGE = 'page',
}

export enum STORYBLOK_STORY_STATUS_ENUM {
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
  DELETED = 'deleted',
  MOVED = 'moved',
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
  NOT_STARTED = 'Not Started',
  STARTED = 'Started',
  COMPLETED = 'Completed',
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

export enum PartnerAccessCodeStatusEnum {
  VALID = 'VALID',
  INACTIVE = 'INACTIVE',
  INVALID_CODE = 'INVALID_CODE',
  DOES_NOT_EXIST = 'DOES_NOT_EXIST',
  ALREADY_IN_USE = 'ALREADY_IN_USE',
  ALREADY_APPLIED = 'ALREADY_APPLIED',
  CODE_EXPIRED = 'CODE_EXPIRED',
}

export enum WhatsappSubscriptionStatusEnum {
  ALREADY_EXISTS = 'ALREADY_EXISTS',
}

const getEnv = (env: string, envName: string): string => {
  if (!env) {
    if (nodeEnv !== ENVIRONMENTS.TEST) {
      console.error(`Environment configuration error: Missing required variable ${envName}`);
    }
    return;
  }
  return env;
};

const nodeEnv = getEnv(process.env.NODE_ENV, 'NODE_ENV');
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

export const frontChatApiToken = getEnv(process.env.FRONT_CHAT_API_TOKEN, 'FRONT_CHAT_API_TOKEN');
export const frontChannelId = getEnv(process.env.FRONT_CHANNEL_ID, 'FRONT_CHANNEL_ID');
export const frontContactListId = getEnv(
  process.env.FRONT_CONTACT_LIST_ID,
  'FRONT_CONTACT_LIST_ID',
);
export const frontChatWebhookToken = getEnv(
  process.env.FRONT_CHAT_WEBHOOK_TOKEN,
  'FRONT_CHAT_WEBHOOK_TOKEN',
);
export const frontChannelSigningSecret =
  getEnv(process.env.FRONT_CHANNEL_SIGNING_SECRET, 'FRONT_CHANNEL_SIGNING_SECRET') || '';
export const frontAppUid = getEnv(process.env.FRONT_APP_UID, 'FRONT_APP_UID');

export const FRONT_API_BASE_URL = 'https://api2.frontapp.com';
// Retry delays (ms) applied only to message-send paths so a transient Front 429/5xx
// doesn't surface as a lost user message. Keep small — the user is waiting on the ack.
export const FRONT_SEND_RETRY_DELAYS_MS = [200, 800];

export const FRONT_CHAT_ATTACHMENT_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'application/pdf',
]);
export const FRONT_CHAT_ATTACHMENT_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export const simplybookWebhookSecret = getEnv(
  process.env.SIMPLYBOOK_WEBHOOK_SECRET,
  'SIMPLYBOOK_WEBHOOK_SECRET',
);
// Fail fast in production rather than silently rejecting every Simplybook webhook
// with a 401. SIMPLYBOOK_TOTP_SECRET is intentionally not required at startup because
// it's only needed when 2FA is enabled on the Simplybook account.
if (isProduction && !simplybookWebhookSecret) {
  throw new Error('SIMPLYBOOK_WEBHOOK_SECRET is required in production');
}

export const simplybookTotpSecret = getEnv(
  process.env.SIMPLYBOOK_TOTP_SECRET,
  'SIMPLYBOOK_TOTP_SECRET',
);

export const slackTherapyWebhookUrl = getEnv(
  process.env.SLACK_THERAPY_WEBHOOK_URL,
  'SLACK_THERAPY_WEBHOOK_URL',
);
export const slackBloomUsersWebhookUrl = getEnv(
  process.env.SLACK_BLOOM_USERS_WEBHOOK_URL,
  'SLACK_BLOOM_USERS_WEBHOOK_URL',
);
export const slackDeletedUsersWebhookUrl = getEnv(
  process.env.SLACK_BLOOM_DELETED_USERS_WEBHOOK_URL,
  'SLACK_BLOOM_DELETED_USERS_WEBHOOK_URL',
);
// Bot-token + channel for threaded reporting digests. Required for the
// reporting flow (single-message webhooks cannot post thread replies) — no
// webhook fallback; missing config causes the run to fail loudly so the gap
// is visible in logs rather than silently degrading to a truncated message.
export const slackReportingBotToken = getEnv(
  process.env.SLACK_REPORTING_BOT_TOKEN,
  'SLACK_REPORTING_BOT_TOKEN',
);
export const slackReportingChannelId = getEnv(
  process.env.SLACK_REPORTING_CHANNEL_ID,
  'SLACK_REPORTING_CHANNEL_ID',
);

// Optional with a default — read process.env directly rather than via
// getEnv() which would log a misleading "Missing required variable" warning
// on every boot when the var isn't set (it isn't required).
export const reportingTimezone = process.env.REPORTING_TIMEZONE || 'Europe/London';

export const ga4PropertyId = getEnv(process.env.GA4_PROPERTY_ID, 'GA4_PROPERTY_ID');
export const ga4ServiceAccountKeyJson = getEnv(
  process.env.GA4_SERVICE_ACCOUNT_KEY_JSON,
  'GA4_SERVICE_ACCOUNT_KEY_JSON',
);

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

export const mailchimpWebhookSecret = process.env.MAILCHIMP_WEBHOOK_SECRET || '';

export const frontSupportEmail = process.env.FRONT_SUPPORT_EMAIL || 'support@bloom.chayn.co';
