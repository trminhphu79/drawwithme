import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { PencilStyle, PencilStyleDef, ToolDef, ToolId } from '../tool.model';
import { ColorPicker } from '../color-picker/color-picker';

/** DUMB. Glassmorphism horizontal tool bar; emits tool, pencil-style + color choices. */
@Component({
  selector: 'app-tool-rail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ColorPicker],
  template: `
    <div class="relative">
      <nav class="glass-blur rounded-full elevation-3 flex flex-nowrap items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1.5 sm:py-2 touch-manipulation select-none max-w-[calc(100vw-1rem)] overflow-x-auto scrollbar-none">
        @for (tool of tools(); track tool.id) {
          <button
            type="button"
            (click)="toolSelect.emit(tool.id)"
            [title]="tool.label"
            class="w-9 h-9 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
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
          <div class="w-px h-7 bg-outline-variant/40 mx-0.5 sm:mx-1 shrink-0"></div>
          @for (s of pencilStyles(); track s.id) {
            <button
              type="button"
              (click)="styleChange.emit(s.id)"
              [title]="s.label"
              class="w-9 h-9 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
              [class]="
                pencilStyle() === s.id
                  ? 'bg-secondary/20 text-secondary ring-1 ring-secondary/50'
                  : 'text-on-surface-variant hover:bg-white/20'
              ">
              <span class="material-symbols-outlined">{{ s.icon }}</span>
            </button>
          }
        }

        <div class="w-px h-7 bg-outline-variant/40 mx-0.5 sm:mx-1 shrink-0"></div>

        <!-- Color picker -->
        <button
          type="button"
          (click)="pickerOpen.set(!pickerOpen())"
          title="Color"
          class="w-9 h-9 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-white/20 hover:scale-110 active:scale-95 transition-all">
          <span
            class="w-6 h-6 rounded-full ring-2 ring-black/15 dark:ring-white/25 shadow-sm"
            [style.background-color]="color()"></span>
        </button>

        <button type="button" (click)="preferences.emit()" title="Properties"
          class="w-9 h-9 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-white/20 hover:scale-110 active:scale-95 transition-all">
          <span class="material-symbols-outlined">tune</span>
        </button>

        <div class="w-px h-7 bg-outline-variant/40 mx-0.5 sm:mx-1 shrink-0"></div>

        <button type="button" (click)="finish.emit()" title="Finish & save"
          class="w-9 h-9 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center rounded-full bg-secondary text-on-secondary shadow-md hover:brightness-105 hover:scale-110 active:scale-95 transition-all">
          <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">check_circle</span>
        </button>
      </nav>

      <!-- Color popover (outside the scrolling nav so it isn't clipped) -->
      @if (pickerOpen()) {
        <div class="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-64 max-w-[90vw]">
          <app-color-picker
            [color]="color()"
            (colorChange)="colorChange.emit($event)"
            (close)="pickerOpen.set(false)" />
        </div>
      }
    </div>
  `,
})
export class ToolRail {
  readonly tools = input.required<ToolDef[]>();
  readonly activeTool = input.required<ToolId>();
  readonly pencilStyles = input<PencilStyleDef[]>([]);
  readonly pencilStyle = input<PencilStyle>('soft');
  readonly color = input('#000000');

  readonly toolSelect = output<ToolId>();
  readonly styleChange = output<PencilStyle>();
  readonly preferences = output<void>();
  readonly colorChange = output<string>();
  readonly finish = output<void>();

  /** Color-picker popover visibility. */
  protected readonly pickerOpen = signal(false);
}
