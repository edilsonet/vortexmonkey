import { Module } from "@nestjs/common";
import { ComplianceController } from "./compliance.controller.ts";
import { ComplianceService } from "./compliance.service.ts";

@Module({ controllers: [ComplianceController], providers: [ComplianceService] })
export class ComplianceModule {}
