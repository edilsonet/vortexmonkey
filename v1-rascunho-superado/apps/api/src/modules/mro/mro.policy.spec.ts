import { describe, expect, it } from "vitest";
import {
  assertAdvance,
  canIssueCrs,
  nextStep,
  requiresSegvoo,
  STEP_LABELS,
  WORK_ORDER_STEPS,
} from "./mro.policy.ts";

describe("mro.policy", () => {
  it("oficina has 12 named steps", () => {
    expect(WORK_ORDER_STEPS).toHaveLength(12);
    expect(STEP_LABELS[1]).toBe("Recebimento");
    expect(STEP_LABELS[9]).toBe("APRS/CRS");
    expect(STEP_LABELS[12]).toBe("Pos-entrega");
  });

  it("advances one step at a time and blocks skip or reverse", () => {
    expect(nextStep(1)).toBe(2);
    expect(nextStep(12)).toBe(12);
    expect(() => assertAdvance(3, 5)).toThrow(/sequencia/);
    expect(() => assertAdvance(4, 3)).toThrow(/sequencia/);
    expect(() => assertAdvance(12, 13)).toThrow(/sequencia/);
  });

  it("CRS only from step 9 and SEGVOO required for grande reparo/alteracao", () => {
    expect(canIssueCrs(8)).toBe(false);
    expect(canIssueCrs(9)).toBe(true);
    expect(requiresSegvoo("GRANDE_REPARO")).toBe(true);
    expect(requiresSegvoo("GRANDE_ALTERACAO")).toBe(true);
    expect(requiresSegvoo("PREVENTIVA")).toBe(false);
  });
});
