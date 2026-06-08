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
}
