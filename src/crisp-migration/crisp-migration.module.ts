import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { PartnerAccessEntity } from 'src/entities/partner-access.entity';
import { PartnerEntity } from 'src/entities/partner.entity';
import { UserEntity } from 'src/entities/user.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { UserService } from 'src/user/user.service';
import { CrispExportService } from './crisp-export.service';
import { CrispMigrationController } from './crisp-migration.controller';
import { CrispMigrationService } from './crisp-migration.service';
import { FrontImportService } from './front-import.service';

@Module({
  imports: [
    AuthModule,
    FirebaseModule,
    TypeOrmModule.forFeature([UserEntity, PartnerAccessEntity, PartnerEntity]),
  ],
  providers: [CrispExportService, FrontImportService, CrispMigrationService, UserService],
  controllers: [CrispMigrationController],
})
export class CrispMigrationModule {}
