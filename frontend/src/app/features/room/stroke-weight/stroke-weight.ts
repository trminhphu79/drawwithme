import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * DUMB. Compact stroke-weight slider shown transiently below the tool bar.
 * Visibility/auto-hide is owned by the parent; this just renders the range.
 */
@Component({
  selector: 'app-stroke-weight',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="glass-blur rounded-full elevation-3 px-4 py-2.5 flex items-center gap-3 touch-manipulation select-none">
      <span class="material-symbols-outlined text-on-surface-variant text-[18px]">line_weight</span>
      <input
        type="range"
        [min]="min()"
        [max]="max()"
        [value]="size()"
        (input)="onInput($event)"
        class="range-soft w-40 sm:w-56"
        [style.background]="trackBg()"
        aria-label="Stroke weight" />
      <span class="rounded-full bg-on-surface shrink-0" [style.width.px]="dotSize()" [style.height.px]="dotSize()"></span>
      <span class="text-label-sm font-bold text-secondary w-9 text-right tabular-nums">{{ size() }}</span>
    </div>
  `,
})
export class StrokeWeight {
  readonly size = input.required<number>();
  readonly min = input(1);
  readonly max = input(128);

  readonly sizeChange = output<number>();

  /** Clamped preview dot so big sizes don't blow out the pill. */
  protected readonly dotSize = computed(() => Math.min(26, Math.max(4, this.size())));

  /** Filled-track background (webkit). */
  protected readonly trackBg = computed(() => {
    const p = ((this.size() - this.min()) / (this.max() - this.min())) * 100;
    return `linear-gradient(to right, var(--color-secondary) ${p}%, var(--color-surface-variant) ${p}%)`;
  });

  protected onInput(event: Event): void {
    this.sizeChange.emit(Number((event.target as HTMLInputElement).value));
  }
}
