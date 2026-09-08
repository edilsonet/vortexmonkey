import { describe, expect, it } from "vitest";
import {
  assertCtacPedagogicalHours,
  assertExaminerActive,
  assertFstdUsable,
  assertGraduate,
  certificateDueDate,
  isS141Overdue,
  maxDurationMonths,
  theoryValidUntil,
} from "./training.policy.ts";

describe("training.policy", () => {
  it("S141 max duration is double the homologated period", () => {
    expect(maxDurationMonths(6)).toBe(12);
    expect(isS141Overdue(new Date("2025-01-01T00:00:00Z"), 6, new Date("2026-01-02T00:00:00Z"))).toBe(true);
    expect(isS141Overdue(new Date("2025-01-01T00:00:00Z"), 6, new Date("2025-12-01T00:00:00Z"))).toBe(false);
  });

  it("ground school theory valid 12 months", () => {
    expect(theoryValidUntil(new Date("2026-01-01T00:00:00Z")).toISOString().slice(0, 10)).toBe("2027-01-01");
  });

  it("certificate due in 10 calendar days", () => {
    expect(certificateDueDate(new Date("2026-09-08T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-09-18");
  });

  it("CTAC instructor requires 8 pedagogical hours", () => {
    expect(() => assertCtacPedagogicalHours("CTAC", 7)).toThrow(/8 horas/);
    expect(() => assertCtacPedagogicalHours("CTAC", 8)).not.toThrow();
    expect(() => assertCtacPedagogicalHours("CIAC", 0)).not.toThrow();
  });

  it("expired examiner blocks banca", () => {
    expect(() => assertExaminerActive("RECERTIFICACAO_VENCIDA")).toThrow(/examinador/i);
    expect(() => assertExaminerActive("ATIVO")).not.toThrow();
  });

  it("expired FSTD blocks sessions", () => {
    expect(() => assertFstdUsable("QUALIFICACAO_VENCIDA")).toThrow(/FSTD/);
    expect(() => assertFstdUsable("QUALIFICADO")).not.toThrow();
  });

  it("graduate blocked if theory expired or examiner inactive or S141 overdue", () => {
    const enrolled = new Date("2026-01-01T00:00:00Z");
    expect(() =>
      assertGraduate({
        enrollmentDate: enrolled,
        durationMonths: 6,
        now: new Date("2026-03-01T00:00:00Z"),
        theoryValidUntilDate: new Date("2025-12-01T00:00:00Z"),
        examinerActive: true,
      }),
    ).toThrow(/teorica/);
    expect(() =>
      assertGraduate({
        enrollmentDate: enrolled,
        durationMonths: 6,
        now: new Date("2027-02-01T00:00:00Z"),
        theoryValidUntilDate: new Date("2027-06-01T00:00:00Z"),
        examinerActive: true,
      }),
    ).toThrow(/periodo/);
    expect(() =>
      assertGraduate({
        enrollmentDate: enrolled,
        durationMonths: 6,
        now: new Date("2026-03-01T00:00:00Z"),
        theoryValidUntilDate: new Date("2027-01-01T00:00:00Z"),
        examinerActive: false,
      }),
    ).toThrow(/examinador/i);
    expect(() =>
      assertGraduate({
        enrollmentDate: enrolled,
        durationMonths: 6,
        now: new Date("2026-03-01T00:00:00Z"),
        theoryValidUntilDate: new Date("2027-01-01T00:00:00Z"),
        examinerActive: true,
      }),
    ).not.toThrow();
  });
});
