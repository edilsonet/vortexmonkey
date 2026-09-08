import { describe, expect, it } from "vitest";
import {
  addMonths,
  assertDaDoesNotBlockDeferral,
  assertDisperserUsable,
  assertLogbookSignable,
  cvaStatusOn,
  fuelReserveMinutes,
  isReweighExpired,
  melDeferralDeadline,
  nextReweighDate,
  paadvNotes,
  performanceTempC,
  validateDispatch,
} from "./operators.policy.ts";

describe("operators.policy", () => {
  it("MEL deferral days by category IS 91-012", () => {
    const now = new Date("2026-09-08T12:00:00Z");
    expect(melDeferralDeadline("CAT_B", now)?.toISOString().slice(0, 10)).toBe("2026-09-11");
    expect(melDeferralDeadline("CAT_C", now)?.toISOString().slice(0, 10)).toBe("2026-09-18");
    expect(melDeferralDeadline("CAT_D", now)?.toISOString().slice(0, 10)).toBe("2027-01-06");
    expect(melDeferralDeadline("CAT_A", now)).toBeNull();
  });

  it("DA pending blocks MEL deferral", () => {
    expect(() => assertDaDoesNotBlockDeferral(true)).toThrow(/DA prevalece/);
    expect(() => assertDaDoesNotBlockDeferral(false)).not.toThrow();
  });

  it("repeso 36 months IS 135-21-001", () => {
    const last = new Date("2023-09-08T00:00:00Z");
    expect(nextReweighDate(last).toISOString().slice(0, 10)).toBe("2026-09-08");
    expect(isReweighExpired(last, new Date("2026-09-09T00:00:00Z"))).toBe(true);
    expect(isReweighExpired(last, new Date("2026-09-07T00:00:00Z"))).toBe(false);
    expect(addMonths(last, 36).toISOString().slice(0, 10)).toBe("2026-09-08");
  });

  it("fuel reserve RBAC 135 VFR/IFR", () => {
    expect(fuelReserveMinutes({ rule: "VFR", category: "AVIAO", night: false })).toBe(30);
    expect(fuelReserveMinutes({ rule: "VFR", category: "AVIAO", night: true })).toBe(45);
    expect(fuelReserveMinutes({ rule: "VFR", category: "HELICOPTERO", night: false })).toBe(20);
    expect(fuelReserveMinutes({ rule: "IFR", category: "AVIAO", night: false, hasAlternate: false })).toBe(120);
    expect(fuelReserveMinutes({ rule: "IFR", category: "JATO", night: false, hasAlternate: true })).toBe(45);
  });

  it("performance margin without MET is forecast max + 4C", () => {
    expect(performanceTempC(28)).toBe(32);
  });

  it("PAADV triggers +5C, -5 hPa, wind > 1%", () => {
    expect(paadvNotes({ tempDeltaC: 5, qnhDeltaHpa: 0, windVariation: 0 })).toEqual(["TEMP"]);
    expect(paadvNotes({ tempDeltaC: 0, qnhDeltaHpa: -5, windVariation: 0 })).toEqual(["QNH"]);
    expect(paadvNotes({ tempDeltaC: 0, qnhDeltaHpa: 0, windVariation: 0.02 })).toEqual(["WIND"]);
    expect(paadvNotes({ tempDeltaC: 4, qnhDeltaHpa: -4, windVariation: 0.01 })).toEqual([]);
  });

  it("CVA 365 days, alert 30 days, blocked when critical", () => {
    const issued = new Date("2026-01-01T00:00:00Z");
    expect(cvaStatusOn(issued, new Date("2026-12-02T00:00:00Z"), false)).toBe("ALERTA");
    expect(cvaStatusOn(issued, new Date("2027-01-02T00:00:00Z"), false)).toBe("VENCIDO");
    expect(cvaStatusOn(issued, new Date("2026-06-01T00:00:00Z"), true)).toBe("BLOQUEADO");
    expect(cvaStatusOn(issued, new Date("2026-06-01T00:00:00Z"), false)).toBe("VALIDO");
  });

  it("dispatch blocked without fuel/met/pb/mel/da/cva/reweigh", () => {
    const base = {
      fuelPlannedMinutes: 180,
      fuelRequiredMinutes: 120,
      metValid: true,
      weightBalanceValid: true,
      melExpired: false,
      daPending: false,
      cvaBlocked: false,
      reweighExpired: false,
    };
    expect(validateDispatch(base).status).toBe("VALIDADO");
    expect(validateDispatch({ ...base, fuelPlannedMinutes: 100 }).status).toBe("BLOQUEADO");
    expect(validateDispatch({ ...base, metValid: false }).status).toBe("BLOQUEADO");
    expect(validateDispatch({ ...base, weightBalanceValid: false }).status).toBe("BLOQUEADO");
    expect(validateDispatch({ ...base, melExpired: true }).status).toBe("BLOQUEADO");
    expect(validateDispatch({ ...base, daPending: true }).status).toBe("BLOQUEADO");
    expect(validateDispatch({ ...base, cvaBlocked: true }).status).toBe("BLOQUEADO");
    expect(validateDispatch({ ...base, reweighExpired: true }).status).toBe("BLOQUEADO");
  });

  it("logbook only signs from draft", () => {
    expect(() => assertLogbookSignable("draft")).not.toThrow();
    expect(() => assertLogbookSignable("signed")).toThrow(/rascunho/);
    expect(() => assertLogbookSignable("voided")).toThrow(/rascunho/);
  });

  it("disperser with expired calibration is blocked RBAC 137", () => {
    expect(() => assertDisperserUsable("CALIBRACAO_VENCIDA")).toThrow(/calibra/);
    expect(() => assertDisperserUsable("INOPERANTE")).toThrow(/inoperante/);
    expect(() => assertDisperserUsable("OPERACIONAL")).not.toThrow();
  });
});
