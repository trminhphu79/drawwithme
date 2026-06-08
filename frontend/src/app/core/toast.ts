import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';

/**
 * Lightweight top-of-screen toast. Controlled by the `message` input: set a
 * string to show it, set null to fade it out. Responsive width (near full-width
 * on mobile, capped on tablet/desktop). The parent owns the auto-dismiss timer.
 */
@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed left-1/2 -translate-x-1/2 z-[120] pointer-events-none
             top-[calc(1rem_+_env(safe-area-inset-top))]
             w-[92vw] sm:w-auto sm:max-w-md md:max-w-lg
             transition-all duration-300 ease-out"
      [class.opacity-100]="visible()"
      [class.translate-y-0]="visible()"
      [class.opacity-0]="!visible()"
      [class.-translate-y-4]="!visible()">
      <div
        class="glass-panel rounded-2xl elevation-3 px-6 py-3 text-body-md font-semibold text-on-surface text-center">
        {{ text() }}
      </div>
    </div>
  `,
})
export class Toast {
  readonly message = input<string | null>(null);

  protected readonly text = signal('');
  protected readonly visible = computed(() => !!this.message());

  constructor() {
    // Keep the last text during the fade-out (so it doesn't blank mid-animation).
    effect(() => {
      const m = this.message();
      if (m) this.text.set(m);
    });
  }
}
