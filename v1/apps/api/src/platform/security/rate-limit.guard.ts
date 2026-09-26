import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  public constructor(private readonly redis: RedisService) {}
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.originalUrl;
    const limit = path.includes('/auth/') ? 10 : path.includes('/upload') ? 20 : ['GET','HEAD'].includes(request.method) ? 300 : 60;
    const subject = request.vortexContext?.userId ?? request.ip ?? 'unknown';
    const count = await this.redis.incrementWindow(`rate:${subject}:${request.method}:${Math.floor(Date.now() / 60_000)}`, 60);
    if (count > limit) throw new HttpException({ code: 'RATE_LIMITED', message: 'Limite de requisições excedido.' }, HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}
