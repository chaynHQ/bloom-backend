#!/usr/bin/env bash

#Backup Remote database
heroku pg:backups:capture --app bloom-backend-staging
heroku pg:backups:download --app bloom-backend-staging

#Load backup into local database
docker exec -i bloom-local-db pg_restore -U postgres -d bloom < latest.dump

rm latest.dump