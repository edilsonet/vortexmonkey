import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller.ts";
import { BillingService } from "./billing.service.ts";

@Module({ controllers: [BillingController], providers: [BillingService], exports: [BillingService] })
export class BillingModule {}
