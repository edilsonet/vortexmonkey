import { Module } from "@nestjs/common";
import { TrainingController } from "./training.controller.ts";
import { TrainingService } from "./training.service.ts";

@Module({ controllers: [TrainingController], providers: [TrainingService] })
export class TrainingModule {}
