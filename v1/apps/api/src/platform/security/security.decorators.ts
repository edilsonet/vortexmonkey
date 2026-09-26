import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC = Symbol('is-public');
export const REQUIRED_ROLES = Symbol('required-roles');
export const REQUIRED_SCOPES = Symbol('required-scopes');
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const RequireRoles = (...roles: readonly string[]) => SetMetadata(REQUIRED_ROLES, roles);
export const RequireScopes = (...scopes: readonly string[]) => SetMetadata(REQUIRED_SCOPES, scopes);
