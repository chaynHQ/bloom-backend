# Bloom Backend Database Guide

## How to Populate the Database

**Prerequisites:**

- Bloom's backend must be running

### Summary

Most open-source contributions (like running Cypress integration tests from the frontend) require adding test data to your local database. To do this, download Bloom's test data dump file, connect to the database server, then populate the database with the backup data.

### Download Test Data Dump File

First, download the test data dump file [linked here from our Google Drive](https://drive.google.com/file/d/1y6KJpAlpozEg3GqhK8JRdmK-s7uzJXtB/view?usp=drive_link). Then place this dump file in the project directory.

### Connect to Server and Add Data

Use the Docker directions if you are running the app in Docker. The data will persist on your computer using the path specified for the database volume in `docker-compose.yml`. For manually hosting Postgres on your machine, use the Postgres directions.

#### Docker Directions:

Run to restore the database from the dump file using pg_restore:

```
docker exec -i <container_name> pg_restore -U <username> -d <database_name> --clean --if-exists < /path/to/dumpfile.dump
```

`container_name`, `username`, and `database_name` are defined in the `docker-compose.yml` file under ‘db’.

Start the bloom psql database server in Docker:

```
docker exec -it <container_name> psql -U <username> -d <database_name>
```

This will open the psql server for bloom, where you can run queries to verify the restore.

#### Postgres Directions:

Ensure your postgres server is running with a configured database called "bloom" (we recommend naming your username "postgres" but not required).

Run to restore the database from the dump file with pg_restore:

```bash
pg_restore -U <username> -d <database_name> --clean --if-exists < /path/to/dumpfile.dump
```

Start the bloom database server:

```bash
psql -U <username> -d <database_name>
```

### Verify Data

With the psql server running, verify the restore by with a SQL query to test if one of our test user's data has been properly populated into the database:

```
SELECT * FROM public."user" users WHERE users."email" = 'tech+cypresspublic@chayn.co';
```

If the user exists, the database has successfully been seeded!

### Troubleshooting

- If you remove **`--clean`** from the restore command but encounter duplicate object errors, the existing schema may conflict with the restore. In that case, clean the specific objects manually or use **`DROP SCHEMA public CASCADE`** before restoring.
- Verify that the dump file is valid by running: `pg_restore --list yourfile.dump` If it fails to list contents, the dump file may be corrupted or incomplete.
- In the psql server, verify the tables and columns exist with `\dt` , `\dt public.*` , and `\d public."user";`
- Run a **`DROP SCHEMA`** or truncate tables before running **`pg_restore`:**
  ```
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  ```
- Try the following: delete the existing db, create a new db with the same name, and try the restore on this new db. The db drop may throw an error, if so run the following command first.

  `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'bloom';`

  Then drop the database using:

  `DROP DATABASE bloom;`

- If the sql dump file is outdated, you can update it by running `docker compose down` then `docker compose up` again as this is configured to run migrations.

### Chayn Staff - Heroku Directions

Chayn staff with access to Heroku, you also have the option to seed the database via the following script. Before you start, make sure:

1. bloom-local-db container is running in Docker
2. you are logged into the Heroku via your terminal. Read more about the Heroku Cli [here](https://devcenter.heroku.com/articles/heroku-cli)
3. Replace <HEROKU_APP_NAME> with the correct Heroku app name in the `seed-local-db.sh file`
4. Run `chmod +x ./seed-local-db.sh` in your terminal to make the file executable

   After the above has been confirmed, run

   ```bash
   bash seed-local-db.sh
   ```

## Database Migrations

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

https://drive.google.com/file/d/1y6KJpAlpozEg3GqhK8JRdmK-s7uzJXtB/view?usp=sharing
