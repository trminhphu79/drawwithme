import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** DUMB. Floating undo/redo + zoom controls overlaid on the canvas. */
@Component({
  selector: 'app-canvas-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Undo / Redo -->
    <div
      class="absolute left-1/2 -translate-x-1/2 bottom-[calc(0.75rem_+_env(safe-area-inset-bottom))] md:bottom-margin-desktop glass-panel rounded-full elevation-2 border border-outline-variant/30 px-3 py-2 flex items-center gap-2 touch-manipulation select-none">
      <button type="button" (click)="undo.emit()" [disabled]="!canUndo()"
        class="p-2 text-on-surface hover:bg-surface-variant rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Undo">
        <span class="material-symbols-outlined">undo</span>
      </button>
      <div class="w-px h-6 bg-outline-variant/50"></div>
      <button type="button" (click)="redo.emit()" [disabled]="!canRedo()"
        class="p-2 text-on-surface hover:bg-surface-variant rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Redo">
        <span class="material-symbols-outlined">redo</span>
      </button>
    </div>

    <!-- Zoom -->
    <div
      class="absolute right-margin-mobile md:right-margin-desktop bottom-[calc(0.75rem_+_env(safe-area-inset-bottom))] md:bottom-margin-desktop glass-panel rounded-full elevation-2 border border-outline-variant/30 flex flex-col items-center touch-manipulation select-none">
      <button type="button" (click)="zoomIn.emit()" class="p-3 text-on-surface hover:bg-surface-variant rounded-t-full transition-colors" title="Zoom in">
        <span class="material-symbols-outlined">add</span>
      </button>
      <span class="font-mono-label text-mono-label py-1 text-on-surface-variant">{{ zoom() }}%</span>
      <button type="button" (click)="zoomOut.emit()" class="p-3 text-on-surface hover:bg-surface-variant rounded-b-full transition-colors" title="Zoom out">
        <span class="material-symbols-outlined">remove</span>
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
