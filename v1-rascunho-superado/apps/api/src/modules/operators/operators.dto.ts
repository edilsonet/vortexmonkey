import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CreateOperatorDto {
  @IsUUID()
  public companyId!: string;

  @IsIn(["RBAC_91", "RBAC_121", "RBAC_135", "RBAC_137"])
  public operatorType!: string;

  @IsOptional()
  @IsString()
  public coaNumber?: string;

  @IsOptional()
  @IsString()
  public eoNumber?: string;

  @IsOptional()
  @IsIn(["SIMPLES", "PADRAO"])
  public classification?: string;
}

export class CreateOpsAircraftDto {
  @IsString()
  public registration!: string;

  @IsString()
  public model!: string;

  @IsIn(["AVIAO", "HELICOPTERO", "JATO", "TURBOELICE"])
  public aircraftCategory!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  public maxPassengers?: number;

  @IsOptional()
  @IsString()
  public lastReweighDate?: string;
}

export class AddFleetDto {
  @IsUUID()
  public operatorId!: string;

  @IsUUID()
  public aircraftId!: string;
}

export class RecordCvaDto {
  @IsString()
  public cvaNumber!: string;

  @IsOptional()
  @IsBoolean()
  public critical?: boolean;
}

export class CreateMelDto {
  @IsUUID()
  public aircraftId!: string;

  @IsString()
  public ataChapter!: string;

  @IsString()
  public itemDescription!: string;

  @IsIn(["CAT_A", "CAT_B", "CAT_C", "CAT_D"])
  public category!: string;

  @IsOptional()
  @IsString()
  public procedureO?: string;

  @IsOptional()
  @IsString()
  public procedureM?: string;
}

export class CreateDaDto {
  @IsUUID()
  public aircraftId!: string;

  @IsString()
  public daNumber!: string;

  @IsOptional()
  @IsString()
  public description?: string;
}

export class CreateLogbookDto {
  @IsUUID()
  public aircraftId!: string;

  @IsString()
  public departure!: string;

  @IsString()
  public arrival!: string;

  @IsString()
  public pilotName!: string;

  @IsString()
  public pilotLicense!: string;

  @IsOptional()
  @IsIn(["PIC", "SIC", "INSP", "INSTR"])
  public pilotFuncao?: string;

  @IsOptional()
  public flightTimeHours?: number;
}

export class CreateDispatchDto {
  @IsUUID()
  public aircraftId!: string;

  @IsString()
  public departure!: string;

  @IsString()
  public destination!: string;

  @IsIn(["VFR", "IFR"])
  public flightRule!: string;

  @IsInt()
  @Min(0)
  public fuelPlannedMinutes!: number;

  @IsOptional()
  @IsBoolean()
  public isNight?: boolean;

  @IsOptional()
  @IsBoolean()
  public hasAlternate?: boolean;

  @IsOptional()
  @IsBoolean()
  public metValid?: boolean;

  @IsOptional()
  @IsBoolean()
  public weightBalanceValid?: boolean;

  @IsOptional()
  @IsString()
  public flightNumber?: string;
}

export class CreateManualDto {
  @IsUUID()
  public operatorId!: string;

  @IsIn(["MGO", "AOM", "MCMSV", "MGM", "PTO", "SOP", "MIP"])
  public manualType!: string;

  @IsString()
  public title!: string;
}

export class CreateAgriDto {
  @IsUUID()
  public companyId!: string;

  @IsOptional()
  @IsString()
  public cdagNumber?: string;
}

export class CreateDisperserDto {
  @IsUUID()
  public aircraftId!: string;

  @IsIn(["SOLIDOS", "LIQUIDOS", "GRANULARES"])
  public disperserType!: string;

  @IsOptional()
  @IsString()
  public calibrationExpiry?: string;

  @IsOptional()
  @IsBoolean()
  public dgpsInstalled?: boolean;

  @IsOptional()
  @IsString()
  public dgpsConformity?: string;
}
