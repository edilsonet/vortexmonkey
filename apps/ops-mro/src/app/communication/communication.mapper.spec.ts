import { describe, expect, it } from 'vitest';
import {
  toAnnouncementRecord,
  toConversationRecord,
  toIsoOrNull,
  toMailRecord,
  toMessageRecord,
  type AnnouncementRow,
  type ConversationRow,
  type MailRow,
  type MessageRow,
} from './communication.mapper';

const AT = new Date('2026-09-25T12:00:00.000Z');

describe('toConversationRecord', () => {
  it('normaliza contadores e a previa da ultima mensagem', () => {
    const row: ConversationRow = {
      id: 'c1',
      company_id: 'k1',
      topic: 'COMPANY',
      title: 'Manutencao',
      status: 'OPEN',
      unread_count: 3,
      message_count: 7,
      last_message_at: AT,
      last_message_preview: 'OS 123 aberta',
      created_at: AT,
      updated_at: AT,
    };
    expect(toConversationRecord(row)).toEqual({
      id: 'c1',
      companyId: 'k1',
      topic: 'COMPANY',
      title: 'Manutencao',
      status: 'OPEN',
      unreadCount: 3,
      messageCount: 7,
      lastMessageAt: '2026-09-25T12:00:00.000Z',
      lastMessagePreview: 'OS 123 aberta',
      createdAt: '2026-09-25T12:00:00.000Z',
      updatedAt: '2026-09-25T12:00:00.000Z',
    });
  });

  it('aceita conversa de escopo tenant (company nulo e sem mensagens)', () => {
    const row: ConversationRow = {
      id: 'c2',
      company_id: null,
      topic: 'RECRUITMENT',
      title: 'Vaga de mecanico',
      status: 'OPEN',
      unread_count: 0,
      message_count: 0,
      last_message_at: null,
      last_message_preview: null,
      created_at: AT,
      updated_at: AT,
    };
    const record = toConversationRecord(row);
    expect(record.companyId).toBeNull();
    expect(record.lastMessageAt).toBeNull();
    expect(record.lastMessagePreview).toBeNull();
  });
});

describe('toMessageRecord', () => {
  it('mantem autor nulo quando o usuario nao e visivel no vinculo', () => {
    const row: MessageRow = {
      id: 'm1',
      conversation_id: 'c1',
      author_user_id: 'u1',
      author_name: null,
      body: 'ola',
      created_at: AT,
    };
    expect(toMessageRecord(row)).toEqual({
      id: 'm1',
      conversationId: 'c1',
      authorUserId: 'u1',
      authorName: null,
      body: 'ola',
      createdAt: '2026-09-25T12:00:00.000Z',
    });
  });
});

describe('toAnnouncementRecord', () => {
  it('preserva o nulo de validade e o sinal de lido', () => {
    const row: AnnouncementRow = {
      id: 'a1',
      company_id: null,
      scope: 'PLATFORM',
      severity: 'WARNING',
      title: 'Janela de manutencao',
      body: 'Plataforma indisponivel',
      published_by: 'u1',
      published_at: AT,
      expires_at: null,
      read: false,
    };
    expect(toAnnouncementRecord(row)).toMatchObject({
      scope: 'PLATFORM',
      severity: 'WARNING',
      expiresAt: null,
      read: false,
    });
  });
});

describe('toMailRecord', () => {
  it('preserva readAt nulo para e-mail nao lido', () => {
    const row: MailRow = {
      id: 'e1',
      company_id: 'k1',
      direction: 'IN',
      from_address: 'anac@gov.br',
      to_address: 'dono@vortex.dev',
      subject: 'Protocolo',
      body: 'Recebido',
      status: 'RECEIVED',
      related_entity_type: null,
      related_entity_id: null,
      read_at: null,
      created_at: AT,
    };
    const record = toMailRecord(row);
    expect(record.readAt).toBeNull();
    expect(record.direction).toBe('IN');
    expect(record.createdAt).toBe('2026-09-25T12:00:00.000Z');
  });
});

describe('toIsoOrNull', () => {
  it('devolve nulo sem valor e ISO com valor', () => {
    expect(toIsoOrNull(null)).toBeNull();
    expect(toIsoOrNull(AT)).toBe('2026-09-25T12:00:00.000Z');
  });
});
