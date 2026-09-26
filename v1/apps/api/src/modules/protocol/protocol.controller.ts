import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public, RequireScopes } from '../../platform/security/security.decorators';
import { AppendProtocolEventDto, CreateProtocolDto, DecideProtocolViewDto, PublicSearchDto, RequestProtocolViewDto } from './protocol.dto';
import { ProtocolService } from './protocol.service';

@Controller('api/v1')
export class ProtocolController {
  public constructor(private readonly protocols: ProtocolService) {}

  @Post('protocols')
  @RequireScopes('protocol:write')
  public create(@Req() request: Request, @Body() dto: CreateProtocolDto) {
    return this.protocols.create(request.vortexContext!, dto);
  }

  @Get('protocols/:id')
  @RequireScopes('protocol:read')
  public get(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.protocols.get(request.vortexContext!, id);
  }

  @Post('protocols/:id/events')
  @RequireScopes('protocol:write')
  public appendEvent(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: AppendProtocolEventDto) {
    return this.protocols.appendEvent(request.vortexContext!, id, dto);
  }

  @Get('protocols/:id/timeline')
  @RequireScopes('protocol:read')
  public timeline(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.protocols.timeline(request.vortexContext!, id);
  }

  @Post('protocols/:id/vista')
  @RequireScopes('protocol:view:request')
  public requestView(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: RequestProtocolViewDto) {
    return this.protocols.requestView(request.vortexContext!, id, dto);
  }

  @Post('protocols/views/:viewId/decision')
  @RequireScopes('protocol:view:decide')
  public decideView(@Req() request: Request, @Param('viewId', new ParseUUIDPipe()) viewId: string, @Body() dto: DecideProtocolViewDto) {
    return this.protocols.decideView(request.vortexContext!, viewId, dto);
  }

  @Public()
  @Get('public/search')
  public publicSearch(@Query() query: PublicSearchDto) {
    return this.protocols.publicSearch(query.q);
  }
}
