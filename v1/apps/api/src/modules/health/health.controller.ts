import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../../platform/database/database.service';
import { RedisService } from '../../platform/redis/redis.service';
import { Public } from '../../platform/security/security.decorators';
@Controller('health')
export class HealthController {
  public constructor(private readonly database: DatabaseService, private readonly redis: RedisService) {}
  @Get() @Public() public async health(): Promise<{ status: 'ok'; dependencies: { postgres: 'ok'; redis: 'ok' } }> {
    await this.database.query('SELECT 1');
    await this.redis.ping();
    return { status: 'ok', dependencies: { postgres: 'ok', redis: 'ok' } };
  }
}
