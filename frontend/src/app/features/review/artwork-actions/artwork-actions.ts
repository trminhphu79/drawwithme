import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** DUMB. Download / Replay / Copy-link action row. */
@Component({
  selector: 'app-artwork-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap justify-center gap-4 w-full max-w-2xl">
      <button
        type="button"
        (click)="download.emit()"
        [disabled]="!canDownload()"
        class="flex-1 min-w-[140px] flex items-center justify-center gap-2 brand-bg hover:brightness-105 transition-all font-label-caps text-label-caps uppercase py-4 px-6 rounded-full elevation-2 active:scale-95 duration-150 disabled:opacity-40 disabled:cursor-not-allowed">
        <span class="material-symbols-outlined text-[20px]">download</span>
        Download
      </button>
      <button
        type="button"
        (click)="replay.emit()"
        [disabled]="!canReplay()"
        class="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-surface-container-highest text-primary hover:bg-surface-dim transition-colors font-label-caps text-label-caps uppercase py-4 px-6 rounded-full elevation-2 active:scale-95 duration-150 disabled:opacity-40 disabled:cursor-not-allowed">
        <span class="material-symbols-outlined text-[20px]">history</span>
        Replay
      </button>
      <button
        type="button"
        (click)="copyLink.emit()"
        class="flex-1 min-w-[140px] flex items-center justify-center gap-2 border border-outline text-on-surface hover:bg-surface-variant transition-colors font-label-caps text-label-caps uppercase py-4 px-6 rounded-full elevation-2 active:scale-95 duration-150">
        <span class="material-symbols-outlined text-[20px]">link</span>
        Copy link
      </button>
    </div>
  `,
})
export class ArtworkActions {
  readonly canDownload = input(true);
  readonly canReplay = input(true);
  readonly download = output<void>();
  readonly replay = output<void>();
  readonly copyLink = output<void>();
}
