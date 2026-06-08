import { Injectable } from '@angular/core';

/**
 * Thin, typed wrapper around localStorage with JSON (de)serialization and
 * SSR/quota-safe guards. Used by stores to persist user state.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private get store(): Storage | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
      return null;
    }
  }

  read<T>(key: string, fallback: T): T {
    const raw = this.store?.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  write<T>(key: string, value: T): void {
    try {
      this.store?.setItem(key, JSON.stringify(value));
    } catch {
      // Best-effort: ignore quota / privacy-mode failures.
    }
  }

  remove(key: string): void {
    try {
      this.store?.removeItem(key);
    } catch {
      /* no-op */
    }
  }
}
