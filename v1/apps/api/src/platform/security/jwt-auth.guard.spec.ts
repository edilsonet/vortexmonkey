import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard';

const executionContext = (request: Request): ExecutionContext => ({
  getHandler: () => undefined,
  getClass: () => undefined,
  switchToHttp: () => ({ getRequest: () => request }),
} as unknown as ExecutionContext);

describe('JwtAuthGuard', () => {
  it('retorna 403 quando o usuário seleciona empresa sem vínculo', async () => {
    const request = {
      requestId: 'request-1',
      header: (name: string) => ({
        authorization: 'Bearer valid-token',
        'x-tenant-id': 'tenant-1',
        'x-company-id': 'company-without-relationship',
      })[name.toLowerCase()],
    } as unknown as Request;
    const reflector = { getAllAndOverride: () => false };
    const jwt = { verifyAsync: async () => ({ sub: 'user-1', memberships: [{ tenantId: 'tenant-1', roles: ['RCONTA'], companyIds: [], scopes: ['identity:write'] }] }) };
    const guard = new JwtAuthGuard(reflector as never, jwt as never);
    await expect(guard.canActivate(executionContext(request))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
