const ALLOWED = new Set(["text/markdown", "application/xml", "text/xml", "application/pdf", "image/jpeg", "image/png"]);

export function assertUploadPolicy(input: {
  mimeType: string;
  sizeBytes: number;
  classification: string;
  containsPersonalData: boolean;
}): void {
  if (input.containsPersonalData && input.classification === "PUBLIC") {
    throw new Error("Dado pessoal nao pode ser PUBLIC.");
  }
  if (!ALLOWED.has(input.mimeType)) {
    throw new Error("Tipo de arquivo nao permitido.");
  }
  if (input.sizeBytes > 50 * 1024 * 1024) {
    throw new Error("Arquivo excede 50MB.");
  }
}
