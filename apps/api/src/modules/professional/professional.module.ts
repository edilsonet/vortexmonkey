import { Module } from "@nestjs/common";
import { ProfessionalController } from "./professional.controller.ts";
import { ProfessionalService } from "./professional.service.ts";

@Module({ controllers: [ProfessionalController], providers: [ProfessionalService] })
export class ProfessionalModule {}
