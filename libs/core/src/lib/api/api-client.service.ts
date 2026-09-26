import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { ApiResponse } from '@vortex/shared-dto';
import { Observable, catchError, map, throwError } from 'rxjs';
import { VORTEX_CORE_CONFIG } from '../config';
import { toVortexError } from './api-error';

/**
 * Cliente HTTP do VORTEX.
 *
 * Entrega o dado ja desembrulhado do envelope `{ success, data, error }` e
 * converte qualquer falha em `VortexApiError`. Os interceptores cuidam do
 * `Authorization` e do `Idempotency-Key` (regra 6).
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(VORTEX_CORE_CONFIG).apiBaseUrl.replace(/\/+$/, '');

  get<T>(path: string): Observable<T> {
    return this.send<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.send<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.send<T>('PUT', path, body);
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.send<T>('PATCH', path, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.send<T>('DELETE', path);
  }

  private send<T>(method: string, path: string, body?: unknown): Observable<T> {
    return this.http
      .request<ApiResponse<T>>(method, `${this.baseUrl}${path}`, body === undefined ? {} : { body })
      .pipe(
        map((response) => {
          if (!response.success) {
            throw toVortexError({ success: false, data: null, error: response.error });
          }
          return response.data;
        }),
        catchError((error: unknown) => throwError(() => toVortexError(error))),
      );
  }
}
