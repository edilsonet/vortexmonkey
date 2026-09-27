import { describe, expect, it } from 'vitest';
import type { RequestContext } from '@vortex/shared-dto';
import { CommunicationGateway } from './communication.gateway';
import type { CommunicationRepository } from './communication.repository';
import type { JwtService } from '../platform/auth/jwt.service';

type ClientArg = Parameters<CommunicationGateway['handleConnection']>[0];

const CONTEXT: RequestContext = { userId: 'user-1', tenantId: 'tenant-1', companyId: 'company-1' };

function socketFixture(token?: string) {
  const joined: string[] = [];
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const client = {
    id: 'socket-1',
    data: {} as { context?: RequestContext },
    handshake: { auth: token === undefined ? {} : { token }, headers: {} },
    disconnected: false,
    join(room: string): Promise<void> {
      joined.push(room);
      return Promise.resolve();
    },
    leave(room: string): Promise<void> {
      const index = joined.indexOf(room);
      if (index >= 0) joined.splice(index, 1);
      return Promise.resolve();
    },
    emit(event: string, payload: unknown): void {
      emitted.push({ event, payload });
    },
    disconnect(): void {
      client.disconnected = true;
    },
  };
  return { client: client as unknown as ClientArg, joined, emitted, raw: client };
}

function gatewayFixture(options: { valid: boolean; participant?: boolean }) {
  const rooms: Array<{ room: string; event: string; payload: unknown }> = [];
  const jwt = {
    verify() {
      if (!options.valid) throw new Error('token invalido');
      return { sub: CONTEXT.userId, tid: CONTEXT.tenantId, cid: CONTEXT.companyId };
    },
  } as unknown as JwtService;
  const repository = {
    summary: () => Promise.resolve({ counters: { chat: 1, alerts: 0, mail: 0, news: 0, notices: 0 }, generatedAt: '' }),
    isParticipant: () => Promise.resolve(options.participant ?? false),
    participantUserIds: () => Promise.resolve([CONTEXT.userId]),
  } as unknown as CommunicationRepository;
  const server = {
    to(room: string) {
      const target = {
        except: () => target,
        emit: (event: string, payload: unknown) => rooms.push({ room, event, payload }),
      };
      return target;
    },
  };
  const gateway = new CommunicationGateway(jwt, repository);
  (gateway as unknown as { server: unknown }).server = server;
  return { gateway, rooms };
}

describe('CommunicationGateway', () => {
  it('desconecta o handshake sem token', () => {
    const { gateway } = gatewayFixture({ valid: true });
    const socket = socketFixture();
    gateway.handleConnection(socket.client);
    expect(socket.raw.disconnected).toBe(true);
    expect(socket.joined).toEqual([]);
  });

  it('desconecta o handshake com token invalido', () => {
    const { gateway } = gatewayFixture({ valid: false });
    const socket = socketFixture('token-ruim');
    gateway.handleConnection(socket.client);
    expect(socket.raw.disconnected).toBe(true);
  });

  it('entra nas salas do contexto e recebe o resumo inicial', async () => {
    const { gateway } = gatewayFixture({ valid: true });
    const socket = socketFixture('token-bom');
    gateway.handleConnection(socket.client);
    await Promise.resolve();
    expect(socket.joined).toEqual(['user:user-1', 'tenant:tenant-1', 'company:company-1']);
    expect(socket.raw.data.context).toEqual(CONTEXT);
    expect(socket.emitted[0]?.event).toBe('communication:summary');
  });

  it('nega a entrada na sala de conversa sem vinculo', async () => {
    const { gateway } = gatewayFixture({ valid: true, participant: false });
    const socket = socketFixture('token-bom');
    gateway.handleConnection(socket.client);
    const result = await gateway.subscribe(socket.client, 'conv-9');
    expect(result).toEqual({ conversationId: 'conv-9', subscribed: false, error: 'NOT_FOUND' });
    expect(socket.joined).not.toContain('conversation:conv-9');
  });

  it('entra na sala quando o RLS confirma o vinculo', async () => {
    const { gateway } = gatewayFixture({ valid: true, participant: true });
    const socket = socketFixture('token-bom');
    gateway.handleConnection(socket.client);
    const result = await gateway.subscribe(socket.client, 'conv-9');
    expect(result).toEqual({ conversationId: 'conv-9', subscribed: true });
    expect(socket.joined).toContain('conversation:conv-9');
  });

  it('empurra a mensagem para os participantes e para a sala da conversa', () => {
    const { gateway, rooms } = gatewayFixture({ valid: true });
    gateway.emitMessage(['user-1', 'user-2'], {
      id: 'm-1',
      conversationId: 'conv-9',
      authorUserId: 'user-1',
      authorName: 'A',
      body: 'ola',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(rooms.map((entry) => entry.room)).toEqual([
      'conversation:conv-9',
      'user:user-1',
      'user:user-2',
    ]);
    expect(rooms.every((entry) => entry.event === 'communication:message')).toBe(true);
  });
});
