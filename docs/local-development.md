# Local Development Guide

## Summary

**The develop branch is our source of truth.** Fork from develop, create new feature branch, then when your PR is merged, develop will automatically merge into the main branch for deployment to production.

To run Bloom's backend:

1. Install prerequisites
2. Configure environment variables
3. Install dependencies
4. Run in a Dev Container, with Docker, or manually.
5. Populate the database (required for most fullstack contributions and running integration tests from the frontend)

To test the backend:

- Run unit tests
- Run e2e integration tests from the frontend for fullstack contributions \*requires populating the database with data first

## Prerequisites

- NodeJS v20.x
- Yarn v1.x
- Docker
- PostgreSQL 16

## Configure Environment Variables

See [configure-env.md](configure-env.md) for instructions on configuring environment variables.

## Install dependencies with yarn

```bash
yarn
```

## Run the App Locally

There are 3 methods you can use to run Bloom’s backend locally:

1. **Using Docker (recommended)** - runs postgres in a container.
2. **Visual Studio Code Dev Container (recommended for Visual Studio users)** - installs all dependencies and the postgres database container automatically.
3. **Manually** - manage postgres locally.

### With Docker - Recommended

Bloom's backend is containerized and can be run solely in Docker - both the PostgreSQL database and NestJS app. This uses the least resources on your computer. To run the backend locally, make sure your system has Docker installed - you may need Docker Desktop if using a Mac or Windows.

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

## Unit Testing

To run all unit tests

```bash
yarn test
```

To have your unit tests running in the background as you change code:

```bash
yarn test:watch
```

## Format and Linting

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

# Populate the Database and Database Migrations

Populating your local database with test data is required for running Cypress integration tests and testing Bloom’s full-stack functionality.

See the [database-guide.md](database-guide.md) for instructions.

**Prerequisites:**

- [Postgres 16](https://www.postgresql.org/download/) \*_technically not required if using the Docker method, but recommended._
- Running Bloom’s backend

# Git Flow and Deployment

**The develop branch is our source of truth, not main.**

Create new branches from the `develop` base branch. There is no need to run the build command before pushing changes to GitHub, simply push and create a pull request for the new branch. GitHub Actions will run build and linting tasks automatically. Rebase and merge feature/bug branches into `develop`.

This will trigger an automatic deployment to the staging app by Heroku.

When changes have been tested in staging, merge `develop` into `main`. This will trigger an automatic deployment to the production app by Heroku.

# Swagger

Swagger automatically reflects all of the endpoints in the app, showing their urls and example request and response objects.

To access Swagger simply run the project and visit http://localhost:35001/swagger
