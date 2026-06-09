import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { StorageService } from '../services/storage.service';

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

  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(() => this._mode() === 'dark');

  constructor() {
    // Reflect the mode onto <html> whenever it changes.
    effect(() => this.applyClass(this._mode()));
  }

  toggle(): void {
    this.set(this._mode() === 'dark' ? 'light' : 'dark');
  }

  set(mode: ThemeMode): void {
    this._mode.set(mode);
    this.storage.write(STORAGE_KEY, mode);
  }

  /** Reset to the default (light) and forget the saved choice. */
  useDefault(): void {
    this.storage.remove(STORAGE_KEY);
    this._mode.set('light');
  }

  private initialMode(): ThemeMode {
    // Theme switching is disabled — the app is always light mode.
    return 'light';
  }

  private applyClass(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }
}
