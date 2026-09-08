export type EmailKind = "TRANSACTIONAL" | "OFFICIAL";

export function assertSameTenantChat(a: string | null | undefined, b: string | null | undefined): void {
  if (!a || !b || a !== b) throw new Error("Chat so entre usuarios do mesmo tenant.");
}

export function announcementRequiresBody(title: string, body: string): void {
  if (!title.trim()) throw new Error("Comunicado exige titulo.");
  if (!body.trim()) throw new Error("Comunicado exige corpo.");
}

export function emailKind(template: string): EmailKind {
  if (template === "ANNOUNCEMENT") return "OFFICIAL";
  return "TRANSACTIONAL";
}

export const PHASE_8_COMM_EVENTS = {
  THREAD_CREATED: "THREAD_CREATED",
  MESSAGE_SENT: "MESSAGE_SENT",
  ANNOUNCEMENT_PUBLISHED: "ANNOUNCEMENT_PUBLISHED",
  EMAIL_QUEUED: "EMAIL_QUEUED",
} as const;
