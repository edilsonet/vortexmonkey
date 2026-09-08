import { describe, expect, it } from "vitest";
import { formatProtocol, parseProtocol } from "@vortex/utils";

describe("protocol numbering", () => {
  it("uses AAAA-NNNNNN", () => {
    expect(formatProtocol(2026, 1)).toBe("2026-000001");
    expect(parseProtocol("2026-000001")).toEqual({ year: 2026, seq: 1 });
  });
});
