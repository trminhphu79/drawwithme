import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReviewStore } from '../review.store';
import { ArtworkPreview } from '../artwork-preview/artwork-preview';
import { ArtworkActions } from '../artwork-actions/artwork-actions';

/**
 * SMART / container for the Final-Artwork review screen. Provides ReviewStore,
 * loads the artwork from the route id, and composes the dumb preview + actions.
 */
@Component({
  selector: 'app-review-artwork',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ReviewStore],
  imports: [RouterLink, DatePipe, ArtworkPreview, ArtworkActions],
  templateUrl: './review-artwork.html',
})
export class ReviewArtwork {
  protected readonly store = inject(ReviewStore);

  /** Route param `artwork/:id` via withComponentInputBinding(). */
  readonly id = input<string>('');

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

  /** Download the artwork PNG to the device (works on desktop + mobile). */
  protected async onDownload(): Promise<void> {
    const art = this.store.artwork();
    if (!art?.imageUrl) return;
    const fileName = `${(art.title || 'artwork').replace(/\s+/g, '-').toLowerCase()}.png`;
    try {
      const blob = await (await fetch(art.imageUrl)).blob();
      const url = URL.createObjectURL(blob);
      this.triggerDownload(url, fileName);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: link straight to the (data) URL.
      this.triggerDownload(art.imageUrl, fileName);
    }
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
