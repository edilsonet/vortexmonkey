import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequireRoles, RequireScopes } from '../../platform/security/security.decorators';
import { AppendLedgerDto } from './ledger.dto';
import { LedgerService } from './ledger.service';

@Controller('api/v1/ledger')
export class LedgerController {
  public constructor(private readonly ledger: LedgerService) {}

  @Post('append')
  @RequireRoles('SYSTEM')
  @RequireScopes('ledger:append')
  public append(@Req() request: Request, @Body() dto: AppendLedgerDto) {
    return this.ledger.appendInternal(request.vortexContext!, dto);
  }

  @Get('verify')
  @RequireScopes('ledger:read')
  public verify(@Req() request: Request) {
    return this.ledger.verifyChain(request.vortexContext!);
  }

  @Get('export/merkle')
  @RequireScopes('ledger:export')
  public exportMerkle(@Req() request: Request) {
    return this.ledger.exportMerkleProof(request.vortexContext!);
  }

  @Get(':entityId/diff')
  @RequireScopes('ledger:read')
  public diff(@Req() request: Request, @Param('entityId', new ParseUUIDPipe()) entityId: string) {
    return this.ledger.getDiff(request.vortexContext!, entityId);
  }

  @Get(':entityId')
  @RequireScopes('ledger:read')
  public entity(@Req() request: Request, @Param('entityId', new ParseUUIDPipe()) entityId: string) {
    return this.ledger.getEntity(request.vortexContext!, entityId);
  }
}
