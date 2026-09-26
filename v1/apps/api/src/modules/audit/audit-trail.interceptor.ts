import { Injectable, Logger, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { from, map, mergeMap, type Observable } from 'rxjs';
import { AuditService, type RecordAuditInput } from './audit.service';

@Injectable()
export class AuditTrailInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditTrailInterceptor.name);
  public constructor(private readonly audit: AuditService) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const vortex = request.vortexContext;
    if (!vortex) return next.handle();

    return next.handle().pipe(
      mergeMap((data: unknown) => from(this.recordSafely(vortex, {
        requestId: request.requestId,
        ipAddress: request.ip,
        userAgent: request.header('user-agent'),
        method: request.method,
        path: request.originalUrl.split('?')[0]!,
        params: request.params,
        query: request.query,
        body: request.body,
        outcome: 'SUCCESS',
        statusCode: response.statusCode,
        response: data,
      })).pipe(map(() => data))),
    );
  }

  private async recordSafely(context: NonNullable<Request['vortexContext']>, input: RecordAuditInput): Promise<void> {
    try {
      await this.audit.record(context, input);
    } catch (error) {
      this.logger.error(error, 'Falha ao registrar trilha de auditoria HTTP');
    }
  }
}
