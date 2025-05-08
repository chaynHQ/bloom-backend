# Bloom Backend Database Guide

## How to Populate the Database

### Prerequisites

- Bloom's backend is running

### Summary

Populating your database with test data is essential for a fully functional development environment, making full-stack contributions, and running Cypress integration tests from the frontend. However, it is not necessary for smaller, isolated contributions.

First, download Bloom's test data dump file. Next, connect to the database server, restore your database with the dump file, then verify with a query.

### Download Test Data Dump File

First, download the test data dump file [linked here from our Google Drive](https://drive.google.com/file/d/1y6KJpAlpozEg3GqhK8JRdmK-s7uzJXtB/view?usp=drive_link). Then place this dump file in the project directory.

### Connect to Server and Add Data

Next, connect to the database server and add test data from the dump file, using the appropriate commands based on how you are running the app - fully containerized, containerized app with local database, or manually without Docker.

1. Restore the database from the dump file by running these pg_restore commands.

   **Fully Containerized App Command:**

   ```
   docker exec -i <container_name> pg_restore -U <username> -d <database_name> --clean --if-exists < /path/to/dumpfile.dump
   ```

   `container_name`, `username`, and `database_name` are defined in the `docker-compose.yml` under the ‘db’ service. Here is the same command with the default values:

   ```
   docker exec -i bloom-local-db pg_restore -U postgres -d bloom --clean --if-exists < /path/to/dumpfile.dump
   ```

   **Docker with Local DB or Running Manually Command:**

   ```
   pg_restore -U postgres -d bloom --clean --if-exists /path/to/dumpfile.dump
   ```

2. Next, start the bloom psql database server.

   **Fully Containerized App Command:**

   ```
   docker exec -it <container_name> psql -U <username> -d <database_name>

   # same command with default values added:
   docker exec -it bloom-local-db psql -U postgres -d bloom
   ```

   **Docker with Local DB or Running Manually Command:**

   ```
   psql -U <username> -h localhost -p 5432 -d <database_name>
   ```

3. Verify the restore by running queries in the psql server.

   ```
   SELECT \* FROM public."user" users WHERE users."email" = 'tech+cypresspublic@chayn.co';
   ```

   If the user exists, your database has successfully been populated with test data!

### Troubleshooting

- Persistent storage is configured in the `docker-compose.yml` file using [named volumes](https://docs.docker.com/engine/storage/volumes/). This maintains your data, even if you delete your container. If you have issues with accessing persistent db storage, try replacing the volume path with an absolute path, or update your firewall settings if using WSL (especially if running integration tests). If issues with volumes persist, remove the named volumes from `docker-compose.yml` and populate your database manually as needed.
- Ensure both the 'db' and 'api' containers are running.
- Hard reset Docker containers `docker-compose up -d --force-recreate`.
- If you remove **`--clean`** from the restore command but encounter duplicate object errors, the existing schema may conflict with the restore. In that case, clean the specific objects manually or use **`DROP SCHEMA public CASCADE`** before restoring.
- Verify that the dump file is valid by running: `pg_restore --list yourfile.dump` If it fails to list contents, the dump file may be corrupted or incomplete. Please notify our team if this happens.
- Verify the tables and columns exist within the psql server with `\dt` , `\dt public.*` , and `\d public."user";`
- Run a **`DROP SCHEMA`** or truncate tables before running **`pg_restore`:**

  ```
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  ```

- To hard reset the database in the psql server, first delete the existing db, then create a new db with the same name, and try the restore on this new db. The db drop may throw an error, if so run the following command first:
  ```
  SELECT pg_terminate_backend(pid) FROM      pg_stat_activity WHERE datname = 'bloom';`
  ```
  Then drop the database using:
  ```
  DROP DATABASE bloom;
  ```
- If the sql dump file is outdated, you can update it by running `docker compose down` then `docker compose up` again as this is configured to run migrations.

### Chayn Staff - Render Directions

Chayn staff with access to Render also have the option to copy/seed the staging database.

Use either method to download a dump of the database:

**Using Render dashboard**

1. Create a backup on the Render dashboard and download it - see https://render.com/docs/postgresql-backups
2. Run the restore command locally (change `local_database_url` and `backup_name`)
   `pg_restore --dbname=$local_database_url --verbose --clean --if-exists --no-owner --no-privileges --format=directory backup_name/bloom-backend-staging`
3. Delete the backup file locally

**Using pg_dump and docker**

Ensure your IP address is whitelisted in Render dashboard before trying to access the Render database directly

1. Run `pg_dump` to create a dump file for the database
   `pg_dump -Fc {RENDER_PG_EXTERNAL_CONNECTION_STRING} > postgres_dump.dump`
2. Run the restore command in docker
   `docker exec -i bloom-local-db pg_restore -U postgres -d bloom < postgres_dump.dump`
3. Run the following command to delete the dump file
   `rm postgres_dump.dump`

## Database Migrations

A migration in TypeORM is a single file with SQL queries to update a database schema as updates/additions are made. Read more about migrations [here](https://github.com/typeorm/typeorm/blob/master/docs/migrations.md).

Migrations are automatically run when the app is built docker (locally) or Render for staging and production apps.

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
