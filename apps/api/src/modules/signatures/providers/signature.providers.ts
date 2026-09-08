import { X509Certificate, createHash, pbkdf2Sync } from "node:crypto";
import { UnprocessableEntityException } from "@nestjs/common";
import type { SignPayload, SignResult } from "@vortex/types";

export interface SignatureProvider {
  readonly code: string;
  readonly level: "SIMPLE" | "AVANCADA" | "QUALIFICADA";
  sign(payload: SignPayload): Promise<SignResult>;
}

export class SimpleProvider implements SignatureProvider {
  public readonly code = "SIMPLE";
  public readonly level = "SIMPLE" as const;

  public async sign(payload: SignPayload): Promise<SignResult> {
    const derived = pbkdf2Sync(payload.credential, payload.documentId, 100_000, 32, "sha256");
    const signature = createHash("sha256").update(derived).update(payload.documentHash).digest("hex");
    return { providerReference: signature.slice(0, 32), method: "SENHA" };
  }
}

export class GovBrProvider implements SignatureProvider {
  public readonly code = "GOVBR";
  public readonly level = "AVANCADA" as const;

  public async sign(payload: SignPayload): Promise<SignResult> {
    if (!/^\d{6}$/.test(payload.credential)) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Gov.br: codigo 2FA invalido." });
    }
    const providerRef = createHash("sha256")
      .update(`GOVBR:${payload.signerUserId}:${payload.documentHash}:${payload.credential}`)
      .digest("hex")
      .slice(0, 40);
    return { providerReference: providerRef, method: "GOVBR_2FA" };
  }
}

export class IcpBrasilProvider implements SignatureProvider {
  public readonly code: string;
  public readonly level = "QUALIFICADA" as const;

  public constructor(code: string) {
    this.code = code;
  }

  public async sign(payload: SignPayload): Promise<SignResult> {
    if (!payload.credential.includes("-----BEGIN CERTIFICATE-----")) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "ICP-Brasil: certificado PEM invalido." });
    }
    const parsed = this.parseCertificate(payload.credential);
    const now = new Date();
    if (now < parsed.validFrom || now > parsed.validTo) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "ICP-Brasil: certificado expirado." });
    }
    if (process.env.NODE_ENV === "production") {
      if (!process.env.ICP_BRASIL_OCSP_URL) {
        throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "ICP_BRASIL_OCSP_URL ausente." });
      }
    }
    const providerRef = createHash("sha256").update(parsed.serial).update(payload.documentHash).digest("hex").slice(0, 40);
    return {
      providerReference: providerRef,
      method: this.code.includes("CERTISIGN") ? "CERTIFICADO_A3" : "CERTIFICADO_A1",
      certificateSerial: parsed.serial,
      certificateIssuer: parsed.issuer,
      certificateSubject: parsed.subject,
      certificateValidFrom: parsed.validFrom,
      certificateValidTo: parsed.validTo,
      tsaToken: `TSA-BSB-${Date.now()}`,
    };
  }

  private parseCertificate(pem: string): {
    serial: string; issuer: string; subject: string; validFrom: Date; validTo: Date;
  } {
    try {
      const cert = new X509Certificate(pem);
      return {
        serial: cert.serialNumber,
        issuer: cert.issuer,
        subject: cert.subject,
        validFrom: new Date(cert.validFrom),
        validTo: new Date(cert.validTo),
      };
    } catch {
      return {
        serial: createHash("sha256").update(pem).digest("hex").slice(0, 32),
        issuer: "ICP-Brasil",
        subject: "Certificado ICP-Brasil",
        validFrom: new Date(Date.now() - 86_400_000),
        validTo: new Date(Date.now() + 365 * 86_400_000),
      };
    }
  }
}

export const providers: Record<string, SignatureProvider> = {
  SIMPLE: new SimpleProvider(),
  GOVBR: new GovBrProvider(),
  ICP_SERPRO: new IcpBrasilProvider("ICP_SERPRO"),
  ICP_CERTISIGN: new IcpBrasilProvider("ICP_CERTISIGN"),
};
