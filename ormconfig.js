const dbConfig = {};

const isProduction = process.env.NODE_ENV === 'production';

switch (process.env.NODE_ENV) {
  case 'test':
  case 'development':
  case 'staging':
  case 'production':
    Object.assign(dbConfig, {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      migrationsRun: !isProduction,
      entities: [],
      ssl: {
        rejectUnauthorized: isProduction,
      },
      autoLoadEntities: true,
      synchronize: !isProduction,
    });
    break;
  default:
    throw new Error('Unknown environment');
}

module.exports = dbConfig;
