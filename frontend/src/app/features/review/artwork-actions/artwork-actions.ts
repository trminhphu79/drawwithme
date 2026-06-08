import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/** DUMB. Download / Replay / Share action row. */
@Component({
  selector: 'app-artwork-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap justify-center gap-4 w-full max-w-xl">
      <button
        type="button"
        (click)="download.emit()"
        class="flex-1 flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-on-primary-fixed-variant transition-colors font-label-caps text-label-caps uppercase py-4 px-8 rounded-full elevation-2 active:scale-95 duration-150">
        <span class="material-symbols-outlined text-[20px]">download</span>
        Download
      </button>
      <button
        type="button"
        (click)="replay.emit()"
        class="flex-1 flex items-center justify-center gap-2 bg-surface-container-highest text-primary hover:bg-surface-dim transition-colors font-label-caps text-label-caps uppercase py-4 px-8 rounded-full elevation-2 active:scale-95 duration-150">
        <span class="material-symbols-outlined text-[20px]">history</span>
        Replay Drawing
      </button>
      <button
        type="button"
        (click)="share.emit()"
        class="flex-none flex items-center justify-center gap-2 border border-outline text-on-surface hover:bg-surface-variant transition-colors font-label-caps text-label-caps uppercase py-4 px-6 rounded-full elevation-2 active:scale-95 duration-150">
        <span class="material-symbols-outlined text-[20px]">share</span>
        Share
      </button>
    </div>
  `,
})
export class ArtworkActions {
  readonly download = output<void>();
  readonly replay = output<void>();
  readonly share = output<void>();
}
