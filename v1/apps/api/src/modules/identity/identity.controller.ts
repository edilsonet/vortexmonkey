import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequireRoles, RequireScopes } from '../../platform/security/security.decorators';
import { CreateProfessionalProfileDto, CreateRelationshipDto, RegisterAccreditationDto, RegisterLicenseDto } from './identity.dto';
import { IdentityService } from './identity.service';

@Controller('api/v1/identity')
export class IdentityController {
  public constructor(private readonly identity: IdentityService) {}
  @Get('me') public me(@Req() request: Request) { return this.identity.me(request.vortexContext!); }
  @Post('profiles') @RequireScopes('identity:write') public createProfile(@Req() request: Request, @Body() dto: CreateProfessionalProfileDto) { return this.identity.createProfile(request.vortexContext!, dto); }
  @Get('licenses') public licenses(@Req() request: Request) { return this.identity.listLicenses(request.vortexContext!); }
  @Post('licenses') @RequireScopes('identity:write') public createLicense(@Req() request: Request, @Body() dto: RegisterLicenseDto) { return this.identity.registerLicense(request.vortexContext!, dto); }
  @Get('accreditations') public accreditations(@Req() request: Request) { return this.identity.listAccreditations(request.vortexContext!); }
  @Post('accreditations') @RequireScopes('identity:write') public createAccreditation(@Req() request: Request, @Body() dto: RegisterAccreditationDto) { return this.identity.registerAccreditation(request.vortexContext!, dto); }
  @Post('relationships') @RequireRoles('ADMIN','REPRESENTANTE_LEGAL') @RequireScopes('identity:relationships:write') public createRelationship(@Req() request: Request, @Body() dto: CreateRelationshipDto) { return this.identity.createRelationship(request.vortexContext!, dto); }
}
