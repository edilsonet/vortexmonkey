import { describe, expect, it } from "vitest";
import {
  assertPavement,
  faunaRisk,
  formatRcr,
  isSescincWithinLimit,
  nextSgsoReportDue,
  rwyccFromContaminant,
} from "./aerodromes.policy.ts";

describe("aerodromes.policy", () => {
  it("SESCINC max 180 seconds", () => {
    expect(isSescincWithinLimit(180)).toBe(true);
    expect(isSescincWithinLimit(181)).toBe(false);
  });

  it("pavement IRI <= 2.5 and macrotexture >= 0.60", () => {
    expect(() => assertPavement({ iri: 2.5, macrotexture: 0.6 })).not.toThrow();
    expect(() => assertPavement({ iri: 2.6, macrotexture: 0.6 })).toThrow(/IRI/);
    expect(() => assertPavement({ iri: 2.5, macrotexture: 0.59 })).toThrow(/macrotextura/i);
  });

  it("RCAM contaminant maps to RWYCC", () => {
    expect(rwyccFromContaminant("SECO")).toBe(6);
    expect(rwyccFromContaminant("UMIDO")).toBe(5);
    expect(rwyccFromContaminant("GELO")).toBe(0);
    expect(rwyccFromContaminant("AGUA_LAMINA")).toBe(2);
  });

  it("formats RCR message with thirds", () => {
    expect(formatRcr("09/27", 5, 4, 5)).toBe("RCR 09/27 T1/5 T2/4 T3/5 RWYCC 4");
  });

  it("fauna risk is log10 of count", () => {
    expect(faunaRisk(10)).toBe(1);
    expect(faunaRisk(100)).toBe(2);
    expect(faunaRisk(1)).toBe(0);
  });

  it("SGSO quarterly due 20/01 20/05 20/09", () => {
    expect(nextSgsoReportDue(new Date("2026-01-01T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-01-20");
    expect(nextSgsoReportDue(new Date("2026-01-20T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-05-20");
    expect(nextSgsoReportDue(new Date("2026-09-20T00:00:00Z")).toISOString().slice(0, 10)).toBe("2027-01-20");
  });
});
