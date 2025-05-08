# Local Development Guide

## Summary

To run Bloom's backend:

1. Install prerequisites
2. Configure environment variables
3. Install dependencies
4. Run the app using Docker, Dev Containers, or Manually
5. Populate the database

To test the backend:

- Run unit tests
- Run e2e integration tests from the frontend for full-stack contributions

## Prerequisites

- NodeJS v22.x
- Yarn v1.x
- Docker and / or PostgreSQL

_Recommended Minimum System Requirements: CPU: Quad-core 2.5 GHz (i5/Ryzen 5), Memory: 16 GB RAM, Storage: 512 GB, OS: Linux, macOS, Windows, or WSL2 (latest versions), Internet Connection: For accessing dependencies and external APIs/services._

## Configure Environment Variables

See [configure-env.md](configure-env.md) for instructions on configuring environment variables.

## Install dependencies with yarn

```bash
yarn
```

## Run the App Locally

There are 3 methods you can use to run Bloom’s backend locally:

1. **Using Docker (recommended)** - the backend app is fully containerized, installing PostgreSQL is optional.
2. **Visual Studio Code Dev Container (recommended for Visual Code users)** - installs all dependencies and the PostgreSQL database container automatically.
3. **Manually (recommended for PostgreSQL users)** - run the app with yarn and manage PostgreSQL locally.

### Run with Docker - Recommended

Prequisites: Docker (we recommend [Docker Desktop](https://docs.docker.com/desktop/)), PostgreSQL (optional).

Bloom's backend is fully containerized - both PostgreSQL and NestJS app. This does not require PostgreSQL to be installed locally. To connect to a local PostgreSQL database instead, modify the `DATABASE_URL` in the `docker-compose.yml` file. This will enable communications between Docker and your local database.

To start the Docker container run:

```bash
docker-compose up
```

You should see this in the shell output:

```shell
Listening on localhost:35001, CTRL+C to stop
```

### Run with Dev Container - Recommended for Visual Studio Users

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

### Run Manually - Recommended for PostgreSQL Users

Prerequisites: PostgreSQL

Log into PostgreSQL and create a database called "bloom". Ensure it is running on port `35000` (or your desired port). Finally, start the PostgreSQL server on your machine.

With the psql server running, start the app:

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

# Git Flow and Deployment

**The develop branch is our source of truth, not main.** Fork from `develop`, create new feature branch, then when your PR is merged, `develop` will automatically merge into the main branch for deployment to production. Keep your branch updated by rebasing and merging feature/bug branches into `develop` as you code.

Once your PR is merged to `develop`, this will trigger an automatic deployment to the staging app by Render.

When changes have been tested in staging, merge `develop` into `main`. This will trigger an automatic deployment to the production app by Render.

# APIs

Swagger automatically reflects all of the endpoints in the app, showing their urls and example request and response objects.

To access Swagger simply run the project and visit http://localhost:35001/swagger

For testing APIs, we recommend using tools like Postman.
