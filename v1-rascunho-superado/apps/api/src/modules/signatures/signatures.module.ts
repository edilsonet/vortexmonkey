import { Module } from "@nestjs/common";
import { SignaturesController } from "./signatures.controller.ts";
import { SignaturesService } from "./signatures.service.ts";

@Module({ controllers: [SignaturesController], providers: [SignaturesService] })
export class SignaturesModule {}
