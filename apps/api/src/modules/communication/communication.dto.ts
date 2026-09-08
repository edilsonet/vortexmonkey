import { IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateThreadDto {
  @IsString()
  public title!: string;

  @IsOptional()
  @IsIn(["COMPANY", "RECRUITMENT"])
  public kind?: string;
}

export class CreateMessageDto {
  @IsUUID()
  public threadId!: string;

  @IsString()
  public body!: string;
}

export class CreateAnnouncementDto {
  @IsString()
  public title!: string;

  @IsString()
  public body!: string;
}
