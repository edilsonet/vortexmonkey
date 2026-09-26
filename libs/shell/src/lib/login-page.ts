import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, VortexApiError } from '@vortex/core';

interface DemoAccount {
  readonly label: string;
  readonly email: string;
  readonly password: string;
  readonly note: string;
}

const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    label: 'Gestor (tenant + empresa)',
    email: 'dono@vortex.dev',
    password: 'dev-password',
    note: 'Vinculo ativo: enxerga aeronaves e conformidade.',
  },
  {
    label: 'Sem vinculo',
    email: 'semvinculo@vortex.dev',
    password: 'dev-password',
    note: 'Prova o RLS: a API responde 403.',
  },
];

/**
 * Login por vinculo. A senha e verificada no banco (bcrypt + lockout); o token
 * devolvido fixa tenant e empresa, que passam a alimentar o RLS.
 */
@Component({
  selector: 'vx-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="gate">
      <section class="gate__brand">
        <p class="gate__eyebrow">Conformidade &middot; Governan&ccedil;a &middot; Registro</p>
        <h1 class="gate__title">VORTEX</h1>
        <p class="gate__subtitle">
          Ecossistema integrado para a avia&ccedil;&atilde;o civil brasileira. Registro
          eletr&ocirc;nico imut&aacute;vel, assinatura e protocolo.
        </p>
        <dl class="gate__refs">
          <div>
            <dt>Registro eletr&ocirc;nico</dt>
            <dd>Resolu&ccedil;&atilde;o ANAC 458/2017</dd>
          </div>
          <div>
            <dt>Protocolo</dt>
            <dd>Resolu&ccedil;&atilde;o ANAC 520/2019</dd>
          </div>
          <div>
            <dt>Assinatura eletr&ocirc;nica</dt>
            <dd>Lei 14.063/2020</dd>
          </div>
        </dl>
      </section>

      <section class="gate__form">
        <h2 class="gate__formTitle">Acessar</h2>

        @if (loading()) {
          <mat-progress-bar mode="indeterminate" />
        }

        <form class="form" [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>E-mail</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="username" />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <mat-error>Informe um e-mail v&aacute;lido.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Senha</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="current-password" />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <mat-error>Informe a senha.</mat-error>
            }
          </mat-form-field>

          @if (error(); as message) {
            <p class="form__error" role="alert">{{ message }}</p>
          }

          <button mat-flat-button color="primary" type="submit" [disabled]="loading()">
            Entrar
          </button>
        </form>

        <div class="demo">
          <p class="demo__title">Contas de desenvolvimento (seed)</p>
          @for (account of demoAccounts; track account.email) {
            <button class="demo__row" type="button" (click)="use(account)">
              <span class="demo__label">{{ account.label }}</span>
              <span class="demo__mail">{{ account.email }}</span>
              <span class="demo__note">{{ account.note }}</span>
            </button>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }
    .gate {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      min-height: 100vh;
    }
    .gate__brand {
      padding: clamp(2rem, 6vw, 5rem);
      background:
        linear-gradient(var(--vx-line) 1px, transparent 1px) 0 0 / 100% 48px,
        linear-gradient(90deg, var(--vx-line) 1px, transparent 1px) 0 0 / 48px 100%,
        var(--vx-panel-2);
      border-right: 1px solid var(--vx-line);
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .gate__eyebrow {
      margin: 0 0 var(--vx-space-3);
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--vx-accent);
    }
    .gate__title {
      margin: 0;
      font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 700;
      letter-spacing: 0.1em;
      line-height: 1;
    }
    .gate__subtitle {
      margin: var(--vx-space-4) 0 0;
      max-width: 42ch;
      color: var(--vx-text-muted);
      line-height: 1.6;
    }
    .gate__refs {
      margin: var(--vx-space-6) 0 0;
      display: grid;
      gap: var(--vx-space-3);
      max-width: 40ch;
    }
    .gate__refs div {
      display: flex;
      justify-content: space-between;
      gap: var(--vx-space-4);
      border-top: 1px solid var(--vx-line);
      padding-top: var(--vx-space-2);
      font-size: 0.8125rem;
    }
    .gate__refs dt {
      color: var(--vx-text-muted);
    }
    .gate__refs dd {
      margin: 0;
      font-family: var(--vx-font-mono);
      color: var(--vx-text);
    }
    .gate__form {
      padding: clamp(2rem, 6vw, 4rem);
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: var(--vx-panel);
    }
    .gate__formTitle {
      margin: 0 0 var(--vx-space-4);
      font-size: 1rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--vx-text-muted);
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: var(--vx-space-3);
      max-width: 380px;
    }
    .form__error {
      margin: 0;
      padding: var(--vx-space-2) var(--vx-space-3);
      border-left: 3px solid var(--vx-overdue);
      background: var(--vx-overdue-bg);
      color: var(--vx-overdue);
      font-size: 0.8125rem;
      border-radius: var(--vx-radius-xs);
    }
    .demo {
      margin-top: var(--vx-space-6);
      max-width: 380px;
    }
    .demo__title {
      margin: 0 0 var(--vx-space-2);
      font-size: 0.6875rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--vx-text-faint);
    }
    .demo__row {
      display: block;
      width: 100%;
      text-align: left;
      background: var(--vx-panel-2);
      border: 1px solid var(--vx-line);
      border-radius: var(--vx-radius-sm);
      padding: var(--vx-space-2) var(--vx-space-3);
      margin-bottom: var(--vx-space-2);
      cursor: pointer;
      font: inherit;
      color: inherit;
    }
    .demo__row:hover {
      border-color: var(--vx-accent);
    }
    .demo__label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .demo__mail {
      display: block;
      font-family: var(--vx-font-mono);
      font-size: 0.75rem;
      color: var(--vx-accent);
    }
    .demo__note {
      display: block;
      font-size: 0.6875rem;
      color: var(--vx-text-faint);
    }
    @media (max-width: 900px) {
      .gate {
        grid-template-columns: 1fr;
      }
      .gate__brand {
        border-right: none;
        border-bottom: 1px solid var(--vx-line);
      }
    }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly demoAccounts = DEMO_ACCOUNTS;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required]),
  });

  protected use(account: DemoAccount): void {
    this.form.setValue({ email: account.email, password: account.password });
  }

  protected submit(): void {
    if (this.loading()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();

    this.auth.login({ email, password }).subscribe({
      next: () => {
        this.loading.set(false);
        const redirect = this.route.snapshot.queryParamMap.get('redirectTo') ?? '/';
        void this.router.navigateByUrl(redirect);
      },
      error: (cause: unknown) => {
        this.loading.set(false);
        this.error.set(
          cause instanceof VortexApiError ? cause.message : 'Nao foi possivel entrar agora.',
        );
      },
    });
  }
}
