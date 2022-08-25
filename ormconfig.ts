import * as PostgressConnectionStringParser from 'pg-connection-string';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { databaseUrl, isProduction } from './src/utils/constants';

const { host, port, user, password, database } = PostgressConnectionStringParser.parse(databaseUrl);

const config: PostgresConnectionOptions = {
  type: 'postgres',
  host,
  port: Number(port),
  username: user,
  password,
  database,
  entities: ['dist/src/**/*.entity.js'],
  synchronize: false,
  migrationsRun: isProduction,
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
