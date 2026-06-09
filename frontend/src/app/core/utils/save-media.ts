/**
 * Save a generated file to the user's device. On mobile (iOS/Android) this uses
 * the Web Share API so the native sheet offers "Save Video" → Photos / share to
 * apps. Elsewhere (desktop) it falls back to a normal download.
 * Returns true if shared, false if downloaded. A user-cancelled share counts as
 * handled (returns true) — we don't then also download.
 */
export async function saveMediaFile(blob: Blob, filename: string): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

  if (typeof navigator.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return true;
    } catch (err) {
      // User dismissed the sheet → treat as handled, don't double-save.
      if ((err as Error)?.name === 'AbortError') return true;
      // Any other share failure → fall through to a download.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return false;
}
