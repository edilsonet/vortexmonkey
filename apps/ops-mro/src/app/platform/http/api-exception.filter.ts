import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger, type ExceptionFilter } from '@nestjs/common';
import { ERROR_CODES, fail, httpStatusFor, type ApiFailure, type ErrorCode } from '@vortex/shared-dto';
import type { Request, Response } from 'express';

const CODE_BY_STATUS: Readonly<Record<number, ErrorCode>> = {
  400: 'VALIDATION_ERROR',
  401: 'AUTH_REQUIRED',
  403: 'PERMISSION_DENIED',
  404: 'NOT_FOUND',
  409: 'IDEMPOTENCY_CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
};

/** Violacao de RLS no PostgreSQL (insufficient_privilege). */
const RLS_VIOLATION = '42501';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Codigo canonico explicito, seja via `vortexCode` ou no corpo da HttpException. */
function explicitCodeOf(exception: unknown): ErrorCode | undefined {
  if (isRecord(exception) && typeof exception['vortexCode'] === 'string') {
    return exception['vortexCode'] as ErrorCode;
  }
  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    if (isRecord(body) && typeof body['code'] === 'string' && body['code'] in ERROR_CODES) {
      return body['code'] as ErrorCode;
    }
  }
  return undefined;
}

function messageOf(exception: unknown): string {
  if (!(exception instanceof HttpException)) return 'Erro interno do servidor.';
  const body = exception.getResponse();
  if (typeof body === 'string') return body;
  if (isRecord(body)) {
    const message = body['message'];
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) {
      return message.filter((part): part is string => typeof part === 'string').join('; ');
    }
  }
  return exception.message;
}

/**
 * Garante o envelope `{ success, data, error }` tambem nas falhas e traduz
 * erros do PostgreSQL. Violacao de RLS vira PERMISSION_DENIED (403): o usuario
 * esta autenticado, mas nao tem vinculo com o tenant/empresa do dado.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const pgCode = isRecord(exception) && typeof exception['code'] === 'string' ? exception['code'] : undefined;
    const httpStatus =
      pgCode === RLS_VIOLATION
        ? HttpStatus.FORBIDDEN
        : exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

    const explicitCode = explicitCodeOf(exception);
    const code: ErrorCode =
      explicitCode ??
      (pgCode === RLS_VIOLATION
        ? 'PERMISSION_DENIED'
        : httpStatus >= 500
          ? 'INTERNAL_ERROR'
          : (CODE_BY_STATUS[httpStatus] ?? 'VALIDATION_ERROR'));

    if (httpStatus >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const message =
      pgCode === RLS_VIOLATION
        ? 'Sem vinculo ativo com o tenant/empresa do recurso.'
        : messageOf(exception);
    const body: ApiFailure = fail(code, message, request.requestId);
    response.status(httpStatusFor(code) === httpStatus ? httpStatus : httpStatusFor(code)).json(body);
  }
}
