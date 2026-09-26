import { Controller, Get, Res } from '@nestjs/common';
import { collectDefaultMetrics, register } from 'prom-client';
import type { Response } from 'express';
import { Public } from '../../platform/security/security.decorators';
collectDefaultMetrics({ prefix: 'vortex_' });
@Controller('metrics')
export class MetricsController { @Get() @Public() public async metrics(@Res() response: Response): Promise<void> { response.type(register.contentType).send(await register.metrics()); } }
