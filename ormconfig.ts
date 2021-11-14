import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const config: PostgresConnectionOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  entities: ['dist/src/**/*.entity.js'],
  synchronize: false,
  migrationsRun: true,
  migrations: ['dist/src/migrations/*.js'],
  cli: {
    migrationsDir: 'src/migrations',
  },
};

export default config;
