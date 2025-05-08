import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import * as PostgressConnectionStringParser from 'pg-connection-string';
import { DataSource, DataSourceOptions } from 'typeorm';
import { CoursePartnerEntity } from './entities/course-partner.entity';
import { CourseUserEntity } from './entities/course-user.entity';
import { CourseEntity } from './entities/course.entity';
import { EventLogEntity } from './entities/event-log.entity';
import { FeatureEntity } from './entities/feature.entity';
import { PartnerAccessEntity } from './entities/partner-access.entity';
import { PartnerAdminEntity } from './entities/partner-admin.entity';
import { PartnerFeatureEntity } from './entities/partner-feature.entity';
import { PartnerEntity } from './entities/partner.entity';
import { ResourceFeedbackEntity } from './entities/resource-feedback.entity';
import { ResourceUserEntity } from './entities/resource-user.entity';
import { ResourceEntity } from './entities/resource.entity';
import { SessionFeedbackEntity } from './entities/session-feedback.entity';
import { SessionUserEntity } from './entities/session-user.entity';
import { SessionEntity } from './entities/session.entity';
import { SubscriptionUserEntity } from './entities/subscription-user.entity';
import { SubscriptionEntity } from './entities/subscription.entity';
import { TherapySessionEntity } from './entities/therapy-session.entity';
import { UserEntity } from './entities/user.entity';
import { bloomBackend1637704119795 } from './migrations/1637704119795-bloom_backend';
import { bloomBackend1638992987868 } from './migrations/1638992987868-bloom_backend';
import { bloomBackend1644933107950 } from './migrations/1644933107950-bloom_backend';
import { bloomBackend1645100450680 } from './migrations/1645100450680-bloom_backend';
import { bloomBackend1646754911855 } from './migrations/1646754911855-bloom_backend';
import { bloomBackend1648079117646 } from './migrations/1648079117646-bloom-backend';
import { bloomBackend1649105977788 } from './migrations/1649105977788-bloom_backend';
import { bloomBackend1654446770100 } from './migrations/1654446770100-bloom-backend';
import { bloomBackend1658221497716 } from './migrations/1658221497716-bloom-backend';
import { bloomBackend1661449620908 } from './migrations/1661449620908-bloom_backend';
import { bloomBackend1661973464713 } from './migrations/1661973464713-bloom-backend';
import { bloomBackend1669898747823 } from './migrations/1669898747823-bloom-backend';
import { bloomBackend1673517093891 } from './migrations/1673517093891-bloom-backend';
import { bloomBackend1674468906787 } from './migrations/1674468906787-bloom-backend';
import { bloomBackend1674574860578 } from './migrations/1674574860578-bloom-backend';
import { bloomBackend1674744864331 } from './migrations/1674744864331-bloom-backend';
import { bloomBackend1675270454467 } from './migrations/1675270454467-bloom-backend';
import { bloomBackend1675329251106 } from './migrations/1675329251106-bloom-backend';
import { bloomBackend1675351569206 } from './migrations/1675351569206-bloom-backend';
import { bloomBackend1676543630092 } from './migrations/1676543630092-bloom-backend';
import { bloomBackend1680797056762 } from './migrations/1680797056762-bloom-backend';
import { bloomBackend1686155897161 } from './migrations/1686155897161-bloom-backend';
import { bloomBackend1695059293020 } from './migrations/1695059293020-bloom-backend';
import { bloomBackend1696994943309 } from './migrations/1696994943309-bloom-backend';
import { bloomBackend1697818259254 } from './migrations/1697818259254-bloom-backend';
import { bloomBackend1698136145516 } from './migrations/1698136145516-bloom-backend';
import { bloomBackend1706174260018 } from './migrations/1706174260018-bloom-backend';
import { BloomBackend1718300621138 } from './migrations/1718300621138-bloom-backend';
import { BloomBackend1718728423454 } from './migrations/1718728423454-bloom-backend';
import { BloomBackend1719668310816 } from './migrations/1719668310816-bloom-backend';
import { BloomBackend1722295564731 } from './migrations/1722295564731-bloom-backend';
import { BloomBackend1733160378757 } from './migrations/1733160378757-bloom-backend';
import { BloomBackend1733850090811 } from './migrations/1733850090811-bloom-backend';
import { BloomBackend1743510885507 } from './migrations/1743510885507-bloom-backend';
import { BloomBackend1744450013565 } from './migrations/1744450013565-bloom-backend';

config();
const configService = new ConfigService();

const isProduction = configService.get('NODE_ENV') === 'production';
const isStaging = configService.get('NODE_ENV') === 'staging';

const { host, port, user, password, database } = PostgressConnectionStringParser.parse(
  configService.get('DATABASE_URL'),
);

export const dataSourceOptions = {
  type: 'postgres',
  host,
  port: Number(port),
  username: user,
  password,
  database,
  synchronize: false, // updates the database automatically without running migrations - turn on with caution
  migrationsRun: true, // ensures migrations are run on the db at startup - turn off with caution
  logging: !isProduction,
  entities: [
    UserEntity,
    PartnerEntity,
    PartnerAdminEntity,
    PartnerAccessEntity,
    PartnerFeatureEntity,
    CourseEntity,
    CourseUserEntity,
    CoursePartnerEntity,
    FeatureEntity,
    EventLogEntity,
    SessionEntity,
    SessionUserEntity,
    SubscriptionEntity,
    SubscriptionUserEntity,
    TherapySessionEntity,
    SessionFeedbackEntity,
    ResourceUserEntity,
    ResourceEntity,
    ResourceFeedbackEntity,
  ],
  migrations: [
    bloomBackend1637704119795,
    bloomBackend1638992987868,
    bloomBackend1644933107950,
    bloomBackend1645100450680,
    bloomBackend1646754911855,
    bloomBackend1648079117646,
    bloomBackend1649105977788,
    bloomBackend1654446770100,
    bloomBackend1658221497716,
    bloomBackend1661449620908,
    bloomBackend1661973464713,
    bloomBackend1669898747823,
    bloomBackend1673517093891,
    bloomBackend1674468906787,
    bloomBackend1674574860578,
    bloomBackend1674744864331,
    bloomBackend1675270454467,
    bloomBackend1675329251106,
    bloomBackend1675351569206,
    bloomBackend1676543630092,
    bloomBackend1680797056762,
    bloomBackend1686155897161,
    bloomBackend1695059293020,
    bloomBackend1696994943309,
    bloomBackend1697818259254,
    bloomBackend1698136145516,
    bloomBackend1706174260018,
    BloomBackend1718300621138,
    BloomBackend1718728423454,
    BloomBackend1719668310816,
    BloomBackend1722295564731,
    BloomBackend1733160378757,
    BloomBackend1733850090811,
    BloomBackend1743510885507,
    BloomBackend1744450013565
  ],
  subscribers: [],
  ssl: isProduction || isStaging,
  extra: {
    ssl: isProduction || isStaging ? { rejectUnauthorized: false } : null,
  },
};

const dataSource = new DataSource(dataSourceOptions as DataSourceOptions);

export default dataSource;
