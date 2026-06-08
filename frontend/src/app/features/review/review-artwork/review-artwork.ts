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
}
