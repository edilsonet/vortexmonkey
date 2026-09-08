import { Module } from "@nestjs/common";
import { OperatorsController } from "./operators.controller.ts";
import { OperatorsService } from "./operators.service.ts";

@Module({ controllers: [OperatorsController], providers: [OperatorsService] })
export class OperatorsModule {}
