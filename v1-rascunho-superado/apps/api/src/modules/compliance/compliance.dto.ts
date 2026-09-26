import { IsIn, IsOptional, IsString } from "class-validator";

export class LgpdRequestDto {
  @IsIn(["EXPORT", "ERASURE", "CONSENT_REVOKE"])
  public requestType!: "EXPORT" | "ERASURE" | "CONSENT_REVOKE";

  @IsOptional()
  @IsString()
  public notes?: string;
}
