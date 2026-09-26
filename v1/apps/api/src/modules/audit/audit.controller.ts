import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequireScopes } from '../../platform/security/security.decorators';
import { AuditQueryDto } from './audit.dto';
import { AuditService } from './audit.service';

@Controller('api/v1/audit')
export class AuditController {
  public constructor(private readonly audit: AuditService) {}

  @Get()
  @RequireScopes('audit:read')
  public search(@Req() request: Request, @Query() query: AuditQueryDto) {
    return this.audit.search(request.vortexContext!, query);
  }
}
