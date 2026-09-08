import { describe, expect, it } from "vitest";
import {
  assertListable,
  buyerCharge,
  commissionOfSale,
  canPublish,
} from "./market.policy.ts";

describe("market.policy", () => {
  it("rejects listing without inventory item", () => {
    expect(() =>
      assertListable({ itemId: "", status: "AVAILABLE", quantity: 1 }),
    ).toThrow(/estoque/);
  });

  it("rejects quarantine or sold items", () => {
    expect(() =>
      assertListable({ itemId: "i1", status: "QUARANTINE", quantity: 1 }),
    ).toThrow(/quarentena|vermelha/i);
    expect(() =>
      assertListable({ itemId: "i1", status: "SOLD", quantity: 1 }),
    ).toThrow(/vendid/i);
    expect(() =>
      assertListable({ itemId: "i1", status: "AVAILABLE", quantity: 1 }),
    ).not.toThrow();
  });

  it("charges 3 percent of seller; buyer exempt", () => {
    expect(commissionOfSale(100)).toBe(3);
    expect(commissionOfSale(199)).toBe(5.97);
    expect(buyerCharge(199)).toBe(0);
  });

  it("publish requires admin approval and draft status", () => {
    expect(canPublish({ status: "RASCUNHO", adminApproved: false })).toBe(false);
    expect(canPublish({ status: "RASCUNHO", adminApproved: true })).toBe(true);
    expect(canPublish({ status: "PUBLICADO", adminApproved: true })).toBe(false);
  });
});
