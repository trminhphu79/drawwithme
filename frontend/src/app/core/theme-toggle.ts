import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeStore } from './theme.store';

/** Small light/dark toggle button bound to the global ThemeStore. */
@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      (click)="theme.toggle()"
      [title]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
      aria-label="Toggle color theme"
      class="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-on-surface/5 hover:scale-110 active:scale-95 transition-all">
      <span class="material-symbols-outlined">{{ theme.isDark() ? 'light_mode' : 'dark_mode' }}</span>
    </button>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeStore);
}
