import { Global, Module } from '@nestjs/common';
import { RegulatoryParameterService } from './regulatory-parameter.service';
@Global() @Module({ providers: [RegulatoryParameterService], exports: [RegulatoryParameterService] })
export class RegulatoryModule {}
