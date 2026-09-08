import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestContext => {
  const req = ctx.switchToHttp().getRequest<{ user: RequestContext }>();
  return req.user;
});
