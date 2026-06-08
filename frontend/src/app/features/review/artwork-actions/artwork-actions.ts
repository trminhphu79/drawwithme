import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** DUMB. Download / Replay action row (Share/Invite intentionally hidden here). */
@Component({
  selector: 'app-artwork-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap justify-center gap-4 w-full max-w-xl">
      <button
        type="button"
        (click)="download.emit()"
        [disabled]="!canDownload()"
        class="flex-1 flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-on-primary-fixed-variant transition-colors font-label-caps text-label-caps uppercase py-4 px-8 rounded-full elevation-2 active:scale-95 duration-150 disabled:opacity-40 disabled:cursor-not-allowed">
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
    </div>
  `,
})
export class ArtworkActions {
  readonly canDownload = input(true);
  readonly download = output<void>();
  readonly replay = output<void>();
}
