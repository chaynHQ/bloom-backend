# Bloom Backend

The purpose of this app is to allow users register and use a free, web-based support service run by Chayn. The app is Designed for anyone who has experienced or is currently experiencing domestic or sexual abuse, all courses are packed with tailored information, guidance, everyday tools, and comforting words to cope with traumatic events.

## Technologies Used:

- Nest Js - Nest is a NodeJs framework used in building scalable and reliable server-side applications.
- PostgreSQL - open source object-relational database system
- TypeORM is an Object Relational Mapper library running in NodeJs and written in TypeScript.
- Docker - open source containerization platform.
- Heroku - Heroku is a platform as a service (PaaS) that enables developers to build, run, and operate applications entirely in the cloud.
- GitHub Actions - GitHub Actions makes it easy to automate all your software workflows, now with world-class CI/CD.
- Swagger - API documentation
- Firebase - User Authentication

## Setting up your local environment

- Install `nvm` on your machine
- Run `nvm install` followed by `nvm use` on the root of the workspace
- Run `yarn`

## Adding environmental variables

Use the `.env` file located in your application and append the environmental variable that you wish to use.
Look at `.env.example` for reference.

## Starting the app (without Docker)

To run the project without Docker, you'll need to make sure PostgreSQL is installed and running on your system. The `.env` variables may need to be updated to the credentials used on your local system. To install [PostgreSQL](https://www.PostgreSQLql.org/download/) on your machine

Follow these steps the first ever time youre running this project on your machine:

- Create a database in your local database and name it `bloom`.
  (You can use this SQL statement: `CREATE DATABASE bloom WITH OWNER = postgres ENCODING = 'UTF8' CONNECTION LIMIT = -1;`)
- Run `cat ./bloom_db_local.sql | docker exec -i bloom-local-db pg_restore --verbose --clean --no-acl --no-owner -U postgres -d bloom`

Follow these steps to run the project:

- Run `yarn start:dev`
- You should see this in the shell output:
  ```shell
  Listening on localhost:35001, CTRL+C to stop
  ```

## Starting the app (with Docker) - RECOMMENDED

The project is containerized and can be run solely in docker - both the PostgreSQL database and NestJs app. To use Docker, make sure it is already installed and running on your machine. For more information on how to install [docker](https://www.docker.com/get-started)

- Run `docker-compose up`
- You should see this in the shell output in docker:
  `shell Listening on localhost:35001, CTRL+C to stop `
  _To populate the database run the command below in a new terminal_
- Run `cat ./bloom_db_local.sql | docker exec -i bloom-local-db pg_restore --verbose --clean --no-acl --no-owner -U postgres -d bloom`

_Note: you can use an application like Postman to test the apis locally_

## Swagger

Swagger automatically reflects all the endpoints that have been created. It also gives details of an api's url and exposes a JSON object needed to make a request and also what an api's response looks like.

To access Swagger simply run the project and visit:

```shell
http://localhost:35001/api/
```

## Firebase

Authentication is an essential part of any application, but can be quite stressful to set up from scratch. This is one problem Firebase solves with its authentication product. To learn more about [Firebase](https://firebase.google.com/)

## TypeOrm Migrations

A migration in TypeORM is a single file with SQL queries to update a database schema as needed. To get started with migrations:

1. Generate Migration

- `yarn migration:generate -- bloom_backend` - This command generates sql queries.

2. Run Migration

- `yarn migration:run` - This command updates the database schema

3. Revert Migration

- `yarn migration:revert` - Reverting a migration runs the down method in the migration file. This is useful in case we made a schema change we no longer want.

## Deployment

There is no need to run the build command when pushing changes to GitHub. Simply create a pull request (PR) for the feature/bug fix you're working on and the GitHub Actions implemented will handle building the application and Heroku will handle to deployment of the changes automatically. The automatic deployment is set to work with the Staging and Production environment respectively. _Note: There are rules set for each branch. You wont be able to merge your changes without your PR being reveiwed_

`If for any reason a new environment variable is created please reach out to Anna Hughes to add the variable to the staging and production environment as needed.`

## Slack

Slack is a workplace communication tool. Slack is being used to notify the team when an unknown email is used to try and register an account on the bloom platform

## Stay in touch

- Website - [Chayn](https://www.chayn.co/)
- Twitter - [@ChaynHQ](https://twitter.com/ChaynHQ)
- Instagram - [@chaynhq](https://www.instagram.com/chaynhq/)
- Youtube - [Chayn Team](https://www.youtube.com/channel/UC5_1Ci2SWVjmbeH8_USm-Bg)

## License

Nest is [MIT licensed](LICENSE).
