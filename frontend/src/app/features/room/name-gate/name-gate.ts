import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

/**
 * DUMB. Blocking modal that asks for a display name before entering the room.
 * Shown by the smart container when no name has been set yet.
 */
@Component({
  selector: 'app-name-gate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-margin-mobile bg-on-surface/40 backdrop-blur-sm">
      <div class="glass-panel rounded-xl elevation-3 w-full max-w-sm p-8 flex flex-col items-center text-center">
        <div class="w-14 h-14 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary mb-4">
          <span class="material-symbols-outlined text-[28px]">badge</span>
        </div>
        <h2 class="text-headline-md font-bold text-on-surface mb-1">What's your name?</h2>
        <p class="text-body-md text-on-surface-variant mb-6">Others in the room will see this.</p>

        <input
          #nameInput
          class="w-full bg-on-surface/5 border-0 border-b-2 border-outline-variant focus:border-secondary focus:ring-0 text-body-lg text-on-surface py-2 px-3 rounded-t-lg outline-none transition-all text-center mb-6"
          placeholder="Your display name"
          maxlength="24"
          [value]="initial()"
          (input)="draft.set($any($event.target).value)"
          (keyup.enter)="submit()" />

        <button
          type="button"
          (click)="submit()"
          [disabled]="!valid()"
          class="w-full bg-secondary text-on-secondary font-label-md uppercase py-3 rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          Enter Room
          <span class="material-symbols-outlined text-[18px]">login</span>
        </button>
      </div>
    </div>
  `,
})
export class NameGate {
  readonly initial = input('');
  readonly submitName = output<string>();

  protected readonly draft = signal('');

  protected valid(): boolean {
    return (this.draft() || this.initial()).trim().length >= 2;
  }

  protected submit(): void {
    const name = (this.draft() || this.initial()).trim();
    if (name.length < 2) return;
    this.submitName.emit(name);
  }
}
