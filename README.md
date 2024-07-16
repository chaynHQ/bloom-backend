# Welcome to Bloom

[![Bloom Backend CI Pipeline](https://github.com/chaynHQ/bloom-backend/actions/workflows/.ci.yml/badge.svg)](https://github.com/chaynHQ/bloom-backend/actions/workflows/.ci.yml)

**Currently in active development.**

Bloom is a remote trauma support service from Chayn, a global charity supporting survivors of abuse across borders. Bloom is our flagship product; a free, web-based support service designed for anyone who has experienced or is currently experiencing domestic or sexual abuse. Through a combination of online video-based courses, anonymous interaction and 1:1 chat, Bloom aims to provide tailored information, guidance, everyday tools, and comforting words to cope with traumatic events. 💖

## Get Involved

Do you want to make an impact with Chayn and receive special access to our organization and volunteer opportunities? Please visit our [Getting Involved Guide](https://www.chayn.co/get-involved) to get started!

Other ways you can support Chayn are [donating](https://www.paypal.me/chaynhq), starring this repository ⭐ (so we can find more contributors like you!), making an open-source contribution, and supporting us on social media!

Find us online:

- Website: [https://www.chayn.co/](https://www.chayn.co/)
- Linktree: [https://linktr.ee/chayn](https://linktr.ee/chayn)
- Twitter: [@ChaynHQ](https://twitter.com/ChaynHQ)
- Instagram: [@chaynhq](https://www.instagram.com/chaynhq/)
- Youtube: [Chayn Team](www.youtube.com/@chaynhq)
- LinkedIn: [@chayn](https://www.linkedin.com/company/chayn)

# Contributing to Bloom Backend

Before making a contribution, please read our Contributing Guidelines in the [CONTRIBUTING.md](/CONTRIBUTING.md) file.

We ask all contributors to follow our [Contributing Guidelines](/CONTRIBUTING.md) to help Chayn developers maintain open-source best practices.

Happy coding! ⭐

## Technologies Used:

For a more detailed explanation of this project's key concepts and architecture, please visit the [/docs directory](https://github.com/chaynHQ/bloom-backend/tree/develop/docs).

- [NestJS](https://nestjs.com/) - NodeJs framework for building scalable and reliable server-side applications
- [PostgreSQL](https://www.postgresql.org/about/) - Object-relational SQL database system
- [TypeORM](https://github.com/typeorm/typeorm) - Object Relational Mapper library
- [Firebase](https://firebase.google.com/docs/auth) - User authentication
- [Storyblok](https://www.storyblok.com/) - Headless CMS for pages and courses content
- [Simplybook](https://simplybook.me/en/) - Appointment booking system used for therapy
- [Slack](https://api.slack.com/messaging/webhooks) - Slack webhooks to send messages to the team
- [Rollbar](https://rollbar.com/) - Error reporting
- [Crisp](https://crisp.chat/en/) - User messaging
- [Mailchimp](https://mailchimp.com/developer/marketing/) - Transactional email
- [Docker](https://www.docker.com/) - Containers for api and db
- [Heroku](https://heroku.com) - Build, deploy and operate staging and production apps
- [GitHub Actions](https://github.com/features/actions) - CI pipeline

## Local development

### Prerequisites

- NodeJS v20.x
- Yarn v1.x
- Docker

### Run in Dev Container - OPTIONAL

**Recommended for Visual Studio & Visual Studio Code users.**

This method will automatically install all dependencies and IDE settings in a Dev Container (Docker container) within Visual Studio Code.

Directions for running a dev container:

1. Meet the [system requirements](https://code.visualstudio.com/docs/devcontainers/containers#_system-requirements)
2. Follow the [installation instructions](https://code.visualstudio.com/docs/devcontainers/containers#_installation)
3. [Check the installation](https://code.visualstudio.com/docs/devcontainers/tutorial#_check-installation)
4. After you've verified that the extension is installed and working, click on the "Remote Status" bar icon and select
   "Reopen in Container". From here, the option to "Re-open in Container" should pop up in notifications whenever opening this project in VS.
5. [Configure your environment variables](#configure-environment-variables) and develop as you normally would.

The dev Container is configured in the `.devcontainer` directory:

- `docker-compose.yml` file in this directory extends the `docker-compose.yml` in the root directory.
- `devcontainer.json` configures the integrations with Visual Studio Code, such as the IDE extensions and settings in the `vscode` directory.

See [Visual Studio Code Docs: Developing Inside a Dev Container](https://code.visualstudio.com/docs/devcontainers/containers) for more info.

### Install dependencies

```bash
yarn
```

### Configure Environment Variables

Create a new `.env` file and populate it with the variables below. Note that only the Firebase and Simplybook tokens are required.
To configure the Firebase variables, first [create a Firebase project in the Firebase console](https://firebase.google.com/) (Google account required).
Next, follow [these directions](https://firebase.google.com/docs/cloud-messaging/auth-server#provide-credentials-manually) to generate a private key file in JSON format.
These will generate all the required Firebase variables.

The Simplybook variables can be mocked data, meaning **you do not need to use real Simplybook variables, simply copy paste the values given below.**
If you acquire real Simplybook environment variables, use the same format given below.

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
FIREBASE_MEASUREMENT_ID= # must enable Google Anayltics in Firebase project

# VARIABLES REQUIRED FOR TESTING, REPLACE WITH REAL VALUES IF NEEDED
SIMPLYBOOK_CREDENTIALS='{"login":"testlogin","password":"testpassword","company":"testcompany"}'
SIMPLYBOOK_COMPANY_NAME=testcompany

# VARIABLES BELOW ARE ALL OPTIONAL
ROLLBAR_TOKEN=
ZAPIER_TOKEN=
SLACK_WEBHOOK_URL=
CRISP_TOKEN=
CRISP_WEBSITE_TOKEN=
MAILCHIMP_API_KEY=
MAILCHIMP_AUDIENCE_ID=
MAILCHIMP_SERVER_PREFIX=
RESPOND_IO_CREATE_CONTACT_WEBHOOK=
RESPOND_IO_DELETE_CONTACT_WEBHOOK=
```

### Run the App Locally

#### Using Docker - RECOMMENDED

The project is containerized and can be run solely in docker - both the PostgreSQL database and NestJS app. To run the backend locally, make sure your system has Docker installed - you may need Docker Desktop if using a Mac or Windows.

First make sure the docker app is running (just open the app). Then run

```bash
docker-compose up
```

You should see this in the shell output:

```shell
Listening on localhost:35001, CTRL+C to stop
```

_Note: you can use an application like Postman to test the apis locally_

#### Without Docker

First install [postgres](https://www.postgresql.org/). Next follow directions to [seed the database](#seed-local-database), then run:

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

Add the new migration import into [typeorm.config.ts](./src/typeorm.config.ts)

To run (apply) migrations

```bash
yarn migration:run
```

To revert a migration

```bash
yarn migration:revert
```

Note that when running the app in Docker, you may need to run migration commands from the docker terminal/Exec

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

If you're an open-source contributor, add data to your local database by seeding it with a backup file. Please read the [Chayn Tech Wiki Guide](https://www.notion.so/chayn/Tech-volunteer-wiki-5356c7118c134863a2e092e9df6cbc34?pvs=4#0fb25ffde84f4854b2d9730200eee283) to obtain a backup file and follow directions to seed the local database.

If you're staff and have access to Heroku, you also have the option to seed the database via the following script. Before you start, make sure:

1. bloom-local-db container is running in Docker
2. you are logged into the Heroku via your terminal. Read more about the Heroku Cli [here](https://devcenter.heroku.com/articles/heroku-cli)
3. Replace <HEROKU_APP_NAME> with the correct Heroku app name in the `seed-local-db.sh file`
4. Run `chmod +x ./seed-local-db.sh` in your terminal to make the file executable

After the above has been confirmed, run

```bash
bash seed-local-db.sh
```

## Git Flow and Deployment

**The develop branch is our source of truth, not main.**

Create new branches from the `develop` base branch. There is no need to run the build command before pushing changes to GitHub, simply push and create a pull request for the new branch. GitHub Actions will run build and linting tasks automatically. Rebase and merge feature/bug branches into `develop`.

This will trigger an automatic deployment to the staging app by Heroku.

When changes have been tested in staging, merge `develop` into `main`. This will trigger an automatic deployment to the production app by Heroku.

## Swagger

Swagger automatically reflects all of the endpoints in the app, showing their urls and example request and response objects.

To access Swagger simply run the project and visit http://localhost:35001/swagger

## License

Bloom and all of Chayn's projects are open source.
The core tech stack included here is open source however some external integrations used in the project require subscriptions.
