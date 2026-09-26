import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { ProtocolRecord, RequestContext } from '@vortex/shared-dto';
import { ContextGuard } from '../http/context.guard';
import { VortexContext } from '../http/request-context.decorator';
import { ProtocolService } from './protocol.service';

@Controller('protocols')
export class ProtocolController {
  public constructor(private readonly protocol: ProtocolService) {}

  @Get(':protocolNumber')
  @UseGuards(ContextGuard)
  public find(
    @VortexContext() context: RequestContext,
    @Param('protocolNumber') protocolNumber: string,
  ): Promise<ProtocolRecord> {
    return this.protocol.find(context, protocolNumber);
  }
}
