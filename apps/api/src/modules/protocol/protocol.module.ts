import { Global, Module } from "@nestjs/common";
import { ProtocolService } from "./protocol.service.ts";
import { ProtocolController } from "./protocol.controller.ts";

@Global()
@Module({ controllers: [ProtocolController], providers: [ProtocolService], exports: [ProtocolService] })
export class ProtocolModule {}
