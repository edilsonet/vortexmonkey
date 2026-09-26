import { describe, expect, it } from "vitest";
import { badgeSummary, highestSeverity } from "./alerts.policy.ts";

describe("alerts.policy", () => {
  it("counts only open alerts by severity", () => {
    const badges = badgeSummary([
      { severity: "INFO" },
      { severity: "WARNING" },
      { severity: "WARNING", status: "ACK" },
      { severity: "CRITICAL" },
      { severity: "BLOCKING" },
    ]);
    expect(badges).toEqual([
      { severity: "INFO", count: 1 },
      { severity: "WARNING", count: 1 },
      { severity: "CRITICAL", count: 1 },
      { severity: "BLOCKING", count: 1 },
    ]);
  });

  it("picks blocking as highest", () => {
    expect(highestSeverity([{ severity: "INFO", count: 3 }, { severity: "BLOCKING", count: 1 }])).toBe("BLOCKING");
  });
});
