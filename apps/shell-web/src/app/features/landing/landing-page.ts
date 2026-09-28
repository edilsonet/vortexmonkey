import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '@vortex/core';

/**
 * Landing public do VORTEX — referencia visual do ngx-admin Cosmic.
 *
 * Hero escuro com gradiente radial + glass, secoes de modulos em grid,
 * timeline do ledger e ancora regulatoria. Toda a pagina e publica: o CTA
 * leva ao `/entrar` (guest) ou `/app` (autenticado). Nao usa `@vortex/shell`
 * — e a vitrine antes do chrome autenticado.
 */
@Component({
  selector: 'vx-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="landing">
      <!-- NAV -->
      <header class="nav">
        <a class="nav__brand" routerLink="/">
          <span class="nav__mark">VX</span>
          <span class="nav__brandText">
            <strong>VORTEX</strong>
            <small>ECOSSISTEMA ANAC</small>
          </span>
        </a>
        <nav class="nav__links" aria-label="Secoes">
          <a href="#modulos">Módulos</a>
          <a href="#ledger">Ledger</a>
          <a href="#normas">Normas</a>
        </nav>
        <div class="nav__actions">
          <a class="nav__ghost" routerLink="/entrar">Entrar</a>
          <a class="nav__cta" [routerLink]="ctaLink()">{{ ctaLabel() }}</a>
        </div>
      </header>

      <!-- HERO -->
      <section class="hero">
        <div class="hero__glow" aria-hidden="true"></div>
        <div class="hero__inner">
          <div class="hero__copy">
            <p class="hero__eyebrow">Inspirado no ngx-admin · Tema Cosmic · Angular 20 + NestJS</p>
            <h1 class="hero__title">
              Conformidade que
              <span class="hero__acc">não apaga</span><br />
              Governança que voa.
            </h1>
            <p class="hero__sub">
              A plataforma VORTEX unifica manutenção (RBAC 43/145), operações
              (91/121/135/137), formação (141/142) e aeródromos (153) num
              <strong>ledger imutável</strong> com protocolo eletrônico e acesso auditado.
              Um shell, 13 apps, um só vínculo.
            </p>
            <div class="hero__ctas">
              <a class="btn btn--primary" [routerLink]="ctaLink()">
                {{ ctaLabel() }} — 30s
                <span class="btn__arrow">→</span>
              </a>
              <a class="btn btn--ghost" href="#modulos">Ver módulos</a>
            </div>
            <div class="hero__trust">
              <span class="hero__trustLabel">Resoluções ANAC</span>
              <span class="chip">458/2017</span>
              <span class="chip">520/2019</span>
              <span class="chip">Lei 14.063</span>
              <span class="chip chip--ok">Ledger SHA-256 · Ed25519</span>
            </div>
          </div>

          <div class="hero__panel" aria-hidden="true">
            <div class="panel__top">
              <span class="panel__dot panel__dot--r"></span>
              <span class="panel__dot panel__dot--y"></span>
              <span class="panel__dot panel__dot--g"></span>
              <span class="panel__title">ops-mro · conformity/assess</span>
              <span class="panel__live">● ledger íntegro</span>
            </div>
            <div class="panel__body">
              <div class="panel__row">
                <span class="panel__k">PP-ABC · C172</span>
                <span class="panel__badge panel__badge--crit">VENCIDO</span>
              </div>
              <div class="panel__meter">
                <div class="panel__meterBar">
                  <span class="panel__meterFill" style="width: 86%"></span>
                </div>
                <span class="panel__meterLabel">1150 h / 1300 h · 150 h restantes · 18 dias @ 8,3 h/dia</span>
              </div>
              <div class="panel__grid">
                <div class="mini">
                  <span class="mini__label">Protocolo</span>
                  <span class="mini__value">2026-000042</span>
                </div>
                <div class="mini">
                  <span class="mini__label">Bloco</span>
                  <span class="mini__value">a3f9…9c1e</span>
                </div>
                <div class="mini">
                  <span class="mini__label">Assinatura</span>
                  <span class="mini__value">Ed25519 ✓</span>
                </div>
                <div class="mini">
                  <span class="mini__label">RLS</span>
                  <span class="mini__value">tenant+empresa</span>
                </div>
              </div>
              <div class="panel__foot">
                <span class="panel__hash">hash: 7f1a…d4e9 — encadeado</span>
                <span class="panel__protocol">Idempotency-Key: 550e…</span>
              </div>
            </div>
          </div>
        </div>

        <!-- stats strip -->
        <div class="stats">
          <div class="stat">
            <span class="stat__n">1 370+</span>
            <span class="stat__l">requisitos rastreáveis</span>
          </div>
          <div class="stat">
            <span class="stat__n">13</span>
            <span class="stat__l">apps federados</span>
          </div>
          <div class="stat">
            <span class="stat__n">∞</span>
            <span class="stat__l">blocos, zero UPDATE</span>
          </div>
          <div class="stat">
            <span class="stat__n">ANAC</span>
            <span class="stat__l">vocabulário oficial PT-BR</span>
          </div>
        </div>
      </section>

      <!-- FEATURES -->
      <section class="features">
        <div class="sectionHead">
          <p class="eyebrow">Por que o VORTEX existe</p>
          <h2>Hangar, pista e sala de aula no mesmo registro.</h2>
          <p class="muted">Cada escrita passa por permissão → ledger → protocolo → evento. Sem atalho. Sem UPDATE.</p>
        </div>
        <div class="featGrid">
          <article class="feat">
            <span class="feat__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 12h18M12 3v18"/><circle cx="12" cy="12" r="5"/><path d="M8 8l8 8M16 8l-8 8"/></svg>
            </span>
            <h3>Erros viram protocolo</h3>
            <p>Fallback nunca silencioso: “cache stale” leva a alerta + tabela de correção, não a continuar.</p>
            <span class="feat__meta">RBAC 43/145 · IS 43.9-004A</span>
          </article>
          <article class="feat">
            <span class="feat__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3l7 4v5c0 4-3 7-7 8-4-1-7-4-7-8V7z"/><path d="M9 12l2 2 4-4"/></svg>
            </span>
            <h3>Ledger é lei</h3>
            <p>SHA-256 encadeado + Ed25519. Payload AES-256-GCM. Acesso por concessão auditada (zero-trust).</p>
            <span class="feat__meta">Res. 458/2017 · SHA-256</span>
          </article>
          <article class="feat">
            <span class="feat__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 7V5a5 5 0 0110 0v2"/><circle cx="12" cy="12" r="1.6"/></svg>
            </span>
            <h3>Multi-tenant de verdade</h3>
            <p>RLS por linha: <code>tenant_id</code> e <code>company_id</code>. Tenant é contexto, nunca dono.</p>
            <span class="feat__meta">PostgreSQL 16 · RLS</span>
          </article>
          <article class="feat">
            <span class="feat__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></svg>
            </span>
            <h3>Module Federation</h3>
            <p>Um chrome, subdomínios independentes. <code>mro.vortex.com</code> publica sem recompilar o host.</p>
            <span class="feat__meta">Nx · Webpack 5</span>
          </article>
        </div>
      </section>

      <!-- MODULOS -->
      <section id="modulos" class="modules">
        <div class="sectionHead">
          <p class="eyebrow">13 aplicativos · 1 plataforma</p>
          <h2>O hangar inteiro, em módulos.</h2>
        </div>
        <div class="modGrid">
          <a class="mod mod--live" [routerLink]="ctaLink()">
            <span class="mod__scope">43/145</span>
            <h3>ERP Manutenção</h3>
            <p>Biblioteca técnica, OS 12 etapas, estoque, BPS e CRS — com leitura canônica e reset de medidor.</p>
            <span class="mod__go">Abrir no dashboard →</span>
          </a>
          <div class="mod mod--soon">
            <span class="mod__scope">91/121/135/137</span>
            <h3>ERP Operadores</h3>
            <p>Despacho, diário técnico, MEL/DA e diário de bordo por aeronave.</p>
            <span class="mod__badge">em construção</span>
          </div>
          <div class="mod mod--soon">
            <span class="mod__scope">141/142</span>
            <h3>ERP Cursos</h3>
            <p>Catálogo, turmas, FSTD e certificados vinculados à RLoja.</p>
            <span class="mod__badge">em construção</span>
          </div>
          <div class="mod mod--soon">
            <span class="mod__scope">153</span>
            <h3>ERP Aeródromos</h3>
            <p>Pista, RWYCC, SESCINC, fauna/SIGRA e SGSO.</p>
            <span class="mod__badge">em construção</span>
          </div>
          <a class="mod mod--soon mod--ghost" routerLink="/entrar">
            <span class="mod__scope">market</span>
            <h3>RLoja</h3>
            <p>Marketplace aeronáutico com catálogo central e logística.</p>
            <span class="mod__badge">planejado</span>
          </a>
          <a class="mod mod--soon mod--ghost" routerLink="/entrar">
            <span class="mod__scope">portal</span>
            <h3>Núcleo + Rconta</h3>
            <p>Cadastro central, ledger e perfil do operador.</p>
            <span class="mod__badge">planejado</span>
          </a>
        </div>
      </section>

      <!-- LEDGER TIMELINE -->
      <section id="ledger" class="ledger">
        <div class="ledger__head">
          <p class="eyebrow">Prova, não promessa</p>
          <h2>Tudo que importa deixa rastro.</h2>
          <p class="muted">Trigger bloqueia <code>UPDATE</code> e <code>DELETE</code>. Cada mutação ancora bloco na mesma transação.</p>
        </div>
        <div class="timeline">
          <div class="tl">
            <span class="tl__dot"></span>
            <div class="tl__card">
              <span class="tl__k">1 — Permissão</span>
              <p>RBAC + ABAC no middleware. Frontend nunca decide regra.</p>
            </div>
          </div>
          <div class="tl">
            <span class="tl__dot tl__dot--a"></span>
            <div class="tl__card">
              <span class="tl__k">2 — Ledger</span>
              <p>SHA-256 do bloco anterior + payload + <code>Ed25519</code>. <code>previous_hash → hash</code>.</p>
            </div>
          </div>
          <div class="tl">
            <span class="tl__dot tl__dot--b"></span>
            <div class="tl__card">
              <span class="tl__k">3 — Protocolo</span>
              <p>Numeração <code>AAAA-NNNNNN</code> atômica (Res. 520/2019). Consulta pública por outbox.</p>
            </div>
          </div>
          <div class="tl">
            <span class="tl__dot tl__dot--c"></span>
            <div class="tl__card">
              <span class="tl__k">4 — Evento</span>
              <p>Outbox → RabbitMQ <code>vortex.events</code> → inbox idempotente → Hub Preditivo.</p>
            </div>
          </div>
        </div>
        <div class="ledger__proof">
          <code class="proof">ledger_blocks #42 · sha256:7f1a9c…d4e9 · sig:Ed25519 ✓ · protocolo 2026-000042</code>
          <a class="btn btn--small" [routerLink]="ctaLink()">Ver no dashboard</a>
        </div>
      </section>

      <!-- NORMAS -->
      <section id="normas" class="norms">
        <div class="sectionHead">
          <p class="eyebrow">Fonte regulatória</p>
          <h2>Resoluções na parede do hangar.</h2>
        </div>
        <div class="normGrid">
          <div class="norm">
            <span class="norm__code">Res. 458/2017</span>
            <h3>Registro eletrônico</h3>
            <p>Append-only. Diferença entre registros e projeções. Timeline imutável.</p>
          </div>
          <div class="norm">
            <span class="norm__code">Res. 520/2019</span>
            <h3>Protocolo eletrônico</h3>
            <p>Numeração atômica, vista em 5 dias, acesso por 10 dias.</p>
          </div>
          <div class="norm">
            <span class="norm__code">Lei 14.063/2020</span>
            <h3>Assinatura eletrônica</h3>
            <p>Bloco SEI, níveis N0–N3, carimbo de tempo (fase 3).</p>
          </div>
          <div class="norm">
            <span class="norm__code">RBAC 43/145</span>
            <h3>Manutenção</h3>
            <p>12 etapas de OS, BPS, CRS e controle de vencimentos por horas/ciclos/meses.</p>
          </div>
        </div>
      </section>

      <!-- CTA FINAL -->
      <section class="cta">
        <div class="cta__card">
          <div>
            <h2>Entre na pista. O hangar já está aceso.</h2>
            <p>Use a conta de desenvolvimento e veja o RLS em ação: sem vínculo, a API responde <code>403</code>.</p>
          </div>
          <div class="cta__actions">
            <a class="btn btn--primary btn--lg" [routerLink]="ctaLink()">{{ ctaLabel() }}</a>
            <span class="cta__hint">dono&#64;vortex.dev / dev-password · semvinculo&#64;vortex.dev</span>
          </div>
        </div>
      </section>

      <footer class="foot">
        <span>VORTEX · Aviação civil brasileira · Inspirado no <a href="https://github.com/akveo/ngx-admin" target="_blank" rel="noopener">ngx-admin Cosmic</a></span>
        <span class="foot__right">Angular 20 · NestJS · PostgreSQL 16 RLS · Ledger imutável</span>
      </footer>
    </div>
  `,
  styles: `
    :host { display: block; }
    .landing {
      --l-bg: #0d0f1f;
      --l-panel: rgba(255,255,255,0.04);
      --l-panel-2: rgba(255,255,255,0.06);
      --l-line: rgba(255,255,255,0.08);
      --l-line-strong: rgba(255,255,255,0.14);
      --l-text: #eef1ff;
      --l-muted: #a1a8c3;
      --l-faint: #6d7390;
      --l-accent: #7c6cff;
      --l-accent-2: #00d9ff;
      --l-ok: #2ed9a3;
      --l-warn: #ffb547;
      --l-crit: #ff5a6b;
      --l-radius: 14px;
      min-height: 100vh;
      background:
        radial-gradient(900px 600px at 18% -8%, rgba(124,108,255,0.32), transparent 60%),
        radial-gradient(700px 500px at 90% 8%, rgba(0,217,255,0.20), transparent 62%),
        radial-gradient(600px 400px at 50% 55%, rgba(124,108,255,0.08), transparent 70%),
        var(--l-bg);
      color: var(--l-text);
      font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    }
    a { color: inherit; }
    /* NAV */
    .nav {
      position: sticky; top: 0; z-index: 20;
      display: flex; align-items: center; gap: 1rem;
      padding: 0.75rem 2rem;
      background: rgba(13,15,31,0.72);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--l-line);
    }
    .nav__brand { display: inline-flex; align-items: center; gap: 0.75rem; text-decoration: none; }
    .nav__mark {
      display: grid; place-items: center; width: 36px; height: 36px; border-radius: 9px;
      background: linear-gradient(135deg, var(--l-accent), var(--l-accent-2));
      font-family: ui-monospace, monospace; font-weight: 800; font-size: 0.875rem; letter-spacing: 0.06em;
      color: #fff; box-shadow: 0 4px 16px rgba(124,108,255,0.4);
    }
    .nav__brandText { display: flex; flex-direction: column; line-height: 1.1; }
    .nav__brandText strong { font-size: 0.9375rem; letter-spacing: 0.12em; }
    .nav__brandText small { font-size: 0.625rem; letter-spacing: 0.16em; color: var(--l-muted); }
    .nav__links { display: flex; gap: 1rem; margin-left: 2rem; font-size: 0.8125rem; color: var(--l-muted); }
    .nav__links a { text-decoration: none; padding: 0.35rem 0.5rem; border-radius: 6px; }
    .nav__links a:hover { color: var(--l-text); background: var(--l-panel); }
    .nav__actions { margin-left: auto; display: flex; gap: 0.5rem; align-items: center; }
    .nav__ghost { padding: 0.45rem 0.9rem; border-radius: 999px; border: 1px solid var(--l-line-strong); text-decoration: none; font-size: 0.8125rem; color: var(--l-muted); }
    .nav__ghost:hover { color: var(--l-text); border-color: var(--l-text); }
    .nav__cta { padding: 0.5rem 1rem; border-radius: 999px; background: var(--l-text); color: #0d0f1f; text-decoration: none; font-size: 0.8125rem; font-weight: 700; }
    .nav__cta:hover { background: #fff; }
    /* HERO */
    .hero { position: relative; overflow: hidden; padding: 2.5rem 2rem 1.5rem; border-bottom: 1px solid var(--l-line); }
    .hero__glow {
      position: absolute; inset: -40% -20% auto -20%; height: 520px;
      background:
        radial-gradient(600px 300px at 30% 40%, rgba(124,108,255,0.22), transparent 70%),
        radial-gradient(500px 260px at 78% 32%, rgba(0,217,255,0.14), transparent 70%);
      pointer-events: none;
    }
    .hero__inner { position: relative; max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 2rem; align-items: center; }
    .hero__eyebrow { margin: 0; font-size: 0.6875rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--l-accent-2); font-weight: 700; }
    .hero__title { margin: 0.5rem 0 0; font-size: clamp(1.9rem, 4vw, 2.9rem); line-height: 1.05; letter-spacing: -0.02em; font-weight: 800; }
    .hero__acc { background: linear-gradient(90deg, var(--l-accent), var(--l-accent-2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .hero__sub { margin: 1rem 0 0; max-width: 54ch; line-height: 1.6; color: var(--l-muted); font-size: 0.9375rem; }
    .hero__sub strong { color: var(--l-text); font-weight: 600; }
    .hero__ctas { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.25rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.1rem; border-radius: 999px; font-size: 0.875rem; font-weight: 700; text-decoration: none; border: 1px solid transparent; cursor: pointer; }
    .btn--primary { background: linear-gradient(135deg, var(--l-accent), #5b4bff); color: #fff; box-shadow: 0 8px 24px rgba(124,108,255,0.35); }
    .btn--primary:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .btn--ghost { background: transparent; border-color: var(--l-line-strong); color: var(--l-text); }
    .btn--ghost:hover { background: var(--l-panel); }
    .btn--small { padding: 0.45rem 0.8rem; font-size: 0.75rem; }
    .btn--lg { padding: 0.85rem 1.4rem; font-size: 0.9375rem; }
    .btn__arrow { font-size: 1rem; line-height: 1; }
    .hero__trust { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin-top: 1.25rem; font-size: 0.6875rem; }
    .hero__trustLabel { letter-spacing: 0.12em; text-transform: uppercase; color: var(--l-faint); font-weight: 700; margin-right: 0.25rem; }
    .chip { padding: 0.2rem 0.55rem; border-radius: 999px; background: var(--l-panel); border: 1px solid var(--l-line); color: var(--l-muted); font-family: ui-monospace, monospace; }
    .chip--ok { background: rgba(46,217,163,0.14); border-color: rgba(46,217,163,0.28); color: var(--l-ok); }
    /* panel */
    .hero__panel {
      background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03));
      border: 1px solid var(--l-line);
      border-radius: 14px; overflow: hidden; backdrop-filter: blur(14px);
      box-shadow: 0 16px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
    }
    .panel__top { display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 0.8rem; background: rgba(0,0,0,0.22); border-bottom: 1px solid var(--l-line); font-size: 0.6875rem; color: var(--l-muted); }
    .panel__dot { width: 9px; height: 9px; border-radius: 50%; }
    .panel__dot--r { background: #ff5f56; } .panel__dot--y { background: #ffbd2e; } .panel__dot--g { background: #27c93f; }
    .panel__title { margin-left: 0.5rem; font-family: ui-monospace, monospace; }
    .panel__live { margin-left: auto; color: var(--l-ok); font-weight: 700; font-size: 0.625rem; letter-spacing: 0.08em; text-transform: uppercase; }
    .panel__body { padding: 1rem; }
    .panel__row { display: flex; justify-content: space-between; align-items: center; }
    .panel__k { font-family: ui-monospace, monospace; font-weight: 700; letter-spacing: 0.06em; }
    .panel__badge { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.625rem; font-weight: 800; letter-spacing: 0.08em; }
    .panel__badge--crit { background: var(--l-crit); color: #fff; }
    .panel__meter { margin-top: 0.9rem; }
    .panel__meterBar { height: 6px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; }
    .panel__meterFill { display: block; height: 100%; background: linear-gradient(90deg, var(--l-accent), var(--l-crit)); }
    .panel__meterLabel { display: block; margin-top: 0.35rem; font-size: 0.6875rem; color: var(--l-muted); font-family: ui-monospace, monospace; }
    .panel__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-top: 1rem; }
    .mini { padding: 0.6rem; border-radius: 10px; background: rgba(0,0,0,0.22); border: 1px solid var(--l-line); }
    .mini__label { display: block; font-size: 0.625rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--l-faint); }
    .mini__value { display: block; margin-top: 0.2rem; font-family: ui-monospace, monospace; font-size: 0.8125rem; font-weight: 700; }
    .panel__foot { display: flex; justify-content: space-between; gap: 0.5rem; margin-top: 0.9rem; font-size: 0.625rem; color: var(--l-faint); font-family: ui-monospace, monospace; }
    .stats { max-width: 1180px; margin: 1.25rem auto 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
    .stat { padding: 0.75rem 1rem; border-radius: 12px; background: var(--l-panel); border: 1px solid var(--l-line); text-align: center; }
    .stat__n { display: block; font-size: 1.1rem; font-weight: 800; letter-spacing: -0.02em; }
    .stat__l { display: block; font-size: 0.6875rem; color: var(--l-muted); margin-top: 0.15rem; }
    /* features */
    .features, .modules, .ledger, .norms, .cta { max-width: 1180px; margin: 0 auto; padding: 2rem 2rem; }
    .features { padding-top: 2rem; }
    .sectionHead { margin-bottom: 1.25rem; }
    .sectionHead h2 { margin: 0.25rem 0 0; font-size: 1.5rem; letter-spacing: -0.02em; }
    .eyebrow { margin: 0; font-size: 0.6875rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--l-accent-2); font-weight: 800; }
    .muted { color: var(--l-muted); font-size: 0.875rem; margin: 0.4rem 0 0; max-width: 60ch; }
    .featGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
    .feat { padding: 1rem; border-radius: 14px; background: var(--l-panel); border: 1px solid var(--l-line); }
    .feat__icon { display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: rgba(124,108,255,0.14); color: var(--l-accent); border: 1px solid rgba(124,108,255,0.22); }
    .feat h3 { margin: 0.7rem 0 0; font-size: 0.9375rem; }
    .feat p { margin: 0.35rem 0 0; font-size: 0.8125rem; color: var(--l-muted); line-height: 1.5; }
    .feat__meta { display: inline-block; margin-top: 0.6rem; font-size: 0.625rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--l-faint); font-family: ui-monospace, monospace; }
    /* modules */
    .modGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .mod { display: block; padding: 1rem; border-radius: 14px; background: var(--l-panel); border: 1px solid var(--l-line); text-decoration: none; color: inherit; position: relative; overflow: hidden; }
    .mod::after { content: ''; position: absolute; inset: auto -20% -40% auto; width: 180px; height: 180px; background: radial-gradient(circle, rgba(124,108,255,0.18), transparent 70%); pointer-events: none; }
    .mod--live { background: linear-gradient(180deg, rgba(124,108,255,0.12), var(--l-panel)); border-color: rgba(124,108,255,0.28); }
    .mod--ghost { opacity: 0.9; }
    .mod__scope { font-family: ui-monospace, monospace; font-size: 0.6875rem; letter-spacing: 0.1em; color: var(--l-accent-2); font-weight: 800; }
    .mod h3 { margin: 0.35rem 0 0; font-size: 1rem; }
    .mod p { margin: 0.35rem 0 0; font-size: 0.8125rem; color: var(--l-muted); line-height: 1.5; }
    .mod__go { display: inline-block; margin-top: 0.7rem; font-size: 0.8125rem; font-weight: 700; color: var(--l-accent); }
    .mod__badge { display: inline-block; margin-top: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 999px; font-size: 0.625rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; background: rgba(255,255,255,0.06); border: 1px solid var(--l-line); color: var(--l-faint); }
    /* ledger */
    .ledger { border: 1px solid var(--l-line); border-radius: 14px; background: rgba(255,255,255,0.02); padding: 1.25rem; }
    .ledger__head h2 { margin: 0.25rem 0 0; font-size: 1.35rem; }
    .timeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-top: 1rem; }
    .tl { display: flex; gap: 0.6rem; align-items: flex-start; }
    .tl__dot { width: 10px; height: 10px; border-radius: 50%; background: var(--l-accent); box-shadow: 0 0 0 6px rgba(124,108,255,0.14); margin-top: 0.35rem; flex: 0 0 auto; }
    .tl__dot--a { background: var(--l-accent-2); box-shadow: 0 0 0 6px rgba(0,217,255,0.14); }
    .tl__dot--b { background: var(--l-ok); box-shadow: 0 0 0 6px rgba(46,217,163,0.14); }
    .tl__dot--c { background: var(--l-warn); box-shadow: 0 0 0 6px rgba(255,181,71,0.14); }
    .tl__card { padding: 0.7rem; border-radius: 10px; background: var(--l-panel); border: 1px solid var(--l-line); flex: 1; }
    .tl__k { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.06em; }
    .tl__card p { margin: 0.3rem 0 0; font-size: 0.8125rem; color: var(--l-muted); line-height: 1.45; }
    .tl__card code { font-family: ui-monospace, monospace; font-size: 0.75rem; color: var(--l-text); }
    .ledger__proof { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; justify-content: space-between; margin-top: 1rem; padding: 0.7rem 0.8rem; border-radius: 10px; background: rgba(0,0,0,0.22); border: 1px solid var(--l-line); }
    .proof { font-family: ui-monospace, monospace; font-size: 0.75rem; color: var(--l-muted); }
    /* norms */
    .normGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-top: 0.75rem; }
    .norm { padding: 1rem; border-radius: 14px; background: var(--l-panel); border: 1px solid var(--l-line); }
    .norm__code { font-family: ui-monospace, monospace; font-size: 0.6875rem; letter-spacing: 0.08em; color: var(--l-accent); font-weight: 800; }
    .norm h3 { margin: 0.35rem 0 0; font-size: 0.9375rem; }
    .norm p { margin: 0.35rem 0 0; font-size: 0.8125rem; color: var(--l-muted); line-height: 1.5; }
    /* cta */
    .cta__card { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; padding: 1.25rem; border-radius: 16px; background: linear-gradient(135deg, rgba(124,108,255,0.18), rgba(0,217,255,0.12)); border: 1px solid rgba(124,108,255,0.22); backdrop-filter: blur(8px); }
    .cta__card h2 { margin: 0; font-size: 1.25rem; letter-spacing: -0.02em; }
    .cta__card p { margin: 0.35rem 0 0; color: var(--l-muted); font-size: 0.875rem; }
    .cta__card code { color: var(--l-text); font-family: ui-monospace, monospace; }
    .cta__actions { display: flex; flex-direction: column; gap: 0.4rem; align-items: flex-end; }
    .cta__hint { font-size: 0.6875rem; color: var(--l-faint); font-family: ui-monospace, monospace; }
    .foot { max-width: 1180px; margin: 1.5rem auto 0; padding: 1rem 2rem 1.5rem; display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: space-between; border-top: 1px solid var(--l-line); color: var(--l-faint); font-size: 0.75rem; }
    .foot a { color: var(--l-muted); }
    .foot__right { color: var(--l-faint); }
    @media (max-width: 980px) {
      .hero__inner { grid-template-columns: 1fr; }
      .featGrid, .modGrid, .normGrid, .timeline, .stats { grid-template-columns: 1fr 1fr; }
      .nav__links { display: none; }
    }
    @media (max-width: 640px) {
      .featGrid, .modGrid, .normGrid, .timeline, .stats { grid-template-columns: 1fr; }
      .cta__card { flex-direction: column; align-items: stretch; }
      .cta__actions { align-items: stretch; }
      .nav { gap: 0.6rem; }
      .hero { padding-top: 1.25rem; }
    }
  `,
})
export class LandingPage {
  private readonly store = inject(SessionStore);
  protected readonly ctaLabel = computed(() => (this.store.isAuthenticated() ? 'Abrir dashboard' : 'Acessar plataforma'));
  protected readonly ctaLink = computed(() => (this.store.isAuthenticated() ? '/app' : '/entrar'));
}
