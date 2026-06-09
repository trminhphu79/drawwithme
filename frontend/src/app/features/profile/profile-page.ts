import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PreferencesStore } from '../../core/stores/preferences.store';
import { AVATARS, avatarUrl } from '../../core/models/avatars';
import { AppFooter } from '../../core/ui/app-footer';

/**
 * SMART. The user's profile page — pick an avatar + display name (persisted to
 * localStorage) and copy your client id (to hand to an admin / room host). This
 * replaces the old in-lobby "edit profile" modal.
 */
@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AppFooter],
  template: `
    <div class="min-h-screen flex flex-col bg-background text-on-background">
      <header
        class="sticky top-0 z-20 glass-panel border-b border-white/10 px-margin-mobile md:px-margin-desktop py-3 flex items-center justify-between gap-3">
        <a
          routerLink="/join"
          class="flex items-center gap-2 hover:opacity-80 active:scale-95 transition-all">
          <img src="logo.png" alt="" class="w-9 h-9 rounded-lg object-contain" />
          <span class="text-headline-md font-extrabold brand-gradient hidden sm:inline"
            >DrawWithMe</span
          >
        </a>
        <a
          routerLink="/join"
          class="flex items-center gap-1 text-label-md font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
          <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to rooms
        </a>
      </header>

      <main
        class="grow w-full max-w-xl mx-auto px-margin-mobile md:px-0 py-6 flex flex-col gap-6">
        <div>
          <h1 class="text-display-lg font-extrabold leading-none">Profile</h1>
          <p class="text-body-sm text-on-surface-variant mt-1">
            How you appear to others in a room.
          </p>
        </div>

        <div class="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col gap-6">
          <!-- Avatar grid -->
          <div class="flex flex-col gap-3">
            <span class="text-label-sm font-bold uppercase opacity-60">Avatar</span>
            <div class="grid grid-cols-6 gap-2.5">
              @for (a of avatars; track a) {
                <button
                  type="button"
                  (click)="avatar.set(a)"
                  [attr.aria-pressed]="avatar() === a"
                  class="rounded-full overflow-hidden aspect-square ring-2 transition-transform hover:scale-110 active:scale-95"
                  [class.ring-secondary]="avatar() === a"
                  [class.ring-transparent]="avatar() !== a">
                  <img [src]="url(a)" [alt]="a" class="w-full h-full object-cover" />
                </button>
              }
            </div>
          </div>

          <!-- Name -->
          <div class="flex flex-col gap-2">
            <span class="text-label-sm font-bold uppercase opacity-60">Display name</span>
            <input
              class="w-full bg-on-surface/5 border-0 border-b-2 border-secondary/40 focus:border-secondary focus:ring-0 text-body-lg py-2.5 px-3 rounded-t-lg transition-all outline-none placeholder:text-on-surface-variant/50 text-on-surface"
              placeholder="Your name"
              type="text"
              maxlength="24"
              [value]="name()"
              (input)="name.set($any($event.target).value)"
              (keyup.enter)="save()" />
            @if (!valid()) {
              <span class="text-body-sm text-on-surface-variant/70">Use at least 2 characters.</span>
            }
          </div>

          <!-- Client id (copy to hand to an admin / host) -->
          <div class="flex flex-col gap-2">
            <span class="text-label-sm font-bold uppercase opacity-60">Your ID</span>
            <button
              type="button"
              (click)="copyId()"
              title="Copy your ID"
              class="flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl bg-on-surface/5 hover:bg-on-surface/10 active:scale-[0.99] transition-all text-on-surface-variant">
              <span class="font-mono text-xs truncate">{{ clientId() }}</span>
              <span class="flex items-center gap-1.5 shrink-0 text-label-md font-semibold">
                <span class="material-symbols-outlined text-[18px]">{{
                  copied() ? 'check' : 'content_copy'
                }}</span>
                {{ copied() ? 'Copied!' : 'Copy' }}
              </span>
            </button>
            <span class="text-body-sm text-on-surface-variant/70">
              Share this with an admin to be assigned as a room host.
            </span>
          </div>

          <button
            type="button"
            (click)="save()"
            [disabled]="!valid()"
            class="px-5 py-3 rounded-xl text-label-lg font-bold bg-secondary text-on-secondary shadow-sm hover:brightness-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1">
            <span class="material-symbols-outlined text-[20px]">{{
              saved() ? 'check' : 'save'
            }}</span>
            {{ saved() ? 'Saved!' : 'Save profile' }}
          </button>
        </div>

        <app-footer />
      </main>
    </div>
  `,
})
export class ProfilePage {
  private readonly prefs = inject(PreferencesStore);
  private readonly router = inject(Router);

  protected readonly avatars = AVATARS;
  protected readonly url = avatarUrl;
  protected readonly clientId = this.prefs.clientId;

  protected readonly name = signal(this.prefs.displayName());
  protected readonly avatar = signal(this.prefs.avatar() || AVATARS[0]);
  protected readonly copied = signal(false);
  protected readonly saved = signal(false);

  protected readonly valid = computed(() => this.name().trim().length >= 2);

  protected save(): void {
    if (!this.valid()) return;
    this.prefs.setDisplayName(this.name().trim());
    this.prefs.setAvatar(this.avatar());
    this.saved.set(true);
    setTimeout(() => this.router.navigate(['/join']), 600);
  }

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
