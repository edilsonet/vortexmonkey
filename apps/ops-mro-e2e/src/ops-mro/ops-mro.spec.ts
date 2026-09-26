import axios from 'axios';
import { describe, expect, it } from 'vitest';

/**
 * Testes de integracao do `ops-mro` contra um servidor em execucao.
 *
 * Pre-requisitos: PostgreSQL + Redis no ar, `node tools/seed-dev.mjs` aplicado
 * e `nx serve ops-mro`. O seed define os vinculos usados nos testes de RLS.
 */
const TENANT = '11111111-1111-1111-1111-111111111111';
const COMPANY = '22222222-2222-2222-2222-222222222222';
const OWNER = '33333333-3333-3333-3333-333333333333';
const OUTSIDER = '44444444-4444-4444-4444-444444444444';
const EMPLOYEE = '55555555-5555-4555-8555-555555555555';
const FIXTURE_TENANT = '11111111-1111-1111-1111-111111111112';
const FIXTURE_COMPANY = '22222222-2222-2222-2222-222222222223';
const FIXTURE_OWNER = '33333333-3333-3333-3333-333333333334';

const context = (userId: string, tenantId: string, companyId: string) => ({
  headers: { 'x-user-id': userId, 'x-tenant-id': tenantId, 'x-company-id': companyId },
});

