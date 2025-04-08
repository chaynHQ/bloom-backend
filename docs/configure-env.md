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
SIMPLYBOOK_CREDENTIALS='{"login":"testlogin","password":"testpassword","company":"testcompany"}'
SIMPLYBOOK_COMPANY_NAME=testcompany

# OPTIONAL VARIABLES
#---------------------------------------------------------------
ROLLBAR_ENV=development # Rollbar logging
ROLLBAR_TOKEN= # Rollbar logging
ZAPIER_TOKEN= # Zapier automation
SLACK_WEBHOOK_URL= # Slack messaging bots
CRISP_TOKEN= # Crisp chat
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
