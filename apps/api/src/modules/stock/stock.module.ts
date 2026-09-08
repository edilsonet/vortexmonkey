import { Module } from "@nestjs/common";
import { StockController } from "./stock.controller.ts";
import { StockService } from "./stock.service.ts";

@Module({ controllers: [StockController], providers: [StockService] })
export class StockModule {}
