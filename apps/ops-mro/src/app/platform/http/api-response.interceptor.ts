import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { ok, type ApiSuccess } from '@vortex/shared-dto';
import { map, type Observable } from 'rxjs';

/**
 * Envelope global de sucesso (regra 5). O controller devolve o dado cru; o
 * envelope e aplicado em um unico lugar. Falhas sao tratadas pelo
 * `ApiExceptionFilter`, nunca aqui.
 */
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  public intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T>> {
    return next.handle().pipe(map((data) => ok(data)));
  }
}
