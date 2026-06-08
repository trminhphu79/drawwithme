import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ToolId } from '../tool.model';

/**
 * DUMB. Right "Properties" sidebar: stroke weight, opacity, color swatches +
 * recent + custom picker, and a (presentational) layers section.
 */
@Component({
  selector: 'app-properties-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './properties-panel.html',
})
export class PropertiesPanel {
  readonly tool = input.required<ToolId>();
  readonly size = input.required<number>();
  readonly opacity = input.required<number>();
  readonly color = input.required<string>();
  readonly palette = input<string[]>([]);
  readonly recentColors = input<string[]>([]);

  readonly sizeChange = output<number>();
  readonly opacityChange = output<number>();
  readonly colorChange = output<string>();

  protected onSize(event: Event): void {
    this.sizeChange.emit(Number((event.target as HTMLInputElement).value));
  }
  protected onOpacity(event: Event): void {
    this.opacityChange.emit(Number((event.target as HTMLInputElement).value));
  }
  protected onColorInput(event: Event): void {
    this.colorChange.emit((event.target as HTMLInputElement).value);
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
