import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PencilStyle, PencilStyleDef, ToolDef, ToolId } from '../tool.model';

/** DUMB. Glassmorphism horizontal tool bar; emits tool + pencil-style choices. */
@Component({
  selector: 'app-tool-rail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="glass-blur rounded-full elevation-3 flex items-center gap-1 px-2 py-2">
      @for (tool of tools(); track tool.id) {
        <button
          type="button"
          (click)="toolSelect.emit(tool.id)"
          [title]="tool.label"
          class="w-11 h-11 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
          [class]="
            activeTool() === tool.id
              ? 'bg-secondary text-on-secondary shadow-lg'
              : 'text-on-surface-variant hover:bg-white/20'
          ">
          <span
            class="material-symbols-outlined"
            [style.font-variation-settings]="activeTool() === tool.id ? '\\'FILL\\' 1' : '\\'FILL\\' 0'">
            {{ tool.icon }}
          </span>
        </button>
      }

      <!-- Pencil styles (only while the Pencil tool is active) -->
      @if (activeTool() === 'pencil' && pencilStyles().length) {
        <div class="w-px h-7 bg-outline-variant/40 mx-1"></div>
        @for (s of pencilStyles(); track s.id) {
          <button
            type="button"
            (click)="styleChange.emit(s.id)"
            [title]="s.label"
            class="w-11 h-11 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
            [class]="
              pencilStyle() === s.id
                ? 'bg-secondary/20 text-secondary ring-1 ring-secondary/50'
                : 'text-on-surface-variant hover:bg-white/20'
            ">
            <span class="material-symbols-outlined">{{ s.icon }}</span>
          </button>
        }
      }

      <div class="w-px h-7 bg-outline-variant/40 mx-1"></div>

      <button type="button" title="Layers (coming soon)"
        class="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant/40 cursor-not-allowed">
        <span class="material-symbols-outlined">layers</span>
      </button>
      <button type="button" title="Help"
        class="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-white/20 hover:scale-110 transition-all">
        <span class="material-symbols-outlined">help</span>
      </button>
    </nav>
  `,
})
export class ToolRail {
  readonly tools = input.required<ToolDef[]>();
  readonly activeTool = input.required<ToolId>();
  readonly pencilStyles = input<PencilStyleDef[]>([]);
  readonly pencilStyle = input<PencilStyle>('hard');

  readonly toolSelect = output<ToolId>();
  readonly styleChange = output<PencilStyle>();
}
