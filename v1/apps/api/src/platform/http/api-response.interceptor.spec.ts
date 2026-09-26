import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { ApiResponseInterceptor } from './api-response.interceptor';

describe('ApiResponseInterceptor', () => {
  it('aplica o contrato global', async () => {
    const result = await new Promise((resolve) => new ApiResponseInterceptor().intercept({} as never, { handle: () => of({ status: 'ok' }) }).subscribe(resolve));
    expect(result).toEqual({ success: true, data: { status: 'ok' }, error: null });
  });
});
