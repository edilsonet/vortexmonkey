import { IsObject, IsString } from "class-validator";

export class EvaluateRuleDto {
  @IsString()
  public code!: string;

  @IsObject()
  public context!: Record<string, unknown>;
}
