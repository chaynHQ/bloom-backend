import * as PostgressConnectionStringParser from 'pg-connection-string';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { databaseUrl, isProduction } from './src/utils/constants';

const { host, port, user, password, database } = PostgressConnectionStringParser.parse(databaseUrl);

/**
 * Notes on connection options:
 * synchronize: this setting will update the database automatically without running migrations. Turn on with caution.
 * migrationsRun: this setting ensures migrations are run on the db at startup. Turn off with caution.
 *  */
const config: PostgresConnectionOptions = {
  type: 'postgres',
  host,
  port: Number(port),
  username: user,
  password,
  database,
  entities: ['dist/src/**/*.entity.js'],
  synchronize: false,
  migrationsRun: true,
  migrations: ['dist/src/migrations/*.js'],
  cli: {
    migrationsDir: 'src/migrations',
  },
  ssl: isProduction,
  extra: {
    ssl: isProduction ? { rejectUnauthorized: false } : null,
  },
};

export default config;
