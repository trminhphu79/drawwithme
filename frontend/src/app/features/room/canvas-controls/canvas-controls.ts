import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** DUMB. Floating undo/redo + zoom controls overlaid on the canvas. */
@Component({
  selector: 'app-canvas-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Undo / Redo -->
    <div
      class="absolute left-1/2 -translate-x-1/2 bottom-[calc(0.75rem_+_env(safe-area-inset-bottom))] md:bottom-margin-desktop glass-blur rounded-full elevation-3 flex items-center gap-1 px-2 py-2 touch-manipulation select-none">
      <button type="button" (click)="undo.emit()" [disabled]="!canUndo()" title="Undo"
        class="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-white/20 hover:scale-110 active:scale-95 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:scale-100 disabled:cursor-not-allowed">
        <span class="material-symbols-outlined text-[22px]">undo</span>
      </button>
      <div class="w-px h-6 bg-outline-variant/40"></div>
      <button type="button" (click)="redo.emit()" [disabled]="!canRedo()" title="Redo"
        class="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-white/20 hover:scale-110 active:scale-95 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:scale-100 disabled:cursor-not-allowed">
        <span class="material-symbols-outlined text-[22px]">redo</span>
      </button>
    </div>

    <!-- Zoom -->
    <div
      class="absolute right-margin-mobile md:right-margin-desktop bottom-[calc(0.75rem_+_env(safe-area-inset-bottom))] md:bottom-margin-desktop glass-blur rounded-full elevation-3 flex flex-col items-center p-1 touch-manipulation select-none">
      <button type="button" (click)="zoomIn.emit()" title="Zoom in"
        class="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-white/20 hover:scale-110 active:scale-95">
        <span class="material-symbols-outlined text-[22px]">add</span>
      </button>
      <span class="font-mono-label text-mono-label py-0.5 text-on-surface-variant">{{ zoom() }}%</span>
      <button type="button" (click)="zoomOut.emit()" title="Zoom out"
        class="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-white/20 hover:scale-110 active:scale-95">
        <span class="material-symbols-outlined text-[22px]">remove</span>
      </button>
    </div>
  `,
})
export class CanvasControls {
  readonly zoom = input(100);
  readonly canUndo = input(false);
  readonly canRedo = input(false);

  readonly undo = output<void>();
  readonly redo = output<void>();
  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
}
