// Shell compartilhada do VORTEX (libs/shell).
//
// O chrome (barra superior com a Central de Comunicacao, contexto do vinculo,
// tema e rodape com a prova regulatoria do ledger) e a tela de acesso. Vive
// aqui, e nao em cada app, porque o quadro tem de ser identico no host e nos
// MFEs federados por subdominio.

export * from './lib/communication-center';
export * from './lib/login-page';
export * from './lib/session-panel';
export * from './lib/vortex-shell';
