import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { StockService } from "./stock.service.ts";
import { AddItemDto, TransferCustodyDto } from "./stock.dto.ts";

@Controller("stock")
export class StockController {
  public constructor(@Inject(StockService) private readonly stock: StockService) {}

  @Get()
  public list(@CurrentUser() user: RequestContext) {
    return this.stock.list(user);
  }

  @Post("items")
  public add(@CurrentUser() user: RequestContext, @Body() dto: AddItemDto) {
    return this.stock.addItem(user, dto);
  }

  @Post("transfer")
  public transfer(@CurrentUser() user: RequestContext, @Body() dto: TransferCustodyDto) {
    return this.stock.transfer(user, dto);
  }
}
