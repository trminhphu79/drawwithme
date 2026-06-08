import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import {
  DEFAULT_PREFERENCES,
  MAX_RECENT_COLORS,
  ReferenceLayout,
  UserPreferences,
} from './user-preferences.model';

const STORAGE_KEY = 'dwm.preferences';

/**
 * Global signal store for user preferences. Hydrates from localStorage on
 * creation and persists on every change via an effect. Feature stores read
 * from / write through this store (e.g. recent colors, default brush).
 */
@Injectable({ providedIn: 'root' })
export class PreferencesStore {
  private readonly storage = inject(StorageService);

  private readonly _prefs = signal<UserPreferences>(
    this.storage.read<UserPreferences>(STORAGE_KEY, DEFAULT_PREFERENCES),
  );

  readonly preferences = this._prefs.asReadonly();
  readonly displayName = computed(() => this._prefs().displayName);
  /** True once the user has a saved profile name (persists across refresh). */
  readonly hasProfile = computed(() => this._prefs().displayName.trim().length >= 2);
  readonly savedColors = computed(() => this._prefs().savedColors);
  readonly recentColors = computed(() => this._prefs().recentColors);
  readonly defaultBrushSize = computed(() => this._prefs().defaultBrushSize);
  readonly defaultOpacity = computed(() => this._prefs().defaultOpacity);
  readonly referenceLayout = computed(() => this._prefs().referenceLayout);

  constructor() {
    effect(() => this.storage.write(STORAGE_KEY, this._prefs()));
  }

  setDisplayName(name: string): void {
    this._prefs.update((p) => ({ ...p, displayName: name }));
  }

  setReferenceLayout(layout: ReferenceLayout): void {
    this._prefs.update((p) => ({ ...p, referenceLayout: layout }));
  }

  setDefaultBrush(size: number, opacity: number): void {
    this._prefs.update((p) => ({ ...p, defaultBrushSize: size, defaultOpacity: opacity }));
  }

  /** Push a color to the front of the MRU list (dedup, capped). */
  pushRecentColor(color: string): void {
    this._prefs.update((p) => ({
      ...p,
      recentColors: [color, ...p.recentColors.filter((c) => c !== color)].slice(
        0,
        MAX_RECENT_COLORS,
      ),
    }));
  }

  toggleSavedColor(color: string): void {
    this._prefs.update((p) => ({
      ...p,
      savedColors: p.savedColors.includes(color)
        ? p.savedColors.filter((c) => c !== color)
        : [...p.savedColors, color],
    }));
  }
}
