import { Module } from "@nestjs/common";
import { MarketController } from "./market.controller.ts";
import { MarketService } from "./market.service.ts";

@Module({ controllers: [MarketController], providers: [MarketService] })
export class MarketModule {}
