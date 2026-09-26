// Nucleo compartilhado do frontend VORTEX (libs/core).
//
// Contem acesso a API (envelope + erro normalizado), sessao em signals,
// interceptor de credencial/idempotencia, guards, tema e servicos de dominio.
// Nao contem componente visual: isso e o `@vortex/ui`.

export * from './lib/config';
export * from './lib/core.providers';

export * from './lib/api/api-client.service';
export * from './lib/api/api-error';

export * from './lib/auth/auth.guard';
export * from './lib/auth/auth.interceptor';
export * from './lib/auth/auth.service';
export * from './lib/auth/session.store';

export * from './lib/audit/audit.service';
export * from './lib/communication/communication.store';
export * from './lib/communication/communication.service';
export * from './lib/notifications/notification.service';
export * from './lib/mro/mro.service';
export * from './lib/theme/theme.service';
