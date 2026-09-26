import type { RequestContext } from '@vortex/shared-dto';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      vortexContext?: RequestContext;
      /** Motivo da rejeicao do token; o guard traduz em `AUTH_REQUIRED`/`TOKEN_EXPIRED`. */
      vortexAuthError?: { code: 'AUTH_REQUIRED' | 'TOKEN_EXPIRED'; message: string };
    }
  }
}

export {};
