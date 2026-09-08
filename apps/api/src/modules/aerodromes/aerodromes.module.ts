import { Module } from "@nestjs/common";
import { AerodromesController } from "./aerodromes.controller.ts";
import { AerodromesService } from "./aerodromes.service.ts";

@Module({ controllers: [AerodromesController], providers: [AerodromesService] })
export class AerodromesModule {}
