import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../platform/security/current-user.ts";
import type { RequestContext } from "@vortex/types";
import { OperatorsService } from "./operators.service.ts";
import {
  AddFleetDto,
  CreateAgriDto,
  CreateDaDto,
  CreateDispatchDto,
  CreateDisperserDto,
  CreateLogbookDto,
  CreateManualDto,
  CreateMelDto,
  CreateOperatorDto,
  CreateOpsAircraftDto,
  RecordCvaDto,
} from "./operators.dto.ts";

@Controller("ops")
export class OperatorsController {
  public constructor(@Inject(OperatorsService) private readonly ops: OperatorsService) {}

  @Get()
  public overview(@CurrentUser() user: RequestContext) {
    return this.ops.overview(user);
  }

  @Post("operators")
  public operator(@CurrentUser() user: RequestContext, @Body() dto: CreateOperatorDto) {
    return this.ops.createOperator(user, dto);
  }

  @Post("aircraft")
  public aircraft(@CurrentUser() user: RequestContext, @Body() dto: CreateOpsAircraftDto) {
    return this.ops.createAircraft(user, dto);
  }

  @Post("fleet")
  public fleet(@CurrentUser() user: RequestContext, @Body() dto: AddFleetDto) {
    return this.ops.addFleet(user, dto);
  }

  @Post("aircraft/:id/cva")
  public cva(@CurrentUser() user: RequestContext, @Param("id") id: string, @Body() dto: RecordCvaDto) {
    return this.ops.recordCva(user, id, dto);
  }

  @Post("mel")
  public mel(@CurrentUser() user: RequestContext, @Body() dto: CreateMelDto) {
    return this.ops.createMel(user, dto);
  }

  @Post("mel/:id/defer")
  public defer(@CurrentUser() user: RequestContext, @Param("id") id: string) {
    return this.ops.deferMel(user, id);
  }

  @Post("mel/:id/repair")
  public repair(@CurrentUser() user: RequestContext, @Param("id") id: string) {
    return this.ops.repairMel(user, id);
  }

  @Post("da")
  public da(@CurrentUser() user: RequestContext, @Body() dto: CreateDaDto) {
    return this.ops.createDa(user, dto);
  }

  @Post("logbook")
  public logbook(@CurrentUser() user: RequestContext, @Body() dto: CreateLogbookDto) {
    return this.ops.createLogbook(user, dto);
  }

  @Post("logbook/:id/sign")
  public sign(@CurrentUser() user: RequestContext, @Param("id") id: string) {
    return this.ops.signLogbook(user, id);
  }

  @Post("dispatch")
  public dispatch(@CurrentUser() user: RequestContext, @Body() dto: CreateDispatchDto) {
    return this.ops.createDispatch(user, dto);
  }

  @Post("dispatch/:id/validate")
  public validate(@CurrentUser() user: RequestContext, @Param("id") id: string) {
    return this.ops.validateDispatchRelease(user, id);
  }

  @Post("dispatch/:id/release")
  public release(@CurrentUser() user: RequestContext, @Param("id") id: string) {
    return this.ops.releaseDispatch(user, id);
  }

  @Post("manuals")
  public manual(@CurrentUser() user: RequestContext, @Body() dto: CreateManualDto) {
    return this.ops.createManual(user, dto);
  }

  @Post("agri")
  public agri(@CurrentUser() user: RequestContext, @Body() dto: CreateAgriDto) {
    return this.ops.createAgri(user, dto);
  }

  @Post("dispersers")
  public disperser(@CurrentUser() user: RequestContext, @Body() dto: CreateDisperserDto) {
    return this.ops.createDisperser(user, dto);
  }
}
