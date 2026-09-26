import { ArgumentsHost, Catch, HttpException, HttpStatus, type ExceptionFilter } from '@nestjs/common';
import { ERROR_CODES, type ErrorCode } from '@vortex/types';
import type { Request, Response } from 'express';
import { AuditService } from '../../modules/audit/audit.service';

const codeByStatus: Readonly<Record<number, ErrorCode>> = {
  401: 'AUTH_REQUIRED', 403: 'PERMISSION_DENIED', 404: 'NOT_FOUND',
  409: 'IDEMPOTENCY_CONFLICT', 422: 'VALIDATION_ERROR', 429: 'RATE_LIMITED', 500: 'LEDGER_VERIFICATION_FAILED',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  public constructor(private readonly audit: AuditService) {}

  public async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const objectBody = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
    const code = (typeof objectBody.code === 'string' && objectBody.code in ERROR_CODES ? objectBody.code : codeByStatus[status]) as ErrorCode | undefined;
    const messageValue = objectBody.message ?? (exception instanceof Error ? exception.message : 'Erro interno.');
    const message = Array.isArray(messageValue) ? messageValue.join('; ') : String(messageValue);

    if (request.vortexContext) {
      try {
        await this.audit.record(request.vortexContext, {
          requestId: request.requestId,
          ipAddress: request.ip,
          userAgent: request.header('user-agent'),
          method: request.method,
          path: request.originalUrl.split('?')[0]!,
          params: request.params,
          query: request.query,
          body: request.body,
          outcome: 'FAILURE',
          statusCode: status,
          response: { code: code ?? 'LEDGER_VERIFICATION_FAILED', message },
        });
      } catch {
        // A falha original sempre prevalece; a falha de auditoria segue para o logger HTTP.
      }
    }

    response.status(status).json({ success: false, data: null, error: { code: code ?? 'LEDGER_VERIFICATION_FAILED', message, request_id: request.requestId ?? 'unknown' } });
  }
}
