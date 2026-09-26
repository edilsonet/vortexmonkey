import { describe, expect, it } from "vitest";
import { assertCoverage, coverage, drawIds, sampleSize, toxValidUntil } from "./ppsp.policy.ts";

describe("ppsp.policy", () => {
  it("toxicologico vale 90 dias", () => {
    const collected = new Date("2026-01-01T00:00:00Z");
    const { validUntil, expired } = toxValidUntil(collected, new Date("2026-03-31T00:00:00Z"));
    expect(validUntil.toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(expired).toBe(false);
    expect(toxValidUntil(collected, new Date("2026-04-02T00:00:00Z")).expired).toBe(true);
  });

  it("sorteio cobre no minimo 25 por cento", () => {
    expect(sampleSize(4)).toBe(1);
    expect(sampleSize(8)).toBe(2);
    expect(coverage(2, 8)).toBe(0.25);
    expect(() => assertCoverage(1, 8)).toThrow(/25%/);
  });

  it("draw is deterministic for the same seed", () => {
    const pool = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const first = drawIds(pool, 2, "seed-1");
    const second = drawIds(pool, 2, "seed-1");
    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
  });
});
