import { Module } from "@nestjs/common";
import { DocumentsController } from "./documents.controller.ts";
import { DocumentsService } from "./documents.service.ts";

@Module({ controllers: [DocumentsController], providers: [DocumentsService] })
export class DocumentsModule {}
