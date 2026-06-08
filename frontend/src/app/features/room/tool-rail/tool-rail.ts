import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ToolDef, ToolId } from '../tool.model';

/** DUMB. Glassmorphism horizontal tool bar; emits the selected tool id. */
@Component({
  selector: 'app-tool-rail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="glass-blur rounded-full elevation-3 flex items-center gap-1 px-2 py-2">
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
  readonly toolSelect = output<ToolId>();
}
