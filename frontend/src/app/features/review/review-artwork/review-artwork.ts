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
   * Save the artwork.
   *  - Desktop: a normal file download straight to the Downloads folder.
   *  - Mobile: the native share sheet (iOS "Save to Photos / Files"), which is
   *    the only reliable save path there; kept synchronous so iOS treats it as a
   *    user gesture.
   */
  protected onDownload(): void {
    const art = this.store.artwork();
    const src = art?.imageUrl;
    if (!src) return;
    const fileName = `${(art!.title || 'artwork').replace(/\s+/g, '-').toLowerCase()}.png`;

    // Mobile + data URL → share sheet (must run synchronously).
    if (this.isMobile() && src.startsWith('data:')) {
      const file = new File([this.dataUrlToBlob(src)], fileName, { type: 'image/png' });
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
        share?: (d: { files: File[]; title?: string }) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        nav.share({ files: [file], title: art!.title }).catch(() => undefined);
        return;
      }
      // fall through to a normal download if share isn't available
    }

    // Desktop (and mobile fallback): direct download to the folder.
    if (src.startsWith('data:')) {
      const url = URL.createObjectURL(this.dataUrlToBlob(src));
      this.triggerDownload(url, fileName);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } else {
      void this.downloadRemote(src, fileName);
    }
  }

  /** Force a download for a remote (R2) image; open in a tab if CORS blocks it. */
  private async downloadRemote(src: string, fileName: string): Promise<void> {
    try {
      const blob = await (await fetch(src, { mode: 'cors' })).blob();
      const url = URL.createObjectURL(blob);
      this.triggerDownload(url, fileName);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      window.open(src, '_blank', 'noopener');
    }
  }

  private isMobile(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    // iPadOS reports as Macintosh but has touch points.
    return /android|iphone|ipad|ipod|mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
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
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
