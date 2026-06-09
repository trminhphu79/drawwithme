import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { AVATARS, avatarUrl } from '../../../core/models/avatars';

export interface Profile {
  name: string;
  avatar: string;
}

/**
 * Blocking modal to pick an avatar + display name. Used both as the room-entry
 * gate (Back = leave) and the header "edit profile" modal (Back = cancel).
 */
@Component({
  selector: 'app-profile-gate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-gate.html',
})
export class ProfileGate {
  readonly initialName = input('');
  readonly initialAvatar = input('');
  readonly heading = input('Join the room');
  readonly backLabel = input('Back');
  /** When set, show a "Copy my ID" button (used in the edit-profile modal). */
  readonly clientId = input('');

  readonly save = output<Profile>();
  readonly back = output<void>();

  protected readonly avatars = AVATARS;
  protected readonly url = avatarUrl;
  protected readonly name = signal('');
  protected readonly avatar = signal(AVATARS[0]);
  protected readonly copied = signal(false);
  private inited = false;

  constructor() {
    effect(() => {
      // Initialise from inputs once they're bound.
      const a = this.initialAvatar();
      if (this.inited) return;
      this.name.set(this.initialName());
      this.avatar.set(a || AVATARS[0]);
      this.inited = true;
    });
  }

  protected valid(): boolean {
    return this.name().trim().length >= 2;
  }

  protected submit(): void {
    if (!this.valid()) return;
    this.save.emit({ name: this.name().trim(), avatar: this.avatar() });
  }

  /** Copy the user's client id (to hand to an admin for host assignment). */
  protected copyId(): void {
    const id = this.clientId();
    if (!id) return;
    const done = () => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    };
    try {
      navigator.clipboard?.writeText(id).then(done, done) ?? done();
    } catch {
      done();
    }
  }
}
