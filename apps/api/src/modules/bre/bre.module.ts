import { Module } from "@nestjs/common";
import { BreController } from "./bre.controller.ts";
import { BreService } from "./bre.service.ts";

@Module({ controllers: [BreController], providers: [BreService] })
export class BreModule {}
