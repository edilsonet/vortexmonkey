import { Module } from "@nestjs/common";
import { MroController } from "./mro.controller.ts";
import { MroService } from "./mro.service.ts";

@Module({ controllers: [MroController], providers: [MroService] })
export class MroModule {}
