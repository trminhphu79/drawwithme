import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReviewStore } from '../review.store';
import { ArtworkPreview } from '../artwork-preview/artwork-preview';
import { ArtworkActions } from '../artwork-actions/artwork-actions';
import { ReplayPlayer } from '../replay-player/replay-player';
import { Toast } from '../../../core/toast';

/**
 * SMART / container for the Final-Artwork review screen. Provides ReviewStore,
 * loads the artwork from the route id, and composes the dumb preview + actions.
 */
@Component({
  selector: 'app-review-artwork',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ReviewStore],
  imports: [RouterLink, DatePipe, ArtworkPreview, ArtworkActions, ReplayPlayer, Toast],
  templateUrl: './review-artwork.html',
})
export class ReviewArtwork {
  protected readonly store = inject(ReviewStore);

  /** Route param `artwork/:id` via withComponentInputBinding(). */
  readonly id = input<string>('');

  /** Replay overlay visibility. */
  protected readonly showReplay = signal(false);
  /** Transient toast (e.g. after copying the share link). */
  protected readonly toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    let started = false;
    effect(() => {
      const id = this.id();
      if (id && !started) {
        started = true;
        void this.store.load(id);
      }
    });
  }

  /** Copy the shareable link to this artwork. */
  protected onCopyLink(): void {
    const url = `${location.origin}/artwork/${this.id()}`;
    const done = () => this.showToast('Link copied — anyone with it can view & replay 🎨');
    try {
      navigator.clipboard?.writeText(url).then(done, done) ?? done();
    } catch {
      done();
    }
  }

  private showToast(message: string): void {
    this.toast.set(message);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }

  /**
   * Save the artwork. Kept SYNCHRONOUS (no await before the action) so iOS Safari
   * treats it as a user-gesture. On mobile it opens the native share sheet
   * (Save to Photos / Files); on desktop it triggers a normal file download.
   */
  protected onDownload(): void {
    const art = this.store.artwork();
    const src = art?.imageUrl;
    if (!src) return;
    const fileName = `${(art!.title || 'artwork').replace(/\s+/g, '-').toLowerCase()}.png`;

    // Snapshots are data URLs → build a File synchronously (no fetch/await).
    if (src.startsWith('data:')) {
      const file = new File([this.dataUrlToBlob(src)], fileName, { type: 'image/png' });
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
        share?: (d: { files: File[]; title?: string }) => Promise<void>;
      };
      // iOS/Android: native share sheet is the reliable "save" path.
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        nav.share({ files: [file], title: art!.title }).catch(() => undefined);
        return;
      }
      // Desktop fallback: object-URL download.
      const url = URL.createObjectURL(file);
      this.triggerDownload(url, fileName);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return;
    }

    // Remote (R2/http) image fallback.
    this.triggerDownload(src, fileName);
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const [head, b64] = dataUrl.split(',');
    const mime = /:(.*?);/.exec(head)?.[1] ?? 'image/png';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  private triggerDownload(href: string, fileName: string): void {
    const a = document.createElement('a');
    a.href = href;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
