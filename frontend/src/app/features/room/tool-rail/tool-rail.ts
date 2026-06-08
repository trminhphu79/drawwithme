import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ToolDef, ToolId } from '../tool.model';

/** DUMB. Glassmorphism vertical tool dock; emits the selected tool id. */
@Component({
  selector: 'app-tool-rail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="glass-panel rounded-xl elevation-3 w-20 flex flex-col items-center py-6 gap-3 h-full">
      <div class="flex flex-col items-center gap-1 mb-2">
        <div class="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-on-primary shadow-lg ring-4 ring-white/10">
          <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">brush</span>
        </div>
        <span class="text-[9px] font-bold text-primary uppercase tracking-tighter mt-1">Tools</span>
      </div>

      <div class="flex flex-col gap-2 flex-1">
        @for (tool of tools(); track tool.id) {
          <button
            type="button"
            (click)="toolSelect.emit(tool.id)"
            [title]="tool.label"
            class="w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95"
            [class]="
              activeTool() === tool.id
                ? 'bg-secondary text-on-secondary shadow-lg scale-105'
                : 'text-on-surface-variant hover:bg-white/20'
            ">
            <span
              class="material-symbols-outlined"
              [style.font-variation-settings]="activeTool() === tool.id ? '\\'FILL\\' 1' : '\\'FILL\\' 0'">
              {{ tool.icon }}
            </span>
          </button>
        }
      </div>

      <div class="pt-3 border-t border-white/10 flex flex-col gap-2">
        <button type="button" title="Layers (coming soon)"
          class="w-12 h-12 flex items-center justify-center rounded-xl text-on-surface-variant/40 cursor-not-allowed">
          <span class="material-symbols-outlined">layers</span>
        </button>
        <button type="button" title="Help"
          class="w-12 h-12 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-white/20 hover:scale-110 transition-all">
          <span class="material-symbols-outlined">help</span>
        </button>
      </div>
    </nav>
  `,
})
export class ToolRail {
  readonly tools = input.required<ToolDef[]>();
  readonly activeTool = input.required<ToolId>();
  readonly toolSelect = output<ToolId>();
}
