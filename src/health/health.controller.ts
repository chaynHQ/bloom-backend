import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { frontendAppUrl } from 'src/utils/constants';

@Controller('ping')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  ping() {
    return 'ok';
  }

  @Get('/frontend')
  @HealthCheck()
  checkFrontend() {
    return this.health.check([() => this.http.pingCheck('frontend', frontendAppUrl)]);
  }

  @Get('/database')
  @HealthCheck()
  checkDatabase() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
