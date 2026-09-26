import { ACCREDITATION_SCOPES, ACCREDITATION_TYPES, LICENSE_TYPES, PROFESSIONAL_TYPES, RATINGS, SYSTEM_ROLES, type AccreditationType, type LicenseType, type ProfessionalType, type SystemRole } from '@vortex/contracts-be';
import { ArrayUnique, IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProfessionalProfileDto {
  @IsIn(PROFESSIONAL_TYPES) public professionalType!: ProfessionalType;
}
export class RegisterLicenseDto {
  @IsIn(LICENSE_TYPES) public licenseType!: LicenseType;
  @IsString() public licenseNumber!: string;
  @IsArray() @ArrayUnique() @IsIn(RATINGS, { each: true }) public ratings!: string[];
  @IsDateString() public issueDate!: string;
  @IsDateString() public validUntil!: string;
}
export class RegisterAccreditationDto {
  @IsIn(ACCREDITATION_TYPES) public accreditationType!: AccreditationType;
  @IsString() public portariaNumber!: string;
  @IsDateString() public issueDate!: string;
  @IsArray() @ArrayUnique() @IsIn(ACCREDITATION_SCOPES, { each: true }) public scope!: string[];
}
export class CreateRelationshipDto {
  @IsUUID() public userId!: string;
  @IsUUID() public companyId!: string;
  @IsIn(SYSTEM_ROLES) public role!: SystemRole;
  @IsArray() @ArrayUnique() @IsString({ each: true }) public scopedModules!: string[];
  @IsOptional() @IsDateString() public expiresAt?: string;
}
