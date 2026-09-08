import { describe, expect, it } from "vitest";
import { firstValueFrom, of } from "rxjs";
import { ApiResponseInterceptor } from "./api-response.interceptor.ts";

describe("ApiResponseInterceptor", () => {
  it("wraps raw data", async () => {
    const interceptor = new ApiResponseInterceptor();
    const result = await firstValueFrom(interceptor.intercept({} as never, { handle: () => of({ id: 1 }) }));
    expect(result).toEqual({ success: true, data: { id: 1 }, error: null });
  });
});
