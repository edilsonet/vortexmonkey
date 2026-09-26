import { describe, expect, it } from "vitest";
import { assertUploadPolicy } from "./documents.policy.ts";

describe("assertUploadPolicy", () => {
  it("rejects personal data classified as PUBLIC", () => {
    expect(() =>
      assertUploadPolicy({
        mimeType: "text/markdown",
        sizeBytes: 10,
        classification: "PUBLIC",
        containsPersonalData: true,
      }),
    ).toThrow(/Dado pessoal/);
  });

  it("allows restricted personal data", () => {
    expect(() =>
      assertUploadPolicy({
        mimeType: "application/pdf",
        sizeBytes: 1024,
        classification: "RESTRICTED",
        containsPersonalData: true,
      }),
    ).not.toThrow();
  });

  it("rejects oversized files", () => {
    expect(() =>
      assertUploadPolicy({
        mimeType: "application/pdf",
        sizeBytes: 51 * 1024 * 1024,
        classification: "PRIVATE",
        containsPersonalData: false,
      }),
    ).toThrow(/50MB/);
  });
});
