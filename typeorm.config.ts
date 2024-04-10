import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import * as PostgressConnectionStringParser from 'pg-connection-string';
import { DataSource } from 'typeorm';
import { CoursePartnerEntity } from './src/entities/course-partner.entity';
import { CourseUserEntity } from './src/entities/course-user.entity';
import { CourseEntity } from './src/entities/course.entity';
import { EmailCampaignEntity } from './src/entities/email-campaign.entity';
import { EventLogEntity } from './src/entities/event-log.entity';
import { FeatureEntity } from './src/entities/feature.entity';
import { PartnerAccessEntity } from './src/entities/partner-access.entity';
import { PartnerAdminEntity } from './src/entities/partner-admin.entity';
import { PartnerFeatureEntity } from './src/entities/partner-feature.entity';
import { PartnerEntity } from './src/entities/partner.entity';
import { SessionUserEntity } from './src/entities/session-user.entity';
import { SessionEntity } from './src/entities/session.entity';
import { SubscriptionUserEntity } from './src/entities/subscription-user.entity';
import { SubscriptionEntity } from './src/entities/subscription.entity';
import { TherapySessionEntity } from './src/entities/therapy-session.entity';
import { UserEntity } from './src/entities/user.entity';
import { bloomBackend1637704119795 } from './src/migrations/1637704119795-bloom_backend';
import { bloomBackend1638992987868 } from './src/migrations/1638992987868-bloom_backend';
import { bloomBackend1644933107950 } from './src/migrations/1644933107950-bloom_backend';
import { bloomBackend1645100450680 } from './src/migrations/1645100450680-bloom_backend';
import { bloomBackend1646754911855 } from './src/migrations/1646754911855-bloom_backend';
import { bloomBackend1648079117646 } from './src/migrations/1648079117646-bloom-backend';
import { bloomBackend1649105977788 } from './src/migrations/1649105977788-bloom_backend';
import { bloomBackend1654446770100 } from './src/migrations/1654446770100-bloom-backend';
import { bloomBackend1658221497716 } from './src/migrations/1658221497716-bloom-backend';
import { bloomBackend1661449620908 } from './src/migrations/1661449620908-bloom_backend';
import { bloomBackend1661973464713 } from './src/migrations/1661973464713-bloom-backend';
import { bloomBackend1669898747823 } from './src/migrations/1669898747823-bloom-backend';
import { bloomBackend1673517093891 } from './src/migrations/1673517093891-bloom-backend';
import { bloomBackend1674468906787 } from './src/migrations/1674468906787-bloom-backend';
import { bloomBackend1674574860578 } from './src/migrations/1674574860578-bloom-backend';
import { bloomBackend1674744864331 } from './src/migrations/1674744864331-bloom-backend';
import { bloomBackend1675270454467 } from './src/migrations/1675270454467-bloom-backend';
import { bloomBackend1675329251106 } from './src/migrations/1675329251106-bloom-backend';
import { bloomBackend1675351569206 } from './src/migrations/1675351569206-bloom-backend';
import { bloomBackend1676543630092 } from './src/migrations/1676543630092-bloom-backend';
import { bloomBackend1680797056762 } from './src/migrations/1680797056762-bloom-backend';
import { bloomBackend1686155897161 } from './src/migrations/1686155897161-bloom-backend';
import { bloomBackend1695059293020 } from './src/migrations/1695059293020-bloom-backend';
import { bloomBackend1696994943309 } from './src/migrations/1696994943309-bloom-backend';
import { bloomBackend1697818259254 } from './src/migrations/1697818259254-bloom-backend';
import { bloomBackend1698136145516 } from './src/migrations/1698136145516-bloom-backend';
import { bloomBackend1706174260018 } from './src/migrations/1706174260018-bloom-backend';

config();
const configService = new ConfigService();

const isProduction = configService.get('NODE_ENV') === 'production';
const { host, port, user, password, database } = PostgressConnectionStringParser.parse(
  configService.get('DATABASE_URL'),
);

/**
 * Notes on connection options:
 * synchronize: this setting will update the database automatically without running migrations. Turn on with caution.
 * migrationsRun: this setting ensures migrations are run on the db at startup. Turn off with caution.
 *  */

const dataSource = new DataSource({
  type: 'postgres',
  host,
  port: Number(port),
  username: user,
  password,
  database,
  synchronize: !isProduction,
  migrationsRun: true,
  logging: true,
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
    EmailCampaignEntity,
    EventLogEntity,
    SessionEntity,
    SessionUserEntity,
    SubscriptionEntity,
    SubscriptionUserEntity,
    TherapySessionEntity,
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
  ],
  subscribers: [],
  ssl: isProduction,
  extra: {
    ssl: isProduction ? { rejectUnauthorized: false } : null,
  },
});

export default dataSource;
