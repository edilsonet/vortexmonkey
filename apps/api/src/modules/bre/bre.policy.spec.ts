import { describe, expect, it } from "vitest";
import { evaluateRule } from "./bre.policy.ts";

describe("bre.policy", () => {
  it("blocks listing without inventory", () => {
    const r = evaluateRule("LISTING_WITHOUT_INVENTORY", { inventoryItemId: "" });
    expect(r.allowed).toBe(false);
    expect(r.severity).toBe("BLOCKING");
  });

  it("flags SESCINC over 180s as critical", () => {
    const r = evaluateRule("SESCINC_RESPONSE_OVER_LIMIT", { responseTimeSeconds: 181 });
    expect(r.allowed).toBe(false);
    expect(r.severity).toBe("CRITICAL");
  });

  it("fail-open on unknown rule", () => {
    const r = evaluateRule("UNKNOWN_RULE", {});
    expect(r.allowed).toBe(true);
    expect(r.severity).toBe("INFO");
  });
});
