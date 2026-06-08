import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ArtworkService } from './artwork.service';
import { Artwork } from './artwork.model';

/**
 * Feature signal store for the Review/Final-Artwork screen. Loads the sealed
 * artwork by id and exposes loading/error state. Provided at component scope.
 * Falls back to a placeholder if the API is unavailable so the screen renders.
 */
@Injectable()
export class ReviewStore {
  private readonly artworks = inject(ArtworkService);

  private readonly _artwork = signal<Artwork | null>(null);
  private readonly _loading = signal(false);

  readonly artwork = this._artwork.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly hasImage = computed(() => !!this._artwork()?.imageUrl);
  readonly replayable = computed(() => this._artwork()?.replayable ?? false);

  async load(id: string): Promise<void> {
    this._loading.set(true);
    try {
      this._artwork.set(await firstValueFrom(this.artworks.getArtwork(id)));
    } catch {
      this._artwork.set(this.placeholder(id));
    } finally {
      this._loading.set(false);
    }
  }

  private placeholder(id: string): Artwork {
    return {
      id,
      roomCode: id,
      title: 'Untitled Masterpiece',
      imageUrl: null,
      participants: ['You'],
      replayable: false,
      createdAt: new Date().toISOString(),
    };
  }
}
