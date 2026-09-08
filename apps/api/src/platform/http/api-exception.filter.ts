import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
      res.status(status).json({
        success: false,
        data: null,
        error: {
          code: payload.code ?? statusToCode(status),
          message: payload.message ?? exception.message,
          details: payload.details,
        },
      });
      return;
    }
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      data: null,
      error: { code: "LEDGER_VERIFICATION_FAILED", message: "Erro interno." },
    });
  }
}

const statusToCode = (status: number): string => {
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 403) return "PERMISSION_DENIED";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "IDEMPOTENCY_CONFLICT";
  if (status === 422) return "VALIDATION_ERROR";
  if (status === 429) return "RATE_LIMITED";
  return "VALIDATION_ERROR";
};
