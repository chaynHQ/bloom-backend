const dbConfig = {
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV !== 'production',
};

switch (process.env.NODE_ENV) {
  case 'test':
    break;
  case 'development':
    Object.assign(dbConfig, {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      migrationsRun: true,
      entities: [],
      ssl: {
        rejectUnauthorized: false,
      },
    });
  case 'production':
    break;
  default:
    throw new Error('Unknown environment');
}

module.exports = dbConfig;
