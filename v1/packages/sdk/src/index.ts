import type { ApiResponse } from '@vortex/types';

export interface VortexClientOptions {
  baseUrl: string;
  accessToken?: () => string | undefined;
  tenantId?: () => string | undefined;
  companyId?: () => string | undefined;
  fetcher?: typeof fetch;
}

export interface CreateProtocolInput {
  entityId: string;
  entityType: string;
  subject: string;
  accessLevel: 'PUBLIC' | 'RESTRICTED' | 'PRIVATE';
  restrictionBasis?: 'LGPD_PERSONAL_DATA' | 'BUSINESS_CONFIDENTIALITY' | 'NATIONAL_SECURITY' | 'ONGOING_PROCESS';
  containsPersonalData: boolean;
}

export class VortexClient {
  readonly #fetcher: typeof fetch;
  readonly #baseUrl: string;
  readonly #accessToken: () => string | undefined;
  readonly #tenantId: () => string | undefined;
  readonly #companyId: () => string | undefined;

  public constructor(options: VortexClientOptions) {
    this.#fetcher = options.fetcher ?? fetch;
    this.#baseUrl = options.baseUrl.replace(/\/$/, '');
    this.#accessToken = options.accessToken ?? (() => undefined);
    this.#tenantId = options.tenantId ?? (() => undefined);
    this.#companyId = options.companyId ?? (() => undefined);
  }

  public async request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');
    const token = this.#accessToken();
    const tenantId = this.#tenantId();
    const companyId = this.#companyId();
    if (token) headers.set('authorization', `Bearer ${token}`);
    if (tenantId) headers.set('x-tenant-id', tenantId);
    if (companyId) headers.set('x-company-id', companyId);
    if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    if (init.method && !['GET', 'HEAD'].includes(init.method.toUpperCase()) && !headers.has('idempotency-key')) {
      headers.set('idempotency-key', crypto.randomUUID());
    }
    const response = await this.#fetcher(`${this.#baseUrl}${path}`, { ...init, headers });
    return response.json() as Promise<ApiResponse<T>>;
  }

  public health(): Promise<ApiResponse<{ status: 'ok' }>> { return this.request('/health'); }
  public me(): Promise<ApiResponse<unknown>> { return this.request('/api/v1/identity/me'); }
  public createProtocol<T = unknown>(input: CreateProtocolInput): Promise<ApiResponse<T>> { return this.request('/api/v1/protocols', { method: 'POST', body: JSON.stringify(input) }); }
  public protocol<T = unknown>(id: string): Promise<ApiResponse<T>> { return this.request(`/api/v1/protocols/${id}`); }
  public timeline<T = unknown>(id: string): Promise<ApiResponse<T>> { return this.request(`/api/v1/protocols/${id}/timeline`); }
  public requestProtocolView<T = unknown>(id: string, justification: string): Promise<ApiResponse<T>> { return this.request(`/api/v1/protocols/${id}/vista`, { method: 'POST', body: JSON.stringify({ justification }) }); }
  public decideProtocolView<T = unknown>(viewId: string, decision: 'GRANTED' | 'DENIED', reason: string): Promise<ApiResponse<T>> { return this.request(`/api/v1/protocols/views/${viewId}/decision`, { method: 'POST', body: JSON.stringify({ decision, reason }) }); }
  public publicSearch<T = unknown>(query = ''): Promise<ApiResponse<T>> { return this.request(`/api/v1/public/search?q=${encodeURIComponent(query)}`); }
  public audit<T = unknown>(query = ''): Promise<ApiResponse<T>> { return this.request(`/api/v1/audit${query ? `?${query}` : ''}`); }
  public verifyLedger<T = unknown>(): Promise<ApiResponse<T>> { return this.request('/api/v1/ledger/verify'); }
  public exportMerkle<T = unknown>(): Promise<ApiResponse<T>> { return this.request('/api/v1/ledger/export/merkle'); }
}
