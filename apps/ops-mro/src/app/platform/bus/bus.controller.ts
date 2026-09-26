import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { OutboxRedriveResponse, RequestContext } from '@vortex/shared-dto';
import { VortexContext } from '../http/request-context.decorator';
import { WriteRoute } from '../http/write-route.decorator';
import { OutboxRedriveDto } from './bus.dto';
import { OutboxRedriveService } from './outbox-redrive.service';

/**
 * Operacao do bus. O re-drive e uma escrita administrativa: exige contexto,
 * `Idempotency-Key` (regra 6) e papel de administracao no tenant (verificado no
 * banco por `identity.can_administer`). O escopo e sempre o tenant do contexto.
 */
@Controller('bus')
export class BusController {
  public constructor(private readonly redrive: OutboxRedriveService) {}

  @Post('redrive')
  @HttpCode(201)
  @WriteRoute()
  public redriveAbandoned(
    @VortexContext() context: RequestContext,
    @Body() body: OutboxRedriveDto,
  ): Promise<OutboxRedriveResponse> {
    return this.redrive.redrive(context, body);
  }
}
