/** Available avatar image files (in public/avatars). The key (filename) is what
 *  gets shared between clients; each browser loads the image from its own origin. */
export const AVATARS: readonly string[] = [
  'female_1.png', 'female_2.png', 'female_3.png', 'female_4.png', 'female_5.png',
  'female_6.png', 'female_7.png', 'female_8.png', 'female_9.png',
  'male_1.png', 'male_2.png', 'male_3.png', 'male_4.png', 'male_5.png',
  'male_6.png', 'male_7.png', 'male_8.png', 'male_9.png',
];

/** Resolve an avatar key to its URL (falls back to the first avatar). */
export function avatarUrl(file: string | undefined | null): string {
  return `avatars/${file && AVATARS.includes(file) ? file : AVATARS[0]}`;
}

/** Pick a random avatar key. */
export function randomAvatar(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return AVATARS[buf[0] % AVATARS.length];
}
