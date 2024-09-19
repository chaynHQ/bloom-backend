# Bloom by Chayn

[![Bloom Backend CI Pipeline](https://github.com/chaynHQ/bloom-backend/actions/workflows/.ci.yml/badge.svg)](https://github.com/chaynHQ/bloom-backend/actions/workflows/.ci.yml)

Bloom is a remote trauma support service from [Chayn](https://www.chayn.co/about), a global, award-winning charity designing open-source tools to support the healing of survivors across the world. Since 2013, Chayn has reached over 500,000 survivors worldwide with our trauma-informed, survivor-centred, and intersectional approaches in utilizing tech for social impact. Bloom is our flagship product; a free, web-based, secure support service designed to aid in the healing of survivors. Through a combination of online video-based courses, anonymous interaction, and 1:1 chat, Bloom provides tailored information, self-help guidance, everyday tools, and comfort to cope with traumatic events.

Explore Chayn's [website](https://www.chayn.co/about), [research](https://org.chayn.co/research), [resources](https://www.chayn.co/resources), [projects](https://org.chayn.co/projects), [impact](https://org.chayn.co/impact), and [support services directory](https://www.chayn.co/global-directory). 💖

## Support Our Work

Chayn is proudly open-source and built with volunteer contributions. We are grateful for the generosity of the open-source community and aim to provide a fulfilling experience for open-source developers.

**Please give this repository a star ⭐ and follow our GitHub profile 🙏 to help us grow our open-source community and find more contributors like you!**

Support our mission further by [sponsoring us on GitHub](https://github.com/sponsors/chaynHQ), exploring our [volunteer programs](https://www.chayn.co/get-involved), and following Chayn on social media: - Linktree: [https://linktr.ee/chayn](https://linktr.ee/chayn) - Twitter: [@chaynhq](https://twitter.com/ChaynHQ) - Instagram: [@chaynhq](https://www.instagram.com/chaynhq/) - Youtube: [@chaynhq](https://www.youtube.com/@chaynhq) - Facebook: [@chayn](https://www.facebook.com/chayn) - LinkedIn: [@chayn](https://www.linkedin.com/company/chayn).

# Bloom Backend Contribution Docs:

By making an open-source contribution to Chayn, you have agreed to our [Code of Conduct](/CODE_OF_CONDUCT.md).

Happy coding! ⭐

## Technologies Used:

Visit the [/docs directory](https://github.com/chaynHQ/bloom-backend/tree/develop/docs) for an overview of Bloom's backend architecture and key concepts.

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
- [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/) for linting and formatting.

## Local development

### Summary

To run Bloom's backend: install prerequisites, configure environment variables, install dependencies, then run in a Dev Container, with Docker, or manually.

Most contributions (and running Cypress integration tests from the frontend) require [populating your local database](#populate-database) with test data.

### Prerequisites

- NodeJS v20.x
- Yarn v1.x
- Docker
- PostgreSQL 16
- Read [Contribution Guidelines](/CONTRIBUTING.md)

### Configure Environment Variables

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

#### How to Configure Firebase Variables:

Bloom's required Firebase variables are obtained by creating a Firebase project, then generating a private key file in JSON format. First, create a Firebase project [in the Firebase console here](https://firebase.google.com/) (Google account required). Next, [follow these directions](https://firebase.google.com/docs/cloud-messaging/auth-server#provide-credentials-manually) to generate your private key file.

### Install dependencies with yarn

```bash
yarn
```

### Run in Docker - Recommended

Bloom's backend is containerized and can be run solely in Docker - both the PostgreSQL database and NestJS app. To run the backend locally, make sure your system has Docker installed - you may need Docker Desktop if using a Mac or Windows.

First, make sure the Docker app is running (just open the app). Then run

```bash
docker-compose up
```

You should see this in the shell output:

```shell
Listening on localhost:35001, CTRL+C to stop
```

_Note: you can use an application like Postman to test the apis locally_

### Run in Dev Container - Recommended for Visual Studio Users

This method will automatically install all dependencies, IDE settings, and postgres container in a Dev Container (Docker container) within Visual Studio Code.

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

### Run Manually

Manage postgres locally to [populate the database](#populate-database), then run:

```bash
yarn start:dev
```

You should see this in the shell output:

```shell
Listening on localhost:35001, CTRL+C to stop
```

### Unit Testing

To run all unit tests

```bash
yarn test
```

To have your unit tests running in the background as you change code:

```bash
yarn test:watch
```

### Format and Linting

Linting and formatting are provided by [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/). We recommend VSCode users to utilize the workspace settings in [.vscode/settings.json](.vscode/settings.json) and install the extensions in [.vscode/extensions](.vscode/extensions.json) for automated consistency.

**We strongly recommend maintaining consistent code style by linting and formatting before every commit:**

To run linting

```bash
yarn lint
```

To lint and fix

```bash
yarn lint:fix
```

Run format and fix:

```bash
yarn format
```

### Populate Database

Most open-source contributions (like running Cypress integration tests from the frontend) require adding test data to your local database. To do this, navigate to our [Chayn Tech Wiki Guide](https://www.notion.so/chayn/Chayn-Tech-Contributor-Wiki-5356c7118c134863a2e092e9df6cbc34?pvs=4#eb2e24de94bd451f8683abe496656013) to obtain a backup file and follow directions there to populate your local database.

Chayn staff with access to Heroku, you also have the option to seed the database via the following script. Before you start, make sure:

1. bloom-local-db container is running in Docker
2. you are logged into the Heroku via your terminal. Read more about the Heroku Cli [here](https://devcenter.heroku.com/articles/heroku-cli)
3. Replace <HEROKU_APP_NAME> with the correct Heroku app name in the `seed-local-db.sh file`
4. Run `chmod +x ./seed-local-db.sh` in your terminal to make the file executable

   After the above has been confirmed, run

   ```bash
   bash seed-local-db.sh
   ```

### Database Migrations

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
