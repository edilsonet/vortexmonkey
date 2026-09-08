import { Module } from "@nestjs/common";
import { IdentityController } from "./identity.controller.ts";
import { IdentityService } from "./identity.service.ts";

@Module({ controllers: [IdentityController], providers: [IdentityService] })
export class IdentityModule {}
