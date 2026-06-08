/**
 * Distinct cursor / presence colors, indexed by the server-assigned slot.
 * Classes are written out in full so Tailwind's scanner generates them.
 * `pill` tints the name label (solid bg + white text); `arrow` tints the
 * pointer glyph (text color only).
 */
export interface CursorColor {
  pill: string;
  arrow: string;
}

export const CURSOR_PALETTE: readonly CursorColor[] = [
  { pill: 'bg-rose-500 text-white', arrow: 'text-rose-500' },
  { pill: 'bg-sky-500 text-white', arrow: 'text-sky-500' },
  { pill: 'bg-amber-500 text-white', arrow: 'text-amber-500' },
  { pill: 'bg-emerald-500 text-white', arrow: 'text-emerald-500' },
  { pill: 'bg-violet-500 text-white', arrow: 'text-violet-500' },
  { pill: 'bg-fuchsia-500 text-white', arrow: 'text-fuchsia-500' },
  { pill: 'bg-teal-500 text-white', arrow: 'text-teal-500' },
  { pill: 'bg-orange-500 text-white', arrow: 'text-orange-500' },
];

/** Map a (possibly out-of-range) slot index to a palette entry. */
export function cursorColor(index: number): CursorColor {
  const n = CURSOR_PALETTE.length;
  return CURSOR_PALETTE[(((index ?? 0) % n) + n) % n];
}
