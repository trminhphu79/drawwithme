/** Where the reference image sits relative to the canvas. */
export type ReferenceLayout = 'left' | 'right' | 'float' | 'split';

/**
 * User-level preferences that persist across sessions (localStorage-backed).
 * Owned by the global PreferencesStore.
 */
export interface UserPreferences {
  displayName: string;
  /** Chosen avatar key (filename in public/avatars). */
  avatar: string;
  /** Stable per-browser id — identifies the room host + approved members. */
  clientId: string;
  savedColors: string[];
  recentColors: string[];
  defaultBrushSize: number;
  defaultOpacity: number;
  referenceLayout: ReferenceLayout;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  displayName: '',
  avatar: '',
  clientId: '',
  savedColors: ['#6f583c', '#897052', '#6a5c4a', '#ba1a1a', '#006591'],
  recentColors: ['#6f583c', '#ba1a1a', '#006591'],
  defaultBrushSize: 6,
  defaultOpacity: 100,
  referenceLayout: 'right',
};

export const MAX_RECENT_COLORS = 6;
