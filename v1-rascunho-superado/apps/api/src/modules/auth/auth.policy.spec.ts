import { describe, expect, it } from "vitest";
import { assertCredentials, isResetExpired, resetExpiresAt } from "./auth.policy.ts";

describe("auth.policy", () => {
  it("rejects empty email or password", () => {
    expect(() => assertCredentials("", "Vortex@123")).toThrow(/e-mail/i);
    expect(() => assertCredentials("a@b.c", "")).toThrow(/senha/i);
    expect(() => assertCredentials("  ", "xxxxxxxx")).toThrow(/e-mail/i);
    expect(() => assertCredentials("a@b.c", "Vortex@123")).not.toThrow();
  });

  it("reset token expires in 1 hour", () => {
    const issued = new Date("2026-09-08T12:00:00Z");
    expect(resetExpiresAt(issued).toISOString()).toBe("2026-09-08T13:00:00.000Z");
    expect(isResetExpired(new Date("2026-09-08T13:00:01Z"), resetExpiresAt(issued))).toBe(true);
    expect(isResetExpired(new Date("2026-09-08T12:59:00Z"), resetExpiresAt(issued))).toBe(false);
  });
});
