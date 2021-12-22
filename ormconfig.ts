import { isProduction } from './src/utils/constants';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import * as PostgressConnectionStringParser from 'pg-connection-string';
import dotenv from 'dotenv';
dotenv.config();

const databaseUrl: string = process.env.DATABASE_URL;
const { host, port, user, password, database } = PostgressConnectionStringParser.parse(databaseUrl);

const config: PostgresConnectionOptions = {
  type: 'postgres',
  host,
  port: Number(port),
  username: user,
  password,
  database,
  entities: ['dist/src/**/*.entity.js'],
  synchronize: !isProduction,
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
