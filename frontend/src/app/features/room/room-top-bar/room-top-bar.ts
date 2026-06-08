import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Participant } from '../participant.model';
import { ThemeToggle } from '../../../core/theme-toggle';

/** DUMB. Glassmorphism top navigation bar for the drawing room. */
@Component({
  selector: 'app-room-top-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThemeToggle],
  template: `
    <nav
      class="glass-panel border-b border-white/20 shadow-sm flex justify-between items-center px-margin-mobile md:px-margin-desktop w-full z-50 fixed top-0 h-[var(--app-header-h)] pt-[env(safe-area-inset-top)]">
      <div class="flex items-center gap-3">
        <button
          type="button"
          (click)="toggleLeftPanel.emit()"
          [title]="leftPanelOpen() ? 'Collapse chat' : 'Show chat'"
          class="hidden lg:flex w-10 h-10 items-center justify-center rounded-lg transition-colors"
          [class]="leftPanelOpen() ? 'text-rose-500 bg-rose-500/10' : 'text-on-surface-variant hover:bg-on-surface/5'">
          <span class="material-symbols-outlined">dock_to_right</span>
        </button>
        <button
          type="button"
          (click)="home.emit()"
          title="Back to home"
          class="flex items-center gap-2 hover:opacity-80 active:scale-95 transition-all">
          <img src="logo.png" alt="" class="w-8 h-8 rounded-lg object-contain" />
          <span class="text-headline-md font-extrabold text-primary hidden sm:inline">DrawWithMe</span>
        </button>
        <span
          class="hidden lg:inline text-label-sm text-on-surface-variant bg-surface-variant/50 px-3 py-1 rounded-full border border-outline-variant">
          #{{ roomCode() }}
        </span>
        <!-- Editable artwork title (used for the saved file name) -->
        <input
          [value]="title()"
          (input)="titleChange.emit($any($event.target).value)"
          placeholder="Untitled"
          maxlength="120"
          title="Artwork title (used when you save)"
          class="min-w-0 w-28 sm:w-40 md:w-56 bg-transparent border-b border-transparent hover:border-outline-variant/60 focus:border-secondary text-on-surface font-label-md py-1 outline-none transition-colors placeholder:text-on-surface-variant/50" />
        <span
          class="w-2 h-2 rounded-full shrink-0"
          [class]="connected() ? 'bg-secondary-container' : 'bg-outline'"
          [title]="connected() ? 'Connected' : 'Offline'"></span>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          (click)="chatToggle.emit()"
          title="Toggle chat"
          class="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors">
          <span class="material-symbols-outlined">forum</span>
        </button>
        <div class="flex -space-x-3 items-center mr-1">
          @for (p of participants(); track p.id) {
            <div
              class="w-8 h-8 rounded-full border-2 border-surface shadow-sm flex items-center justify-center text-xs font-bold"
              [class]="p.colorClass"
              [title]="p.name">
              {{ p.name.charAt(0) }}
            </div>
          }
        </div>

        <button
          type="button"
          (click)="invite.emit()"
          class="bg-primary-container text-on-primary px-4 py-2 rounded-lg font-label-md hover:scale-95 active:scale-90 transition-transform flex items-center gap-1">
          <span class="material-symbols-outlined text-[18px]">person_add</span>
          <span class="hidden sm:inline">Invite</span>
        </button>
        <button
          type="button"
          (click)="finish.emit()"
          title="Finish"
          class="glass-panel px-3 sm:px-4 py-2 rounded-lg font-label-md text-on-surface hover:bg-on-surface/5 transition-colors flex items-center gap-1">
          <span class="material-symbols-outlined text-[18px]">check_circle</span>
          <span class="hidden sm:inline">Finish</span>
        </button>

        <button
          type="button"
          (click)="toggleRightPanel.emit()"
          [title]="rightPanelOpen() ? 'Collapse properties' : 'Show properties'"
          class="hidden lg:flex w-10 h-10 items-center justify-center rounded-lg transition-colors"
          [class]="rightPanelOpen() ? 'text-secondary bg-secondary/10' : 'text-on-surface-variant hover:bg-on-surface/5'">
          <span class="material-symbols-outlined">dock_to_left</span>
        </button>

        <app-theme-toggle />
      </div>
    </nav>
  `,
})
export class RoomTopBar {
  readonly roomCode = input.required<string>();
  readonly participants = input<Participant[]>([]);
  readonly connected = input(false);
  readonly leftPanelOpen = input(true);
  readonly rightPanelOpen = input(true);
  readonly title = input('Untitled');

  readonly invite = output<void>();
  readonly finish = output<void>();
  readonly chatToggle = output<void>();
  readonly toggleLeftPanel = output<void>();
  readonly toggleRightPanel = output<void>();
  readonly reset = output<void>();
  readonly home = output<void>();
  readonly propsToggle = output<void>();
  readonly titleChange = output<string>();
}
