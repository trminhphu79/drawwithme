import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Reusable, responsive confirmation modal. The parent shows/hides it (e.g. with
 * @if) and handles confirm/cancel. Backdrop click and Esc both cancel.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cancel.emit()' },
  template: `
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center p-margin-mobile bg-on-surface/40 backdrop-blur-sm"
      (click)="cancel.emit()">
      <div
        class="glass-panel rounded-xl elevation-3 w-full max-w-sm p-6 sm:p-8 flex flex-col gap-4"
        (click)="$event.stopPropagation()">
        <div class="flex items-center gap-3">
          <div
            class="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            [class]="danger() ? 'bg-error/15 text-error' : 'bg-secondary/15 text-secondary'">
            <span class="material-symbols-outlined">{{ icon() }}</span>
          </div>
          <h2 class="text-headline-md font-bold text-on-surface">{{ title() }}</h2>
        </div>

        <p class="text-body-md text-on-surface-variant">{{ message() }}</p>

        <div class="flex flex-wrap gap-3 justify-end mt-1">
          <button
            type="button"
            (click)="cancel.emit()"
            class="flex-1 sm:flex-none px-5 py-2.5 rounded-lg font-label-md text-on-surface hover:bg-on-surface/5 active:scale-95 transition-all">
            {{ cancelLabel() }}
          </button>
          <button
            type="button"
            (click)="confirm.emit()"
            class="flex-1 sm:flex-none px-5 py-2.5 rounded-lg font-label-md bg-primary text-on-primary hover:brightness-110 active:scale-95 transition-all">
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialog {
  readonly title = input('Are you sure?');
  readonly message = input('');
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly danger = input(true);

  readonly confirm = output<void>();
  readonly cancel = output<void>();

  protected readonly icon = computed(() => (this.danger() ? 'delete' : 'help'));
}
