import { Injectable, computed, signal } from '@angular/core';

const TOKEN_KEY = 'dwm.admin.token';

/** Holds the admin bearer token (localStorage-backed). */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly _token = signal<string | null>(this.read());
  readonly token = this._token.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());

  setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable */
    }
    this._token.set(token);
  }

  logout(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    this._token.set(null);
  }

  private read(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
}
