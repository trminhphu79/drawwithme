import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

export type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'dwm.theme';

/**
 * Global theme store. Resolves the initial mode from a saved preference, or the
 * OS `prefers-color-scheme` when none is saved. Applies/removes `.dark` on
 * <html>, persists explicit choices, and follows system changes until the user
 * picks a mode. The anti-flash script in index.html applies the same logic
 * before Angular boots.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly storage = inject(StorageService);

  private readonly _mode = signal<ThemeMode>(this.initialMode());
  /** Whether the user has explicitly chosen (vs. following the system). */
  private readonly _explicit = signal<boolean>(this.storage.read<ThemeMode | null>(STORAGE_KEY, null) !== null);

  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(() => this._mode() === 'dark');

  constructor() {
    // Reflect the mode onto <html> whenever it changes.
    effect(() => this.applyClass(this._mode()));

    // Follow OS changes only while the user hasn't made an explicit choice.
    this.media()?.addEventListener('change', (e) => {
      if (!this._explicit()) this._mode.set(e.matches ? 'dark' : 'light');
    });
  }

  toggle(): void {
    this.set(this._mode() === 'dark' ? 'light' : 'dark');
  }

  set(mode: ThemeMode): void {
    this._explicit.set(true);
    this._mode.set(mode);
    this.storage.write(STORAGE_KEY, mode);
  }

  /** Forget the explicit choice and follow the system again. */
  useSystem(): void {
    this._explicit.set(false);
    this.storage.remove(STORAGE_KEY);
    this._mode.set(this.systemPrefersDark() ? 'dark' : 'light');
  }

  private initialMode(): ThemeMode {
    const saved = this.storage.read<ThemeMode | null>(STORAGE_KEY, null);
    if (saved === 'light' || saved === 'dark') return saved;
    return this.systemPrefersDark() ? 'dark' : 'light';
  }

  private systemPrefersDark(): boolean {
    return this.media()?.matches ?? false;
  }

  private media(): MediaQueryList | null {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
  }

  private applyClass(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }
}
