## Configure Environment Variables

Create a new `.env` file and fill it with the **required** environment variables:

```
# Variables for building and running tests.
# Provided variables are read-only and subject to change.
#===============================================================
# REQUIRED VARIABLES FOR LOCAL DEVELOPMENT
#---------------------------------------------------------------
# CORE ENVIRONMENT VARIABLES
PORT=35001
DATABASE_URL=postgres://<username>:<password>@<host>:<port>/<db>
NODE_ENV=development

# FIREBASE AUTH AND ANALYTICS
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT=
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_API_ID=
FIREBASE_MEASUREMENT_ID=

# REQUIRED VARIABLES FOR TESTING
#---------------------------------------------------------------
# MOCK VALUES (can replace with real values or new mocks in same format)
SIMPLYBOOK_CREDENTIALS='{"login":"testlogin","password":"api_user_key_customapikey","company":"testcompany"}'
SIMPLYBOOK_COMPANY_NAME=testcompany
SIMPLYBOOK_WEBHOOK_SECRET=generate-your-own-secret
SIMPLYBOOK_TOTP_SECRET= # Required when 2FA is enabled on the Simplybook admin account

# OPTIONAL VARIABLES
#---------------------------------------------------------------
ROLLBAR_ENV=development # Rollbar logging
ROLLBAR_TOKEN= # Rollbar logging
SLACK_THERAPY_WEBHOOK_URL= # Slack webhook for #bloom-therapy channel (booking events + error alerts)
FRONT_CHAT_API_TOKEN
FRONT_CHANNEL_ID
FRONT_CONTACT_LIST_ID
FRONT_CHAT_WEBHOOK_TOKEN
FRONT_CHANNEL_SIGNING_SECRET
FRONT_APP_UID
FRONT_SUPPORT_EMAIL= # (optional) Front sender address used to distinguish agent replies in chat history; defaults to support@bloom.chayn.co
MAILCHIMP_API_KEY= # Email messaging
RESPOND_IO_CREATE_CONTACT_WEBHOOK= # RESPOND.IO
RESPOND_IO_DELETE_CONTACT_WEBHOOK= # RESPOND.IO
```

## How to Configure Variables:

The Firebase environment variables for Bloom’s frontend and backend are configured by [creating a project in the Firebase console](https://firebase.google.com/) (Google account is required). Ensure the toggle is turned on to enable Google Analytics as it is required for the `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

For `FIREBASE_PRIVATE_KEY_ID`, follow [these directions](https://firebase.google.com/docs/cloud-messaging/auth-server#provide-credentials-manually) to generate a private key file in JSON format.

The frontend and backend each have _required_ and _optional_ environment variables. Required variables are necessary for local development, and optional variables are for specific features.

Note: Variables provided by Chayn are public, not linked to production, and subject to change at any time. Check for updates if you are experiencing problems. The absence of some optional environment variables may result in test failures. If you require an optional environment variable and cannot acquire it yourself (some must be connected to Chayn in some way), please reach out to the team in GitHub’s issue discussions.

**Please notify us if creating new environment variables in your PR so we can add it to Render before release deployment.**

## Simplybook Variables

`SIMPLYBOOK_CREDENTIALS` must be a JSON string with the following shape:

```json
{ "login": "<api_user_key_or_login>", "password": "<password>", "company": "<company_login>" }
```

For production, use a Simplybook **API User Key** (`api_user_key_...`) as the `login` value — this bypasses IP verification restrictions on the admin API.

`SIMPLYBOOK_WEBHOOK_SECRET` is the shared secret used to authenticate incoming webhooks from Simplybook at `POST /api/webhooks/simplybook-admin`. Configure the same value as the `?token=` query parameter in the Simplybook webhook callback URL:

```
https://<your-domain>/api/webhooks/simplybook-admin?token=<SIMPLYBOOK_WEBHOOK_SECRET>
```

`SIMPLYBOOK_TOTP_SECRET` is required when 2FA is enabled on the Simplybook admin account. It is the base32 TOTP secret shown during 2FA setup (the same secret you scan into an authenticator app). Leave unset if 2FA is not enabled.
