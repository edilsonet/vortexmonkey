import { Module } from "@nestjs/common";
import { RecruitmentController } from "./recruitment.controller.ts";
import { RecruitmentService } from "./recruitment.service.ts";
import { BillingModule } from "../billing/billing.module.ts";

@Module({
  imports: [BillingModule],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
})
export class RecruitmentModule {}
