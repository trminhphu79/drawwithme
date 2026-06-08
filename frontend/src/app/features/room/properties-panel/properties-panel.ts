import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ToolId } from '../tool.model';
import { ColorPicker } from '../color-picker/color-picker';

/**
 * DUMB. Right "Properties" sidebar: stroke weight, opacity, color swatches +
 * recent + a custom color picker, and a (presentational) layers section.
 */
@Component({
  selector: 'app-properties-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ColorPicker],
  templateUrl: './properties-panel.html',
})
export class PropertiesPanel {
  readonly tool = input.required<ToolId>();
  readonly size = input.required<number>();
  readonly opacity = input.required<number>();
  readonly color = input.required<string>();
  readonly palette = input<string[]>([]);
  readonly recentColors = input<string[]>([]);
  readonly referenceUrl = input<string | null>(null);
  readonly referenceVisible = input(true);
  readonly referenceOpacity = input(50);

  readonly sizeChange = output<number>();
  readonly opacityChange = output<number>();
  readonly colorChange = output<string>();
  readonly referenceFile = output<File>();
  readonly toggleReference = output<void>();
  readonly referenceOpacityChange = output<number>();
  readonly previewReference = output<void>();
  readonly clear = output<void>();

  /** Custom color-picker popover visibility. */
  protected readonly pickerOpen = signal(false);

  protected onSize(event: Event): void {
    this.sizeChange.emit(Number((event.target as HTMLInputElement).value));
  }
  protected onOpacity(event: Event): void {
    this.opacityChange.emit(Number((event.target as HTMLInputElement).value));
  }
  protected onReferenceFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.referenceFile.emit(file);
    input.value = '';
  }
  protected onReferenceOpacity(event: Event): void {
    this.referenceOpacityChange.emit(Number((event.target as HTMLInputElement).value));
  }

  /** Filled-track background for the range slider (webkit). */
  protected trackBg(value: number, min: number, max: number): string {
    const p = ((value - min) / (max - min)) * 100;
    return `linear-gradient(to right, var(--color-secondary) ${p}%, var(--color-surface-variant) ${p}%)`;
  }

  /** Perceived lightness — picks a contrasting check-mark color on a swatch. */
  protected isLight(hex: string): boolean {
    const v = hex.replace('#', '');
    const n = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b > 160;
  }
}
