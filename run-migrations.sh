#!/bin/bash

# Navigate to the application's directory
cd /home/site/wwwroot

# Install dependencies (if needed)
yarn install --frozen-lockfile

# Run migrations
yarn typeorm migration:run -- -d ./src/typeorm.config.ts
