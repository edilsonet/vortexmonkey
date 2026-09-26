import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestContext } from '@vortex/shared-dto';

/** Injeta o contexto montado pelo `RequestContextMiddleware`. */
export const VortexContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestContext | undefined =>
    context.switchToHttp().getRequest<Request>().vortexContext,
);
