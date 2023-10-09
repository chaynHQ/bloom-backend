# Bloom

Bloom is a remote trauma support service from Chayn, a global charity supporting survivors of abuse across borders. Bloom is our flagship product; a free, web-based support service designed for anyone who has experienced or is currently experiencing domestic or sexual abuse. Through a combination of online video-based courses, anonymous interaction and 1:1 chat, Bloom aims to provide tailored information, guidance, everyday tools, and comforting words to cope with traumatic events. 💖

## Get involved

If you would like to help Bloom and receive special access to our organization and volunteer opportunities, please get in touch with us to express your interest in volunteering via [this form](https://forms.gle/qXfDdPgJxYwvMmVP7). We'll get back to you to schedule an onboarding call. Other ways to get involved and support us are [donating](https://www.paypal.me/chaynhq), starring this repo and making an open-source contribution here on GitHub, and supporting us on social media! 

Our social medias:

Website - [Chayn](https://www.chayn.co/)

Twitter - [@ChaynHQ](https://twitter.com/ChaynHQ)

Instagram - [@chaynhq](https://www.instagram.com/chaynhq/)

Youtube - [Chayn Team](https://www.youtube.com/channel/UC5_1Ci2SWVjmbeH8_USm-Bg)

LinkedIn - [@chayn](https://www.linkedin.com/company/chayn)

# Bloom Backend

[![Bloom Backend CI Pipeline](https://github.com/chaynHQ/bloom-backend/actions/workflows/.ci.yml/badge.svg)](https://github.com/chaynHQ/bloom-backend/actions/workflows/.ci.yml)

**Currently in active development**

## Contribution

To make a contribution, please read our Contributing Guidelines in [CONTRIBUTING.md](https://github.com/chaynHQ/bloom-backend/blob/develop/CONTRIBUTING.md)

## Technologies Used:

- [NestJS](https://nestjs.com/) - NodeJs framework for building scalable and reliable server-side applications
- [PostgreSQL](https://www.postgresql.org/about/) - Object-relational SQL database system
- [TypeORM](https://github.com/typeorm/typeorm) - Object Relational Mapper library
- [Firebase](https://firebase.google.com/docs/auth) - User authentication
- [Storyblok](https://www.storyblok.com/) - Headless CMS for pages and courses content
- [Simplybook](https://simplybook.me/en/) - Appointment booking system used for therapy
- [Slack](https://api.slack.com/messaging/webhooks) - Slack webhooks to send messages to the team
- [Rollbar](https://rollbar.com/) - Error reporting
- [Crisp](https://crisp.chat/en/) - User messaging
- [Docker](https://www.docker.com/) - Containers for api and db
- [Heroku](https://heroku.com) - Build, deploy and operate staging and production apps
- [GitHub Actions](https://github.com/features/actions) - CI pipeline
- Swagger - API documentation

## Local development

### Prerequisites

- NodeJS v16.x
- Yarn v1.x
- Docker

### Install dependencies

```bash
yarn
```

### Create `.env` file

Include the following environment variables in a `.env` file. 

You will need to gather the following tokens from [Firebase](https://firebase.google.com/docs/projects/api-keys), these are required for the app to function. However, the [Simplybook](https://simplybook.me/en/) variables are required to pass all tests.  All other environment variables from Rollbar, Zapier, Slack, Crisp, and Mailchimp are optional. If you're a volunteer loading up the back-end, please get in touch with the team for access to the environment variables.

```
ROLLBAR_ENV=development
PORT=35001

DATABASE_URL=postgres://<username>:<password>@<host>:<port>/<db>

NODE_ENV=development

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

SIMPLYBOOK_CREDENTIALS=
SIMPLYBOOK_COMPANY_NAME=

# VARIABLES BELOW ARE ALL OPTIONAL
ROLLBAR_TOKEN= 
ZAPIER_TOKEN= 
SLACK_WEBHOOK_URL=
CRISP_TOKEN=
CRISP_WEBSITE_TOKEN=
MAILCHIMP_MANDRILL_API_KEY=
MAILCHIMP_THERAPY_TEMPLATE_ID=
MAILCHIMP_THERAPY_FROM_EMAIL=
RESPOND_IO_CREATE_CONTACT_WEBHOOK=
RESPOND_IO_DELETE_CONTACT_WEBHOOK=
```

### Run locally (with Docker) - RECOMMENDED

The project is containerized and can be run solely in docker - both the PostgreSQL database and NestJS app. To run the backend locally, make sure your system has Docker installed - you may need Docker Desktop if using a Mac.

First make sure the docker app is running (just open the app). Then run

```bash
docker-compose up
```

You should see this in the shell output:

```shell
Listening on localhost:35001, CTRL+C to stop
```

_Note: you can use an application like Postman to test the apis locally_

**Run the app**

```bash
yarn start:dev
```

You should see this in the shell output:

```shell
Listening on localhost:35001, CTRL+C to stop
```

### Database migrations

A migration in TypeORM is a single file with SQL queries to update a database schema as updates/additions are made. Read more about migrations [here](https://github.com/typeorm/typeorm/blob/master/docs/migrations.md).

Migrations are automatically run when the app is built docker (locally) or Heroku for staging and production apps.

**You'll need to generate and run a migration each time you add or update a database field or table.**

To generate a new migration

```bash
yarn migration:generate
```

To run (apply) migrations

```bash
yarn migration:run
```

To revert a migration

```bash
yarn migration:revert
```

**New environment variables must be added to Heroku before release.**

### Run unit tests

To run all unit tests

```bash
yarn test
```

To have your unit tests running in the background as you change code:

```bash
yarn test:watch
```

### Formatting and linting

To run linting

```bash
yarn lint
```

To lint and fix

```bash
yarn lint:fix
```

Formatting and linting is provided by ESLint and Prettier (see the relevant configs for details).

Workspace settings for VSCode are included for consistent linting and formatting.

### Seed Local Database

If you're a volunteer, the way to add data to your local database is to seed it using a backup file. Please get in touch with the team to get access to the backup file.

If you're staff and have access to Heroku, you also have the option to seed the database via the following script. Before you start, make sure:

1. bloom-local-db container is running in Docker
2. you are logged into the Heroku via your terminal. Read more about the Heroku Cli [here](https://devcenter.heroku.com/articles/heroku-cli)
3. Replace <HEROKU_APP_NAME> with the correct Heroku app name in the `seed-local-db.sh file`
4. Run `chmod +x ./seed-local-db.sh` in your terminal to make the file executable

After the above has been confirmed, run

```bash
bash seed-local-db.sh
```
For a more detailed explanation of this project's key concepts and architecture, please visit the [/docs directory](https://github.com/chaynHQ/bloom-backend/tree/develop/docs).

## Git flow and deployment

Create new branches from the `develop` base branch. There is no need to run the build command before pushing changes to GitHub, simply push and create a pull request for the new branch. GitHub Actions will run build and linting tasks automatically. Rebase and merge feature/bug branches into `develop`.

This will trigger an automatic deployment to the staging app by Heroku.

When changes have been tested in staging, merge `staging` into `main`. This will trigger an automatic deployment to the production app by Heroku.

## Swagger

Swagger automatically reflects all of the endpoints in the app, showing their urls and example request and response objects.

To access Swagger simply run the project and visit http://localhost:35001/swagger

## License

Bloom and all of Chayn's projects are open source.
The core tech stack included here is open source however some external integrations used in the project require subscriptions.
