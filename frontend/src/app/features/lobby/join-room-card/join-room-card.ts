import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ThemeToggle } from '../../../core/theme-toggle';

/**
 * DUMB / presentational. Collects display name + room code and emits intents.
 * No injected services — all data via inputs, all events via outputs.
 */
@Component({
  selector: 'app-join-room-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThemeToggle],
  templateUrl: './join-room-card.html',
})
export class JoinRoomCard {
  readonly name = input('');
  readonly code = input.required<string>();
  readonly canJoin = input(false);
  readonly canCreate = input(false);
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly nameChange = output<string>();
  readonly codeChange = output<string>();
  readonly join = output<void>();
  readonly create = output<void>();

  protected onName(event: Event): void {
    this.nameChange.emit((event.target as HTMLInputElement).value);
  }
  protected onCode(event: Event): void {
    this.codeChange.emit((event.target as HTMLInputElement).value);
  }
}