const DEV_PASSWORD = 'dev-password';
const idempotencyKey = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
// Sufixo unico por execucao: `Date.now()` de 4 chars colide entre execucoes e
// deixaria chaves de idempotencia presas no Redis (TTL 24h).
const uniqueSuffix = () =>
  `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

describe('ops-mro', () => {
  it('GET /api/health responde no envelope global', async () => {
    const res = await axios.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      success: true,
      data: { status: 'ok', service: 'ops-mro' },
      error: null,
    });
  });

  it('GET /api/health/bus expoe as metricas do outbox e da inbox', async () => {
    const res = await axios.get('/api/health/bus');
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.outbox.pending).toBeTypeOf('number');
    expect(res.data.data.outbox.abandoned).toBeTypeOf('number');
    expect(res.data.data.consumer.consumer).toBe('ops-mro');
    expect(res.data.data.consumer.dead).toBeTypeOf('number');
    expect(Array.isArray(res.data.data.alarms)).toBe(true);
  });

  it('re-drive exige Idempotency-Key', async () => {
    const res = await axios.post('/api/bus/redrive', {}, context(OWNER, TENANT, COMPANY));
    expect(res.status).toBe(409);
    expect(res.data.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('re-drive nega usuario sem papel de administracao', async () => {
    const res = await axios.post(
      '/api/bus/redrive',
      {},
      {
        ...context(OUTSIDER, TENANT, COMPANY),
        headers: {
          ...context(OUTSIDER, TENANT, COMPANY).headers,
          'idempotency-key': 'e2e-redrive-outsider-0001',
        },
      },
    );
    expect(res.status).toBe(403);
    expect(res.data.error.code).toBe('PERMISSION_DENIED');
  });

  it('re-drive de administrador responde com a lista (vazia sem abandonados)', async () => {
    const res = await axios.post(
      '/api/bus/redrive',
      {},
      {
        ...context(OWNER, TENANT, COMPANY),
        headers: {
          ...context(OWNER, TENANT, COMPANY).headers,
          'idempotency-key': idempotencyKey('e2e-redrive-owner'),
        },
      },
    );
    expect(res.status).toBe(201);
    expect(Array.isArray(res.data.data.redriven)).toBe(true);
  });

  it('POST /api/mro/utilization calcula dentro do envelope', async () => {
    const res = await axios.post('/api/mro/utilization', {
      readings: [
        { date: '2026-01-01', hobbs: 1000 },
        { date: '2026-02-01', hobbs: 1050 },
      ],
      today: '2026-03-01',
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.utilization.meter).toBe('hobbs');
  });

  it('rejeita escrita sem Idempotency-Key', async () => {
    const res = await axios.post(
      '/api/mro/aircraft',
      { registration: 'PP-ID1', model: 'C172', manufacturer: 'Cessna' },
      context(OWNER, TENANT, COMPANY),
    );
    expect(res.status).toBe(409);
    expect(res.data.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('rejeita corpo invalido com VALIDATION_ERROR', async () => {
    const res = await axios.post(
      '/api/mro/aircraft',
      { registration: 'X', model: '', manufacturer: 'Cessna', extra: true },
      { ...context(OWNER, TENANT, COMPANY), headers: { ...context(OWNER, TENANT, COMPANY).headers, 'idempotency-key': 'e2e-validation-0001' } },
    );
    expect(res.status).toBe(422);
    expect(res.data.error.code).toBe('VALIDATION_ERROR');
  });

  it('RLS: usuario sem vinculo nao ve aeronaves', async () => {
    const res = await axios.get('/api/mro/aircraft', context(OUTSIDER, TENANT, COMPANY));
    expect(res.status).toBe(200);
    expect(res.data.data).toEqual([]);
  });

  it('RLS: usuario sem vinculo de empresa nao escreve', async () => {
    const res = await axios.post(
      '/api/mro/aircraft',
      { registration: 'PP-NOP', model: 'C172', manufacturer: 'Cessna' },
      { ...context(OUTSIDER, TENANT, COMPANY), headers: { ...context(OUTSIDER, TENANT, COMPANY).headers, 'idempotency-key': 'e2e-outsider-0001' } },
    );
    expect(res.status).toBe(403);
    expect(res.data.error.code).toBe('PERMISSION_DENIED');
  });

  it('idempotencia: repetir a chave nao duplica a aeronave', async () => {
    const suffix = Date.now().toString(36).toUpperCase().slice(-3).padStart(3, '0');
    const body = { registration: `PP-${suffix}`, model: 'C172', manufacturer: 'Cessna' };
    const headers = { ...context(OWNER, TENANT, COMPANY).headers, 'idempotency-key': `e2e-aircraft-${suffix}` };

    const first = await axios.post('/api/mro/aircraft', body, { headers });
    const replay = await axios.post('/api/mro/aircraft', body, { headers });

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(replay.data.data.aircraft.id).toBe(first.data.data.aircraft.id);

    const list = await axios.get('/api/mro/aircraft', context(OWNER, TENANT, COMPANY));
    const matches = list.data.data.filter(
      (aircraft: { id: string }) => aircraft.id === first.data.data.aircraft.id,
    );
    expect(matches).toHaveLength(1);
  });

  it('verifica a cadeia do ledger (SHA-256 encadeado + Ed25519)', async () => {
    const res = await axios.get('/api/ledger/verify', context(FIXTURE_OWNER, FIXTURE_TENANT, FIXTURE_COMPANY));
    expect(res.status).toBe(200);
    expect(res.data.data.valid).toBe(true);
    expect(res.data.data.blocks).toBeGreaterThanOrEqual(1);
  });

  it('consolida total_hours monotonicamente e ignora leitura atrasada', async () => {
    const headers = context(OWNER, TENANT, COMPANY).headers;
    const suffix = Date.now().toString(36).toUpperCase().slice(-3).padStart(3, '0');
    const created = await axios.post(
      '/api/mro/aircraft',
      { registration: `PP-T${suffix}`, model: 'C172', manufacturer: 'Cessna', totalHours: 100 },
      { headers: { ...headers, 'idempotency-key': `e2e-totals-air-${suffix}` } },
    );
    const aircraftId = created.data.data.aircraft.id as string;

    await axios.post(
      `/api/mro/aircraft/${aircraftId}/meter-readings`,
      { readingDate: '2026-01-01', airframe: 250 },
      { headers: { ...headers, 'idempotency-key': `e2e-totals-r1-${suffix}` } },
    );
    // Leitura atrasada com valor MENOR nao pode regredir o total (GREATEST).
    await axios.post(
      `/api/mro/aircraft/${aircraftId}/meter-readings`,
      { readingDate: '2025-06-01', airframe: 180 },
      { headers: { ...headers, 'idempotency-key': `e2e-totals-r2-${suffix}` } },
    );

    const list = await axios.get('/api/mro/aircraft', context(OWNER, TENANT, COMPANY));
    const aircraft = list.data.data.find((item: { id: string }) => item.id === aircraftId);
    expect(aircraft.totalHours).toBe(250);
  });

  it('persiste reset de medidor e o usa na taxa de utilizacao', async () => {
    const headers = context(OWNER, TENANT, COMPANY).headers;
    const suffix = Date.now().toString(36).toUpperCase().slice(-3).padStart(3, '0');
    const created = await axios.post(
      '/api/mro/aircraft',
      { registration: `PP-R${suffix}`, model: 'C172', manufacturer: 'Cessna' },
      { headers: { ...headers, 'idempotency-key': `e2e-reset-air-${suffix}` } },
    );
    const aircraftId = created.data.data.aircraft.id as string;

    // Instrumento substituido por outro que comeca numa escala MAIOR: sem o
    // reset declarado o salto 200 -> 5000 seria lido como 4800 h voadas.
    const readings = [
      { readingDate: '2026-01-01', hobbs: 100 },
      { readingDate: '2026-03-01', hobbs: 200 },
      { readingDate: '2026-05-01', hobbs: 5000 },
      { readingDate: '2026-07-01', hobbs: 5100 },
    ];
    for (const [index, reading] of readings.entries()) {
      await axios.post(`/api/mro/aircraft/${aircraftId}/meter-readings`, reading, {
        headers: { ...headers, 'idempotency-key': `e2e-reset-r${index}-${suffix}` },
      });
    }

    const reset = await axios.post(
      `/api/mro/aircraft/${aircraftId}/meter-resets`,
      { meter: 'hobbs', resetDate: '2026-04-01' },
      { headers: { ...headers, 'idempotency-key': `e2e-reset-new-${suffix}` } },
    );
    expect(reset.status).toBe(201);

    const resets = await axios.get(
      `/api/mro/aircraft/${aircraftId}/meter-resets`,
      context(OWNER, TENANT, COMPANY),
    );
    expect(resets.data.data).toHaveLength(1);
    expect(resets.data.data[0].meter).toBe('hobbs');
    expect(resets.data.data[0].resetDate).toBe('2026-04-01');

    // Com o reset, o intervalo 03-01 -> 05-01 e descartado por inteiro:
    // (100 h em 59 d) + (100 h em 61 d) = ~1.7 h/dia. Sem o reset seria ~27.6.
    const assessed = await axios.get(
      `/api/mro/aircraft/${aircraftId}/compliance/assess`,
      context(OWNER, TENANT, COMPANY),
    );
    expect(assessed.status).toBe(200);
    expect(assessed.data.data.utilization.meter).toBe('hobbs');
    expect(assessed.data.data.utilization.hoursPerDay).toBeLessThan(2.5);
  });

  // -------------------------------------------------------------------------
  // Autenticacao (JWT)
  // -------------------------------------------------------------------------

  it('POST /api/auth/login emite token com o vinculo ativo', async () => {
    const res = await axios.post(
      '/api/auth/login',
      { email: 'dono@vortex.dev', password: DEV_PASSWORD },
      { headers: { 'idempotency-key': idempotencyKey('e2e-login-ok') } },
    );
    expect(res.status).toBe(200);
    expect(res.data.data.tokenType).toBe('Bearer');
    expect(typeof res.data.data.token).toBe('string');
    expect(res.data.data.context).toEqual({
      userId: OWNER,
      tenantId: TENANT,
      companyId: COMPANY,
    });
  });

  it('rejeita credenciais invalidas com AUTH_REQUIRED', async () => {
    const res = await axios.post(
      '/api/auth/login',
      { email: 'dono@vortex.dev', password: 'senha-errada' },
      { headers: { 'idempotency-key': idempotencyKey('e2e-login-bad') } },
    );
    expect(res.status).toBe(401);
    expect(res.data.error.code).toBe('AUTH_REQUIRED');
  });

  it('nega login de usuario sem vinculo em empresa (PERMISSION_DENIED)', async () => {
    const res = await axios.post(
      '/api/auth/login',
      { email: 'semvinculo@vortex.dev', password: DEV_PASSWORD },
      { headers: { 'idempotency-key': idempotencyKey('e2e-login-nolink') } },
    );
    expect(res.status).toBe(403);
    expect(res.data.error.code).toBe('PERMISSION_DENIED');
  });

  it('aceita Bearer token e resolve o contexto', async () => {
    const login = await axios.post(
      '/api/auth/login',
      { email: 'dono@vortex.dev', password: DEV_PASSWORD },
      { headers: { 'idempotency-key': idempotencyKey('e2e-login-me') } },
    );
    const token = login.data.data.token as string;
    const headers = { authorization: `Bearer ${token}` };

    const me = await axios.get('/api/auth/me', { headers });
    expect(me.status).toBe(200);
    expect(me.data.data.userId).toBe(OWNER);
    expect(me.data.data.tenantId).toBe(TENANT);

    const list = await axios.get('/api/mro/aircraft', { headers });
    expect(list.status).toBe(200);
    expect(Array.isArray(list.data.data)).toBe(true);
  });

  it('rejeita token adulterado e ausencia de contexto', async () => {
    const tampered = await axios.get('/api/mro/aircraft', {
      headers: { authorization: 'Bearer nao.e.um.token' },
    });
    expect(tampered.status).toBe(401);
    expect(tampered.data.error.code).toBe('AUTH_REQUIRED');

    const anonymous = await axios.get('/api/mro/aircraft');
    expect(anonymous.status).toBe(401);
    expect(anonymous.data.error.code).toBe('AUTH_REQUIRED');
  });

  // -------------------------------------------------------------------------
  // Refresh token com rotacao e deteccao de reuso
  // -------------------------------------------------------------------------

  const login = async () => {
    const res = await axios.post(
      '/api/auth/login',
      { email: 'dono@vortex.dev', password: DEV_PASSWORD },
      { headers: { 'idempotency-key': idempotencyKey('e2e-refresh-login') } },
    );
    return res.data.data as {
      token: string;
      refreshToken: string;
      refreshExpiresIn: number;
    };
  };

  it('login devolve refresh token e a rotacao troca o par de tokens', async () => {
    const session = await login();
    expect(typeof session.refreshToken).toBe('string');
    expect(session.refreshToken.length).toBeGreaterThanOrEqual(20);
    expect(session.refreshExpiresIn).toBeGreaterThan(0);

    const rotated = await axios.post(
      '/api/auth/refresh',
      { refreshToken: session.refreshToken },
      { headers: { 'idempotency-key': idempotencyKey('e2e-refresh-rotate') } },
    );
    expect(rotated.status).toBe(200);
    expect(rotated.data.data.refreshToken).not.toBe(session.refreshToken);

    const me = await axios.get('/api/auth/me', {
      headers: { authorization: `Bearer ${rotated.data.data.token}` },
    });
    expect(me.status).toBe(200);
    expect(me.data.data.userId).toBe(OWNER);
    expect(me.data.data.tenantId).toBe(TENANT);
  });

  it('reuso de refresh token revoga a familia inteira', async () => {
    const session = await login();
    const rotated = await axios.post(
      '/api/auth/refresh',
      { refreshToken: session.refreshToken },
      { headers: { 'idempotency-key': idempotencyKey('e2e-refresh-reuse-1') } },
    );
    const successor = rotated.data.data.refreshToken as string;

    const reuse = await axios.post(
      '/api/auth/refresh',
      { refreshToken: session.refreshToken },
      { headers: { 'idempotency-key': idempotencyKey('e2e-refresh-reuse-2') } },
    );
    expect(reuse.status).toBe(401);
    expect(reuse.data.error.code).toBe('AUTH_REQUIRED');

    const killed = await axios.post(
      '/api/auth/refresh',
      { refreshToken: successor },
      { headers: { 'idempotency-key': idempotencyKey('e2e-refresh-reuse-3') } },
    );
    expect(killed.status).toBe(401);
    expect(killed.data.error.code).toBe('AUTH_REQUIRED');
  });

  it('reuso de refresh token gera aviso in-app e e-mail ao dono', async () => {
    const session = await login();
    const rotated = await axios.post(
      '/api/auth/refresh',
      { refreshToken: session.refreshToken },
      { headers: { 'idempotency-key': idempotencyKey('e2e-reuse-notice-1') } },
    );
    expect(rotated.status).toBe(200);

    const reuse = await axios.post(
      '/api/auth/refresh',
      { refreshToken: session.refreshToken },
      { headers: { 'idempotency-key': idempotencyKey('e2e-reuse-notice-2') } },
    );
    expect(reuse.status).toBe(401);
    expect(reuse.data.error.code).toBe('AUTH_REQUIRED');

    const notices = await axios.get('/api/notifications', context(OWNER, TENANT, COMPANY));
    expect(notices.status).toBe(200);
    const notice = notices.data.data.notifications.find(
      (row: { code: string; severity: string }) => row.code === 'SESSION_REUSE_DETECTED',
    );
    expect(notice).toBeTruthy();
    expect(notice.severity).toBe('CRITICAL');
    expect(notice.readAt).toBeNull();

    // Outro usuario nao ve o aviso do dono (RLS por `user_id`).
    const other = await axios.get('/api/notifications', context(EMPLOYEE, TENANT, COMPANY));
    expect(other.data.data.notifications.map((row: { id: string }) => row.id)).not.toContain(
      notice.id,
    );

    const mail = await axios.get('/api/communication/mail', context(OWNER, TENANT, COMPANY));
    expect(
      mail.data.data.some(
        (row: { subject: string; toAddress: string }) =>
          row.subject.includes('sessao encerrada por seguranca') &&
          row.toAddress === 'dono@vortex.dev',
      ),
    ).toBe(true);

    const read = await axios.post(
      `/api/notifications/${notice.id}/read`,
      {},
      {
        headers: {
          ...context(OWNER, TENANT, COMPANY).headers,
          'idempotency-key': idempotencyKey('e2e-reuse-notice-read'),
        },
      },
    );
    expect(read.status).toBe(201);

    const after = await axios.get('/api/notifications', context(OWNER, TENANT, COMPANY));
    expect(
      after.data.data.notifications.find((row: { id: string }) => row.id === notice.id).readAt,
    ).not.toBeNull();
  });

  it('GET /api/notifications exige contexto (401)', async () => {
    const res = await axios.get('/api/notifications');
    expect(res.status).toBe(401);
    expect(res.data.error.code).toBe('AUTH_REQUIRED');
  });

  it('logout revoga a familia e o refresh posterior falha', async () => {
    const session = await login();
    const out = await axios.post(
      '/api/auth/logout',
      { refreshToken: session.refreshToken },
      { headers: { 'idempotency-key': idempotencyKey('e2e-logout') } },
    );
    expect(out.status).toBe(200);
    expect(out.data.data.revoked).toBeGreaterThanOrEqual(1);

    const after = await axios.post(
      '/api/auth/refresh',
      { refreshToken: session.refreshToken },
      { headers: { 'idempotency-key': idempotencyKey('e2e-logout-after') } },
    );
    expect(after.status).toBe(401);
    expect(after.data.error.code).toBe('AUTH_REQUIRED');
  });

  it('refresh exige Idempotency-Key e rejeita token desconhecido', async () => {
    const noKey = await axios.post('/api/auth/refresh', { refreshToken: 'x'.repeat(43) });
    expect(noKey.status).toBe(409);
    expect(noKey.data.error.code).toBe('IDEMPOTENCY_CONFLICT');

    const unknown = await axios.post(
      '/api/auth/refresh',
      { refreshToken: 'x'.repeat(43) },
      { headers: { 'idempotency-key': idempotencyKey('e2e-refresh-unknown') } },
    );
    expect(unknown.status).toBe(401);
    expect(unknown.data.error.code).toBe('AUTH_REQUIRED');
  });

  // -------------------------------------------------------------------------
  // Sessoes e senha: revogacao por evento
  // -------------------------------------------------------------------------

  const EMPLOYEE_EMAIL = 'mecanico.chat@vortex.dev';

  const loginAs = (email: string, password: string) =>
    axios.post(
      '/api/auth/login',
      { email, password },
      { headers: { 'idempotency-key': idempotencyKey('e2e-session-login') } },
    );

  const refreshWith = (refreshToken: string) =>
    axios.post(
      '/api/auth/refresh',
      { refreshToken },
      { headers: { 'idempotency-key': idempotencyKey('e2e-session-refresh') } },
    );

  it('revogar sessoes exige contexto', async () => {
    const res = await axios.post(
      '/api/auth/sessions/revoke',
      {},
      { headers: { 'idempotency-key': idempotencyKey('e2e-session-anon') } },
    );
    expect(res.status).toBe(401);
    expect(res.data.error.code).toBe('AUTH_REQUIRED');
  });

  it('logout-all encerra todas as familias do usuario', async () => {
    const first = await loginAs(EMPLOYEE_EMAIL, DEV_PASSWORD);
    const second = await loginAs(EMPLOYEE_EMAIL, DEV_PASSWORD);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const revoked = await axios.post(
      '/api/auth/sessions/revoke',
      {},
      {
        headers: {
          authorization: `Bearer ${first.data.data.token}`,
          'idempotency-key': idempotencyKey('e2e-session-revoke'),
        },
      },
    );
    expect(revoked.status).toBe(200);
    expect(revoked.data.data.revoked).toBeGreaterThanOrEqual(2);

    for (const session of [first, second]) {
      const after = await refreshWith(session.data.data.refreshToken);
      expect(after.status).toBe(401);
      expect(after.data.error.code).toBe('AUTH_REQUIRED');
    }
  });

  it('troca de senha confere a atual e revoga todas as sessoes', async () => {
    const tempPassword = `dev-pass-${uniqueSuffix()}`;
    const session = await loginAs(EMPLOYEE_EMAIL, DEV_PASSWORD);
    expect(session.status).toBe(200);
    const token = session.data.data.token as string;

    const wrong = await axios.post(
      '/api/auth/password',
      { currentPassword: 'senha-errada-123', newPassword: tempPassword },
      {
        headers: {
          authorization: `Bearer ${token}`,
          'idempotency-key': idempotencyKey('e2e-pwd-wrong'),
        },
      },
    );
    expect(wrong.status).toBe(422);
    expect(wrong.data.error.code).toBe('VALIDATION_ERROR');

    const changed = await axios.post(
      '/api/auth/password',
      { currentPassword: DEV_PASSWORD, newPassword: tempPassword },
      {
        headers: {
          authorization: `Bearer ${token}`,
          'idempotency-key': idempotencyKey('e2e-pwd-change'),
        },
      },
    );
    expect(changed.status).toBe(200);
    expect(changed.data.data.changed).toBe(true);

    // O trigger de credenciais derruba a sessao que fez a troca.
    const stale = await refreshWith(session.data.data.refreshToken);
    expect(stale.status).toBe(401);

    const oldLogin = await loginAs(EMPLOYEE_EMAIL, DEV_PASSWORD);
    expect(oldLogin.status).toBe(401);
    expect(oldLogin.data.error.code).toBe('AUTH_REQUIRED');

    const newLogin = await loginAs(EMPLOYEE_EMAIL, tempPassword);
    expect(newLogin.status).toBe(200);

    // Restaura a senha de desenvolvimento (e revoga a sessao recem-aberta).
    const restored = await axios.post(
      '/api/auth/password',
      { currentPassword: tempPassword, newPassword: DEV_PASSWORD },
      {
        headers: {
          authorization: `Bearer ${newLogin.data.data.token}`,
          'idempotency-key': idempotencyKey('e2e-pwd-restore'),
        },
      },
    );
    expect(restored.status).toBe(200);
  });

  it('lista as sessoes ativas e encerra apenas uma', async () => {
    const anon = await axios.get('/api/auth/sessions');
    expect(anon.status).toBe(401);
    expect(anon.data.error.code).toBe('AUTH_REQUIRED');

    const first = await loginAs(EMPLOYEE_EMAIL, DEV_PASSWORD);
    const second = await loginAs(EMPLOYEE_EMAIL, DEV_PASSWORD);
    const firstId = first.data.data.sessionId as string;
    const secondId = second.data.data.sessionId as string;
    expect(typeof firstId).toBe('string');
    expect(firstId).not.toBe(secondId);

    const headers = { authorization: `Bearer ${second.data.data.token}` };
    const list = await axios.get('/api/auth/sessions', { headers });
    expect(list.status).toBe(200);
    const ids = (list.data.data.sessions as { id: string }[]).map((row) => row.id);
    expect(ids).toContain(firstId);
    expect(ids).toContain(secondId);

    const entry = (list.data.data.sessions as { id: string; userAgent: string; createdAt: string }[]).find(
      (row) => row.id === firstId,
    );
    expect(typeof entry?.userAgent).toBe('string');
    expect(entry?.createdAt).toBeTruthy();

    const revoked = await axios.post(
      `/api/auth/sessions/${firstId}/revoke`,
      {},
      { headers: { ...headers, 'idempotency-key': idempotencyKey('e2e-session-one') } },
    );
    expect(revoked.status).toBe(200);
    expect(revoked.data.data.revoked).toBe(1);

    const after = await axios.get('/api/auth/sessions', { headers });
    const afterIds = (after.data.data.sessions as { id: string }[]).map((row) => row.id);
    expect(afterIds).not.toContain(firstId);
    expect(afterIds).toContain(secondId);

    const stale = await refreshWith(first.data.data.refreshToken);
    expect(stale.status).toBe(401);
    const alive = await refreshWith(second.data.data.refreshToken);
    expect(alive.status).toBe(200);

    // Limpa: encerra a segunda sessao.
    await axios.post(
      '/api/auth/sessions/revoke',
      {},
      {
        headers: {
          authorization: `Bearer ${alive.data.data.token}`,
          'idempotency-key': idempotencyKey('e2e-session-clean'),
        },
      },
    );
  });

  it('nao encerra a sessao de outro usuario', async () => {
    const owner = await loginAs('dono@vortex.dev', DEV_PASSWORD);
    const employee = await loginAs(EMPLOYEE_EMAIL, DEV_PASSWORD);

    // O empregado tenta revogar a sessao do dono: a posse e conferida no banco.
    const attempt = await axios.post(
      `/api/auth/sessions/${owner.data.data.sessionId}/revoke`,
      {},
      {
        headers: {
          authorization: `Bearer ${employee.data.data.token}`,
          'idempotency-key': idempotencyKey('e2e-session-cross'),
        },
      },
    );
    expect(attempt.status).toBe(200);
    expect(attempt.data.data.revoked).toBe(0);

    const ownerList = await axios.get('/api/auth/sessions', {
      headers: { authorization: `Bearer ${owner.data.data.token}` },
    });
    expect(
      (ownerList.data.data.sessions as { id: string }[]).map((row) => row.id),
    ).toContain(owner.data.data.sessionId);

    // Limpa as sessoes abertas por este teste.
    await axios.post(
      '/api/auth/sessions/revoke',
      {},
      {
        headers: {
          authorization: `Bearer ${owner.data.data.token}`,
          'idempotency-key': idempotencyKey('e2e-session-x-owner'),
        },
      },
    );
    await axios.post(
      '/api/auth/sessions/revoke',
      {},
      {
        headers: {
          authorization: `Bearer ${employee.data.data.token}`,
          'idempotency-key': idempotencyKey('e2e-session-x-employee'),
        },
      },
    );
  });

  // -------------------------------------------------------------------------
  // Protocolo AAAA-NNNNNN (Resolucao ANAC 520/2019)
  // -------------------------------------------------------------------------

  it('gera protocolo na execucao de conformidade e o permite consultar', async () => {
    const headers = context(OWNER, TENANT, COMPANY).headers;
    const suffix = Date.now().toString(36).toUpperCase().slice(-4).padStart(4, '0');
    const created = await axios.post(
      '/api/mro/aircraft',
      { registration: `PP-P${suffix}`, model: 'C172', manufacturer: 'Cessna', totalHours: 1000 },
      { headers: { ...headers, 'idempotency-key': `e2e-proto-air-${suffix}` } },
    );
    const aircraftId = created.data.data.aircraft.id as string;

    const item = await axios.post(
      `/api/mro/aircraft/${aircraftId}/compliance-items`,
      { kind: 'INSPECAO_100H', label: 'Inspecao 100h', intervalHours: 100, meter: 'airframe', lastDoneHours: 900 },
      { headers: { ...headers, 'idempotency-key': `e2e-proto-item-${suffix}` } },
    );
    const complianceItemId = item.data.data.item.id as string;

    const done = await axios.post(
      '/api/mro/compliance/done',
      { complianceItemId, doneDate: '2026-06-01', doneHours: 1000 },
      { headers: { ...headers, 'idempotency-key': `e2e-proto-done-${suffix}` } },
    );
    expect(done.status).toBe(201);
    const protocolNumber = done.data.data.protocolNumber as string;
    expect(protocolNumber).toMatch(/^\d{4}-\d{6}$/);
    expect(done.data.data.nextDue.hours).toBe(1100);

    const found = await axios.get(`/api/protocols/${protocolNumber}`, {
      headers: context(OWNER, TENANT, COMPANY).headers,
    });
    expect(found.status).toBe(200);
    expect(found.data.data.protocolNumber).toBe(protocolNumber);
    expect(found.data.data.entityId).toBe(complianceItemId);
    expect(found.data.data.ledgerBlockId).toBe(done.data.data.ledgerBlockId);

    // Usuario sem vinculo de empresa nao enxerga o protocolo do tenant (RLS).
    const foreign = await axios.get(`/api/protocols/${protocolNumber}`, {
      headers: context(OUTSIDER, TENANT, COMPANY).headers,
    });
    expect(foreign.status).toBe(404);
    expect(foreign.data.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/mro/alerts devolve os alertas correntes no envelope', async () => {
    const res = await axios.get('/api/mro/alerts', context(OWNER, TENANT, COMPANY));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data)).toBe(true);
  });

  it('RLS: usuario sem vinculo nao ve alertas', async () => {
    const res = await axios.get('/api/mro/alerts', context(OUTSIDER, TENANT, COMPANY));
    expect(res.status).toBe(200);
    expect(res.data.data).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Central de Comunicacao (chat, alertas, comunicados, e-mails)
  // -------------------------------------------------------------------------

  it('GET /api/communication/summary exige contexto (401)', async () => {
    const res = await axios.get('/api/communication/summary');
    expect(res.status).toBe(401);
    expect(res.data.error.code).toBe('AUTH_REQUIRED');
  });

  it('chat: conversa com dois usuarios gera e zera o nao lido', async () => {
    const ownerHeaders = context(OWNER, TENANT, COMPANY).headers;
    const employeeHeaders = context(EMPLOYEE, TENANT, COMPANY).headers;
    const suffix = uniqueSuffix();

    const created = await axios.post(
      '/api/communication/conversations',
      { topic: 'COMPANY', title: `Sala ${suffix}`, participantUserIds: [EMPLOYEE] },
      { headers: { ...ownerHeaders, 'idempotency-key': `e2e-chat-conv-${suffix}` } },
    );
    expect(created.status).toBe(201);
    const conversationId = created.data.data.conversation.id as string;
    expect(created.data.data.ledgerBlockId).toBeTruthy();
    expect(created.data.data.ledgerHash).toMatch(/^[0-9a-f]{64}$/);

    // O segundo participante envia; o dono passa a ter 1 nao lida.
    const posted = await axios.post(
      `/api/communication/conversations/${conversationId}/messages`,
      { body: 'Bom dia' },
      { headers: { ...employeeHeaders, 'idempotency-key': `e2e-chat-msg-${suffix}` } },
    );
    expect(posted.status).toBe(201);
    expect(posted.data.data.message.authorUserId).toBe(EMPLOYEE);

    const ownerList = await axios.get(
      '/api/communication/conversations',
      context(OWNER, TENANT, COMPANY),
    );
    const ownerConversation = ownerList.data.data.find(
      (row: { id: string }) => row.id === conversationId,
    );
    expect(ownerConversation.unreadCount).toBe(1);
    expect(ownerConversation.messageCount).toBe(1);
    expect(ownerConversation.lastMessagePreview).toBe('Bom dia');

    const read = await axios.post(
      `/api/communication/conversations/${conversationId}/read`,
      {},
      { headers: { ...ownerHeaders, 'idempotency-key': `e2e-chat-read-${suffix}` } },
    );
    expect(read.status).toBe(201);
    expect(read.data.data.conversationId).toBe(conversationId);

    const afterRead = await axios.get(
      '/api/communication/conversations',
      context(OWNER, TENANT, COMPANY),
    );
    expect(
      afterRead.data.data.find((row: { id: string }) => row.id === conversationId).unreadCount,
    ).toBe(0);

    // Quem nao participa nao ve a conversa (RLS).
    const outsiderList = await axios.get(
      '/api/communication/conversations',
      context(OUTSIDER, TENANT, COMPANY),
    );
    expect(outsiderList.data.data.map((row: { id: string }) => row.id)).not.toContain(
      conversationId,
    );
  });

  it('chat: repetir a Idempotency-Key nao duplica a conversa', async () => {
    const suffix = uniqueSuffix();
    const body = { topic: 'COMPANY', title: `Idem ${suffix}` };
    const headers = {
      ...context(OWNER, TENANT, COMPANY).headers,
      'idempotency-key': `e2e-chat-idem-${suffix}`,
    };

    const first = await axios.post('/api/communication/conversations', body, { headers });
    const replay = await axios.post('/api/communication/conversations', body, { headers });
    expect(replay.status).toBe(201);
    expect(replay.data.data.conversation.id).toBe(first.data.data.conversation.id);
  });

  it('comunicados: administrador publica, nao administrador recebe 403', async () => {
    const suffix = uniqueSuffix();

    const published = await axios.post(
      '/api/communication/announcements',
      { scope: 'TENANT', severity: 'WARNING', title: `Aviso ${suffix}`, body: 'Janela 22h.' },
      {
        headers: {
          ...context(OWNER, TENANT, COMPANY).headers,
          'idempotency-key': `e2e-news-${suffix}`,
        },
      },
    );
    expect(published.status).toBe(201);
    const announcementId = published.data.data.announcement.id as string;
    expect(published.data.data.announcement.read).toBe(false);

    const list = await axios.get(
      '/api/communication/announcements',
      context(OWNER, TENANT, COMPANY),
    );
    const found = list.data.data.find((row: { id: string }) => row.id === announcementId);
    expect(found.read).toBe(false);

    const read = await axios.post(
      `/api/communication/announcements/${announcementId}/read`,
      {},
      {
        headers: {
          ...context(OWNER, TENANT, COMPANY).headers,
          'idempotency-key': `e2e-news-read-${suffix}`,
        },
      },
    );
    expect(read.status).toBe(201);

    const afterRead = await axios.get(
      '/api/communication/announcements',
      context(OWNER, TENANT, COMPANY),
    );
    expect(
      afterRead.data.data.find((row: { id: string }) => row.id === announcementId).read,
    ).toBe(true);

    const denied = await axios.post(
      '/api/communication/announcements',
      { scope: 'TENANT', title: 'Sem permissao', body: 'x' },
      {
        headers: {
          ...context(OUTSIDER, TENANT, COMPANY).headers,
          'idempotency-key': `e2e-news-denied-${suffix}`,
        },
      },
    );
    expect(denied.status).toBe(403);
    expect(denied.data.error.code).toBe('PERMISSION_DENIED');
  });

  it('e-mails: enfileirar um transacional ancora no ledger e aparece na caixa', async () => {
    const suffix = uniqueSuffix();
    const queued = await axios.post(
      '/api/communication/mail',
      { toAddress: 'cliente@example.com', subject: `Protocolo ${suffix}`, body: 'Segue o protocolo.' },
      {
        headers: {
          ...context(OWNER, TENANT, COMPANY).headers,
          'idempotency-key': `e2e-mail-${suffix}`,
        },
      },
    );
    expect(queued.status).toBe(201);
    expect(queued.data.data.mail.direction).toBe('OUT');
    expect(queued.data.data.mail.status).toBe('QUEUED');
    expect(queued.data.data.ledgerBlockId).toBeTruthy();

    const list = await axios.get('/api/communication/mail', context(OWNER, TENANT, COMPANY));
    expect(list.data.data.map((row: { id: string }) => row.id)).toContain(
      queued.data.data.mail.id,
    );

    const outsiderList = await axios.get(
      '/api/communication/mail',
      context(OUTSIDER, TENANT, COMPANY),
    );
    expect(outsiderList.data.data.map((row: { id: string }) => row.id)).not.toContain(
      queued.data.data.mail.id,
    );
  });
});
