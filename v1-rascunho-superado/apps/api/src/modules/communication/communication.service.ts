import { Inject, Injectable, UnprocessableEntityException } from "@nestjs/common";
import type { RequestContext } from "@vortex/types";
import { DatabaseService } from "../../platform/database/database.service.ts";
import { LedgerService } from "../ledger/ledger.service.ts";
import {
  announcementRequiresBody,
  assertSameTenantChat,
  emailKind,
  PHASE_8_COMM_EVENTS,
} from "./communication.policy.ts";
import type { CreateAnnouncementDto, CreateMessageDto, CreateThreadDto } from "./communication.dto.ts";

@Injectable()
export class CommunicationService {
  public constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(LedgerService) private readonly ledger: LedgerService,
  ) {}

  public overview(ctx: RequestContext) {
    return this.db.withContext(ctx, async (client) => {
      const threads = await client.query(
        `SELECT t.id, t.title, t.kind, t.created_at,
                (SELECT count(*)::int FROM communication.messages m WHERE m.thread_id = t.id) AS messages
         FROM communication.threads t ORDER BY t.created_at DESC`,
      );
      const messages = await client.query(
        `SELECT m.id, m.thread_id, m.body, m.created_at, p.full_name
         FROM communication.messages m JOIN identity.people p ON p.id = m.author_id
         ORDER BY m.created_at DESC LIMIT 50`,
      );
      const emails = await client.query(
        `SELECT id, template, subject, kind, status, created_at FROM communication.emails ORDER BY created_at DESC LIMIT 50`,
      );
      const announcements = await client.query(
        `SELECT a.id, a.title, a.body, a.created_at, p.full_name
         FROM communication.announcements a JOIN identity.people p ON p.id = a.published_by
         ORDER BY a.created_at DESC LIMIT 50`,
      );
      return { threads: threads.rows, messages: messages.rows, emails: emails.rows, announcements: announcements.rows };
    });
  }

  public createThread(ctx: RequestContext, dto: CreateThreadDto) {
    this.requireTenant(ctx);
    assertSameTenantChat(ctx.tenantId, ctx.tenantId);
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO communication.threads(tenant_id, kind, title) VALUES ($1,$2,$3) RETURNING id`,
        [ctx.tenantId, dto.kind ?? "COMPANY", dto.title],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "CM_THREAD",
        entityId: id,
        actionType: PHASE_8_COMM_EVENTS.THREAD_CREATED,
        payload: dto,
      });
      await client.query("UPDATE communication.threads SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  public sendMessage(ctx: RequestContext, dto: CreateMessageDto) {
    this.requireTenant(ctx);
    if (!dto.body.trim()) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Mensagem vazia." });
    }
    return this.db.withContext(ctx, async (client) => {
      const thread = await client.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM communication.threads WHERE id = $1",
        [dto.threadId],
      );
      const t = thread.rows[0];
      if (!t) {
        throw new UnprocessableEntityException({ code: "NOT_FOUND", message: "Conversa nao encontrada." });
      }
      try {
        assertSameTenantChat(ctx.tenantId, t.tenant_id);
      } catch (error) {
        throw new UnprocessableEntityException({
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Chat bloqueado.",
        });
      }
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO communication.messages(tenant_id, thread_id, author_id, body) VALUES ($1,$2,$3,$4) RETURNING id`,
        [ctx.tenantId, dto.threadId, ctx.personId, dto.body],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "CM_MESSAGE",
        entityId: id,
        actionType: PHASE_8_COMM_EVENTS.MESSAGE_SENT,
        payload: dto,
      });
      await client.query("UPDATE communication.messages SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  public announce(ctx: RequestContext, dto: CreateAnnouncementDto) {
    this.requireTenant(ctx);
    try {
      announcementRequiresBody(dto.title, dto.body);
    } catch (error) {
      throw new UnprocessableEntityException({
        code: "VALIDATION_ERROR",
        message: error instanceof Error ? error.message : "Comunicado invalido.",
      });
    }
    return this.db.withContext(ctx, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO communication.announcements(tenant_id, title, body, published_by) VALUES ($1,$2,$3,$4) RETURNING id`,
        [ctx.tenantId, dto.title, dto.body, ctx.personId],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "CM_ANNOUNCEMENT",
        entityId: id,
        actionType: PHASE_8_COMM_EVENTS.ANNOUNCEMENT_PUBLISHED,
        payload: dto,
      });
      await client.query("UPDATE communication.announcements SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id };
    });
  }

  public queueEmail(
    ctx: RequestContext,
    input: { template: string; subject: string; body: string; personId?: string },
  ) {
    return this.db.withContext(ctx, async (client) => {
      const kind = emailKind(input.template);
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO communication.emails(tenant_id, person_id, template, subject, body, kind, status)
         VALUES ($1,$2,$3,$4,$5,$6,'QUEUED') RETURNING id`,
        [ctx.tenantId, input.personId ?? ctx.personId, input.template, input.subject, input.body, kind],
      );
      const id = inserted.rows[0]!.id;
      const block = await this.ledger.append(client, ctx, {
        entityType: "CM_EMAIL",
        entityId: id,
        actionType: PHASE_8_COMM_EVENTS.EMAIL_QUEUED,
        payload: input,
      });
      await client.query("UPDATE communication.emails SET ledger_block_id = $2 WHERE id = $1", [id, block.id]);
      return { id, kind, status: "QUEUED" };
    });
  }

  private requireTenant(ctx: RequestContext): void {
    if (!ctx.tenantId) {
      throw new UnprocessableEntityException({ code: "VALIDATION_ERROR", message: "Tenant ausente." });
    }
  }
}
