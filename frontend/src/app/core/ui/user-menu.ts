import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { avatarUrl } from '../models/avatars';

/**
 * DUMB. Avatar button that opens a small dropdown (Profile / My Rooms). Used in
 * the lobby header and the room top bar. Closes on outside click, Esc, or after
 * an item is picked. The parent decides what each item does (navigate / modal).
 */
@Component({
  selector: 'app-user-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'close()',
    '(document:keydown.escape)': 'close()',
  },
  template: `
    <div class="relative" (click)="$event.stopPropagation()">
      <button
        type="button"
        (click)="open.set(!open())"
        [attr.aria-expanded]="open()"
        [title]="(name() || 'You') + ' — menu'"
        class="flex rounded-full ring-2 ring-secondary/40 hover:ring-secondary active:scale-95 transition-all shrink-0">
        <img
          [src]="url(avatar())"
          [alt]="name()"
          class="w-9 h-9 rounded-full object-cover bg-surface-variant" />
      </button>

      @if (open()) {
        <div
          class="absolute right-0 mt-2 w-52 bg-surface-container-high rounded-xl elevation-3 border border-outline-variant/40 p-1.5 flex flex-col gap-0.5 z-[130]">
          <div class="px-3 py-2 border-b border-outline-variant/30 mb-1">
            <p class="text-label-md font-bold text-on-surface truncate">{{ name() || 'You' }}</p>
            <p class="text-body-sm text-on-surface-variant">Your account</p>
          </div>
          <button
            type="button"
            (click)="pick('profile')"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-label-md font-semibold text-on-surface hover:bg-on-surface/10 active:scale-[0.98] transition-all text-left">
            <span class="material-symbols-outlined text-[20px] text-secondary">person</span>
            Profile
          </button>
          <button
            type="button"
            (click)="pick('rooms')"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-label-md font-semibold text-on-surface hover:bg-on-surface/10 active:scale-[0.98] transition-all text-left">
            <span class="material-symbols-outlined text-[20px] text-secondary">meeting_room</span>
            My Rooms
          </button>
        </div>
      }
    </div>
  `,
})
export class UserMenu {
  readonly avatar = input('');
  readonly name = input('');

  readonly profile = output<void>();
  readonly myRooms = output<void>();

  protected readonly url = avatarUrl;
  protected readonly open = signal(false);

  protected close(): void {
    this.open.set(false);
  }

  protected pick(which: 'profile' | 'rooms'): void {
    this.open.set(false);
    if (which === 'profile') this.profile.emit();
    else this.myRooms.emit();
  }
}
