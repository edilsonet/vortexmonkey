import { describe, expect, it } from "vitest";
import { assertSameTenantChat, announcementRequiresBody, emailKind } from "./communication.policy.ts";

describe("communication.policy", () => {
  it("chat only between same tenant", () => {
    expect(() => assertSameTenantChat("t1", "t2")).toThrow(/tenant/);
    expect(() => assertSameTenantChat("t1", "t1")).not.toThrow();
  });

  it("comunicado requires title and body", () => {
    expect(() => announcementRequiresBody("", "x")).toThrow(/titulo/);
    expect(() => announcementRequiresBody("Aviso", "")).toThrow(/corpo/);
    expect(() => announcementRequiresBody("Aviso", "Texto")).not.toThrow();
  });

  it("password reset email is transactional", () => {
    expect(emailKind("PASSWORD_RESET")).toBe("TRANSACTIONAL");
    expect(emailKind("ANNOUNCEMENT")).toBe("OFFICIAL");
  });
});
