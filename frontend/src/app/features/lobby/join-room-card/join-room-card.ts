import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ThemeToggle } from '../../../core/ui/theme-toggle';

/**
 * DUMB / presentational. Collects the room code and emits join/create intents.
 * The display name + avatar are now chosen inside the room (profile gate).
 */
@Component({
  selector: 'app-join-room-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThemeToggle],
  templateUrl: './join-room-card.html',
})
export class JoinRoomCard {
  readonly code = input.required<string>();
  readonly canJoin = input(false);
  readonly canCreate = input(false);
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly codeChange = output<string>();
  readonly join = output<void>();
  /** Emits whether the new room should require host approval to join. */
  readonly create = output<boolean>();

  /** Local toggle: require my approval before others join the room I create. */
  protected readonly requireApproval = signal(false);

  protected onCode(event: Event): void {
    this.codeChange.emit((event.target as HTMLInputElement).value);
  }
}
