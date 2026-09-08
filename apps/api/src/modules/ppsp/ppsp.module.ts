import { Module } from "@nestjs/common";
import { PpspController } from "./ppsp.controller.ts";
import { PpspService } from "./ppsp.service.ts";

@Module({ controllers: [PpspController], providers: [PpspService] })
export class PpspModule {}
