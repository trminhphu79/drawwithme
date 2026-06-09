import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Participant } from '../participant.model';
import { avatarUrl } from '../../../core/models/avatars';
import { cursorColor } from '../../../core/models/cursor-colors';
import { UserMenu } from '../../../core/ui/user-menu';

/** DUMB. Glassmorphism top navigation bar for the drawing room. */
@Component({
  selector: 'app-room-top-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserMenu],
  template: `
    <nav
      class="glass-panel border-b border-white/20 shadow-sm flex justify-between items-center px-margin-mobile md:px-margin-desktop w-full z-50 fixed top-0 h-(--app-header-h) pt-[env(safe-area-inset-top)]">
      <div class="flex items-center gap-3">
        <button
          type="button"
          (click)="home.emit()"
          title="Back to home"
          class="flex items-center gap-2 hover:opacity-80 active:scale-95 transition-all">
          <img src="logo.png" alt="" class="w-8 h-8 rounded-lg object-contain" />
          <span class="text-headline-md font-extrabold brand-gradient hidden sm:inline">DrawWithMe</span>
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

        <!-- Finish & save the artwork -->
        <button
          type="button"
          (click)="finish.emit()"
          [disabled]="!canFinish()"
          [title]="canFinish() ? 'Finish & save' : 'Draw something first'"
          class="ml-1 shrink-0 flex items-center gap-1 h-9 px-3 rounded-lg bg-secondary text-on-secondary font-label-md shadow-sm hover:brightness-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100">
          <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1;">check_circle</span>
          Done
        </button>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex -space-x-3 items-center mr-1">
          @for (p of participants(); track p.id) {
            @if (p.avatar) {
              <img
                [src]="url(p.avatar)"
                [alt]="p.name"
                [title]="p.name"
                class="w-8 h-8 rounded-full border-2 border-surface shadow-sm object-cover bg-surface-variant" />
            } @else {
              <div
                class="w-8 h-8 rounded-full border-2 border-surface shadow-sm flex items-center justify-center text-xs font-bold"
                [class]="color(p.colorIndex).pill"
                [title]="p.name">
                {{ p.name.charAt(0) }}
              </div>
            }
          }
        </div>

        <button
          type="button"
          (click)="invite.emit()"
          class="brand-bg px-4 py-2 rounded-lg font-label-md hover:brightness-105 hover:scale-95 active:scale-90 transition-all flex items-center gap-1 shadow-sm">
          <span class="material-symbols-outlined text-[18px]">person_add</span>
          <span class="hidden sm:inline">Invite</span>
        </button>

        <!-- Your profile menu — Profile (edit modal) / My Rooms -->
        <app-user-menu
          [avatar]="myAvatar()"
          [name]="myName()"
          (profile)="editProfile.emit()"
          (myRooms)="myRooms.emit()" />
      </div>
    </nav>
  `,
})
export class RoomTopBar {
  protected readonly url = avatarUrl;
  protected readonly color = cursorColor;

  readonly roomCode = input.required<string>();
  readonly participants = input<Participant[]>([]);
  readonly connected = input(false);
  readonly canFinish = input(true);
  readonly title = input('Untitled');
  readonly myAvatar = input('');
  readonly myName = input('');

  readonly invite = output<void>();
  readonly editProfile = output<void>();
  readonly myRooms = output<void>();
  readonly home = output<void>();
  readonly finish = output<void>();
  readonly titleChange = output<string>();
}
