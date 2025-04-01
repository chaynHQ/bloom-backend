#!/bin/bash

# Navigate to the application's directory
cd /home/site/wwwroot

# Install dependencies (if needed)
yarn install --frozen-lockfile

# Check if yarn install was successful
if [ $? -ne 0 ]; then
  echo "Error: yarn install failed."
  exit 1 # Exit with non-zero code to indicate failure
fi

# Run migrations
yarn typeorm migration:run -- -d ./src/typeorm.config.ts

# Check if migrations were successful
if [ $? -ne 0 ]; then
  echo "Error: TypeORM migrations failed."
  exit 1 # Exit with non-zero code to indicate failure
fi

echo "Migrations completed successfully."
exit 0 # Exit with zero code to indicate success