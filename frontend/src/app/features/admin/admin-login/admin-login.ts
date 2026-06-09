import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../admin.service';
import { AdminAuthService } from '../admin-auth.service';

/** Admin login screen. */
@Component({
  selector: 'app-admin-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background text-on-background px-margin-mobile">
      <div class="glass-panel rounded-2xl elevation-3 w-full max-w-sm p-8 flex flex-col gap-5">
        <div class="text-center flex flex-col items-center gap-2">
          <img src="logo.png" alt="" class="w-12 h-12 rounded-xl object-contain" />
          <h1 class="text-headline-md font-extrabold text-on-surface">Admin</h1>
          <p class="text-body-sm text-on-surface-variant">Sign in to manage rooms.</p>
        </div>

        <input
          class="w-full bg-on-surface/5 border-0 border-b-2 border-outline-variant focus:border-secondary focus:ring-0 rounded-t-lg py-3 px-3 text-body-md text-on-surface outline-none transition-all"
          placeholder="Username"
          autocomplete="username"
          [value]="username()"
          (input)="username.set($any($event.target).value)"
          (keyup.enter)="submit()" />
        <input
          type="password"
          class="w-full bg-on-surface/5 border-0 border-b-2 border-outline-variant focus:border-secondary focus:ring-0 rounded-t-lg py-3 px-3 text-body-md text-on-surface outline-none transition-all"
          placeholder="Password"
          autocomplete="current-password"
          [value]="password()"
          (input)="password.set($any($event.target).value)"
          (keyup.enter)="submit()" />

        @if (error()) {
          <p class="text-body-sm text-error flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">error</span>{{ error() }}
          </p>
        }

        <button
          type="button"
          (click)="submit()"
          [disabled]="busy() || !username().trim() || !password()"
          class="w-full bg-primary text-on-primary font-label-md uppercase py-3.5 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
          @if (busy()) {
            <span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          } @else {
            Sign in
          }
        </button>
      </div>
    </div>
  `,
})
export class AdminLogin {
  private readonly api = inject(AdminService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(): Promise<void> {
    if (this.busy() || !this.username().trim() || !this.password()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(this.api.login(this.username().trim(), this.password()));
      this.auth.setToken(res.token);
      this.router.navigate(['/admin/rooms']);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      this.error.set(
        status === 401 ? 'Invalid username or password.' : 'Could not sign in. Try again.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
