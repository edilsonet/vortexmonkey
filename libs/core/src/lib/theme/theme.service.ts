import { Injectable, computed, effect, signal } from '@angular/core';

/** Claro -> Escuro -> Personalizado (sistema), conforme a Central de Comunicacao. */
export type VxThemeMode = 'light' | 'dark' | 'system';

const ORDER: readonly VxThemeMode[] = ['light', 'dark', 'system'];
const STORAGE_KEY = 'vortex.theme';

/**
 * Tema do documento. Como os tokens do DS usam `light-dark()`, alternar o tema
 * e apenas trocar o `color-scheme` da raiz — nenhum componente precisa saber.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly state = signal<VxThemeMode>(readStoredMode());
  private readonly systemDark = signal(prefersDark());

  readonly mode = this.state.asReadonly();
  readonly resolved = computed<'light' | 'dark'>(() => {
    const mode = this.state();
    return mode === 'system' ? (this.systemDark() ? 'dark' : 'light') : mode;
  });
  readonly label = computed(() => {
    const mode = this.state();
    return mode === 'system' ? 'Tema do sistema' : mode === 'dark' ? 'Tema escuro' : 'Tema claro';
  });

  constructor() {
    this.watchSystemPreference();
    effect(() => {
      const mode = this.state();
      if (typeof document !== 'undefined') {
        document.documentElement.style.colorScheme = mode === 'system' ? '' : mode;
      }
      storage()?.setItem(STORAGE_KEY, mode);
    });
  }

  /** Alterna claro -> escuro -> personalizado. */
  cycle(): void {
    const index = ORDER.indexOf(this.state());
    this.state.set(ORDER[(index + 1) % ORDER.length] ?? 'system');
  }

  set(mode: VxThemeMode): void {
    this.state.set(mode);
  }

  private watchSystemPreference(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemDark.set(query.matches);
    query.addEventListener('change', (event) => this.systemDark.set(event.matches));
  }
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

function readStoredMode(): VxThemeMode {
  const raw = storage()?.getItem(STORAGE_KEY);
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}
