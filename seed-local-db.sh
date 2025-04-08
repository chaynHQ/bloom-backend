#!/usr/bin/env bash

# First manually get a dump of the staging database by either
# 1. Using the Render dashboard to create a backup and download it - see https://render.com/docs/postgresql-backups
# 2. Using the command line to create a backup
#    - Ensure your IP is whitelisted to access the Render database
#    - Use the following command to create a backup and download it
#    - pg_dump -Fd -j 2 -U user -h host -p port -d password -f postgres_dump
#    - This will create a directory called postgres_dump with the backup files

# Load backup into local database via docker
# Ensure you have Docker running and the bloom-local-db container is up
# Ensure you have the postgres_dump directory in the same location as this script
docker exec -i bloom-local-db pg_restore -U postgres -d bloom < postgres_dump.dump

rm postgres_dump.dump