import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  ConflictException,
} from "@nestjs/common";
import type { Request } from "express";
import { of, type Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { RedisService } from "../redis/redis.service.ts";

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  public constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  public async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!["POST", "PUT", "PATCH"].includes(req.method)) return next.handle();
    const key = req.header("idempotency-key");
    if (!key) return next.handle();
    const cacheKey = `idemp:${key}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      throw new ConflictException({ code: "IDEMPOTENCY_CONFLICT", message: "Chave de idempotencia ja utilizada.", details: JSON.parse(cached) });
    }
    return next.handle().pipe(
      tap(async (data) => {
        await this.redis.set(cacheKey, JSON.stringify(data), 86_400);
      }),
    );
  }
}
