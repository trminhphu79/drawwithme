import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { JoinRoomStore } from '../join-room.store';
import { JoinRoomCard } from '../join-room-card/join-room-card';
import { PreferencesStore } from '../../../core/preferences.store';

/**
 * SMART / container. Provides the JoinRoomStore, binds the display name to the
 * global PreferencesStore, requires a name before entering, and navigates on
 * success.
 */
@Component({
  selector: 'app-join-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JoinRoomCard],
  providers: [JoinRoomStore],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background text-on-background">
      <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div class="absolute top-[20%] left-[15%] w-3 h-3 bg-secondary rounded-full opacity-30 blur-[2px]"></div>
        <div class="absolute top-[60%] right-[20%] w-6 h-6 bg-secondary-container rounded-sm opacity-20 blur-[3px] rotate-12"></div>
        <div class="absolute bottom-[30%] left-[25%] w-4 h-4 bg-primary-container rounded-full opacity-25 blur-[1px]"></div>
        <div class="absolute top-[35%] right-[28%] w-5 h-5 bg-secondary rounded-full opacity-20 blur-[2px]"></div>
      </div>

      <main class="relative z-10 w-full max-w-md px-margin-mobile md:px-0">
        <app-join-room-card
          [name]="name()"
          [code]="store.code()"
          [canJoin]="canJoin()"
          [canCreate]="nameValid()"
          [busy]="store.busy()"
          [error]="store.error()"
          (nameChange)="setName($event)"
          (codeChange)="store.setCode($event)"
          (join)="onJoin()"
          (create)="onCreate()" />

        <div class="mt-8 text-center flex gap-4 justify-center text-body-sm text-on-surface-variant">
          <a class="hover:text-secondary transition-colors" href="#">Help</a>
          <span>·</span>
          <a class="hover:text-secondary transition-colors" href="#">Terms</a>
        </div>
      </main>
    </div>
  `,
})
export class JoinRoom {
  protected readonly store = inject(JoinRoomStore);
  private readonly prefs = inject(PreferencesStore);
  private readonly router = inject(Router);

  protected readonly name = signal(this.initialName());
  protected readonly nameValid = computed(() => this.name().trim().length >= 2);
  protected readonly canJoin = computed(() => this.store.canJoin() && this.nameValid());

  protected setName(value: string): void {
    this.name.set(value);
  }

  protected async onJoin(): Promise<void> {
    if (!this.commitName()) return;
    const room = await this.store.join();
    if (room) this.router.navigate(['/room', room.code]);
  }

  protected async onCreate(): Promise<void> {
    if (!this.commitName()) return;
    const room = await this.store.create();
    if (room) this.router.navigate(['/room', room.code]);
  }

  private commitName(): boolean {
    const name = this.name().trim();
    if (name.length < 2) return false;
    this.prefs.setDisplayName(name);
    return true;
  }

  private initialName(): string {
    return this.prefs.hasProfile() ? this.prefs.displayName() : '';
  }
}
