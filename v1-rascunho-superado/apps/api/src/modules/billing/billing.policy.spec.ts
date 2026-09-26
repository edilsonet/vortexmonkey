import { describe, expect, it } from "vitest";
import { assertSellable, commissionOf, hidesAds, isSellable, periodEnd } from "./billing.policy.ts";

describe("billing.policy", () => {
  it("sells exactly six products", () => {
    expect(isSellable("RCONTA_VIP")).toBe(true);
    expect(isSellable("RECRUITMENT")).toBe(true);
    expect(isSellable("ERP_MRO")).toBe(true);
    expect(isSellable("ERP_OPS")).toBe(true);
    expect(isSellable("ERP_TRAINING")).toBe(true);
    expect(isSellable("ERP_AIRPORT")).toBe(true);
  });

  it("rejects catalogo central", () => {
    expect(() => assertSellable("CATALOG_CENTRAL")).toThrow(/nao e vendido/);
    expect(isSellable("CATALOG_CENTRAL")).toBe(false);
  });

  it("charges 3 percent of seller only", () => {
    expect(commissionOf(100)).toBe(3);
    expect(commissionOf(199)).toBe(5.97);
  });

  it("hides ads when vip or any erp is active", () => {
    expect(hidesAds([])).toBe(false);
    expect(hidesAds(["RCONTA_VIP"])).toBe(true);
    expect(hidesAds(["ERP_MRO"])).toBe(true);
  });

  it("computes monthly period end", () => {
    const end = periodEnd(new Date("2026-09-08T00:00:00Z"), "MONTHLY");
    expect(end.toISOString().slice(0, 10)).toBe("2026-10-08");
  });
});
