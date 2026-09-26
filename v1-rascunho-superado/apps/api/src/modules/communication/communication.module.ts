import { Global, Module } from "@nestjs/common";
import { CommunicationController } from "./communication.controller.ts";
import { CommunicationService } from "./communication.service.ts";

@Global()
@Module({
  controllers: [CommunicationController],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
