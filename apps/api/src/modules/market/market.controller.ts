import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { MarketService } from "./market.service.ts";
import { CreateListingDto, CreateOrderDto } from "./market.dto.ts";

@Controller("rloja")
export class MarketController {
  public constructor(@Inject(MarketService) private readonly market: MarketService) {}

  @Get()
  public overview(@CurrentUser() user: RequestContext) {
    return this.market.overview(user);
  }

  @Post("listings")
  public listing(@CurrentUser() user: RequestContext, @Body() dto: CreateListingDto) {
    return this.market.createListing(user, dto);
  }

  @Post("listings/:id/approve")
  public approve(@CurrentUser() user: RequestContext, @Param("id") id: string) {
    return this.market.approve(user, id);
  }

  @Post("orders")
  public order(@CurrentUser() user: RequestContext, @Body() dto: CreateOrderDto) {
    return this.market.createOrder(user, dto);
  }
}
