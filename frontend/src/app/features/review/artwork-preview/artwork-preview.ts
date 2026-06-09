import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

/** DUMB. Final-artwork preview card with replay-on-hover overlay. */
@Component({
  selector: 'app-artwork-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="w-full relative elevation-3 rounded-xl bg-surface-container-lowest p-4 border border-outline-variant/30 transition-transform duration-500 hover:scale-[1.01]">
      <div class="relative w-full aspect-video rounded-lg overflow-hidden bg-surface-container">
        @if (imageUrl()) {
          <!-- Shimmer behind the image until it actually paints (no pop, no shift) -->
          @if (!loaded()) {
            <div class="absolute inset-0 animate-pulse bg-surface-container-high"></div>
          }
          <img
            [src]="imageUrl()"
            alt="Final artwork"
            fetchpriority="high"
            decoding="async"
            (load)="loaded.set(true)"
            class="w-full h-full object-contain transition-opacity duration-300"
            [class.opacity-0]="!loaded()"
            [class.opacity-100]="loaded()" />
        } @else {
          <!-- Warm placeholder when no rasterized snapshot exists yet -->
          <div
            class="w-full h-full"
            style="background:
              radial-gradient(circle at 30% 30%, rgba(224,194,159,0.9), transparent 55%),
              radial-gradient(circle at 75% 65%, rgba(137,112,82,0.85), transparent 50%),
              linear-gradient(135deg, #f2e0c8, #e4e2dd);"></div>
          <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 450" preserveAspectRatio="none">
            <path d="M 80 320 Q 250 80 420 300 T 720 160" fill="transparent" stroke="#6f583c" stroke-linecap="round" stroke-width="6"></path>
            <path d="M 120 200 Q 300 360 560 240" fill="transparent" stroke="#ba1a1a" stroke-linecap="round" stroke-width="4" opacity="0.7"></path>
          </svg>
        }

        <button
          type="button"
          (click)="replay.emit()"
          class="absolute inset-0 flex items-center justify-center bg-inverse-surface/20 opacity-0 hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm group">
          <div class="bg-surface-container-lowest rounded-full p-4 elevation-3 transform group-hover:scale-110 transition-transform duration-200">
            <span class="material-symbols-outlined text-primary text-[32px] block" style="font-variation-settings:'FILL' 1;">play_arrow</span>
          </div>
        </button>
      </div>
    </div>
  `,
})
export class ArtworkPreview {
  readonly imageUrl = input<string | null>(null);
  readonly replay = output<void>();

  /** Flips true once the artwork image has actually painted (drives the fade-in). */
  protected readonly loaded = signal(false);
}
