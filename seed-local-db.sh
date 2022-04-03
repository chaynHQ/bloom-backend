#!/usr/bin/env bash

#Create Time Stamp
DATE=`date "+%Y%m%d"`

TIMESTAMP=`date "+%Y%m%d-%H%M%S"`

set -e

#Backup Remote database
curl `heroku pg:backups public-url --app <HEROKU_APP_NAME>` > bloom_$TIMESTAMP.dump

#Load backup into local database
docker exec -i bloom-local-db pg_restore -U postgres -d bloom < bloom_$TIMESTAMP.dump