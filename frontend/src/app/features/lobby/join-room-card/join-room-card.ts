import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * DUMB / presentational. Collects the room code and emits join/create intents.
 * The display name + avatar are now chosen inside the room (profile gate).
 */
@Component({
  selector: 'app-join-room-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly create = output<void>();

  protected onCode(event: Event): void {
    this.codeChange.emit((event.target as HTMLInputElement).value);
  }
}
