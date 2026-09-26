import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequireRoles } from '../../platform/security/security.decorators';
import { ApproveListingDto, CreateListingDto, CreateOrderDto, PayOrderDto, SearchListingsDto } from './rloja.dto';
import { RlojaService } from './rloja.service';

@Controller('api/v1')
export class RlojaController {
  public constructor(private readonly rloja: RlojaService) {}

  /** POST /api/v1/listings — Cria anúncio (visão do estoque). */
  @Post('listings')
  @RequireRoles('admin', 'supervisor', 'operator')
  public createListing(@Req() req: Request, @Body() dto: CreateListingDto): Promise<unknown> {
    return this.rloja.createListing(req.vortexContext!, dto);
  }

  /** GET /api/v1/listings — Lista anúncios publicados. */
  @Get('listings')
  @RequireRoles('admin', 'supervisor', 'operator', 'auditor', 'viewer')
  public searchListings(@Req() req: Request, @Query() query: SearchListingsDto): Promise<unknown> {
    return this.rloja.searchListings(req.vortexContext!, query);
  }

  /** POST /api/v1/listings/:id/approve — Admin Dono aprova/rejeita publicação. */
  @Post('listings/:id/approve')
  @RequireRoles('admin')
  public approveListing(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveListingDto,
  ): Promise<unknown> {
    return this.rloja.approveListing(req.vortexContext!, id, dto.approved);
  }

  /** POST /api/v1/orders — Cria pedido de compra. */
  @Post('orders')
  @RequireRoles('admin', 'supervisor', 'operator')
  public createOrder(@Req() req: Request, @Body() dto: CreateOrderDto): Promise<unknown> {
    return this.rloja.createOrder(req.vortexContext!, dto);
  }

  /** POST /api/v1/orders/:id/pay — Registra pagamento (webhook Asaas). */
  @Post('orders/:id/pay')
  @RequireRoles('admin', 'supervisor')
  public payOrder(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayOrderDto,
  ): Promise<unknown> {
    return this.rloja.payOrder(req.vortexContext!, id, dto.payment_reference);
  }
}
