import { describe, expect, it } from "vitest";

describe("dual confirmation", () => {
  it("stays pending until both sides confirm", () => {
    const next = (person: boolean, company: boolean) => (person && company ? "ACTIVE" : "PENDING");
    expect(next(false, false)).toBe("PENDING");
    expect(next(true, false)).toBe("PENDING");
    expect(next(true, true)).toBe("ACTIVE");
  });
});
