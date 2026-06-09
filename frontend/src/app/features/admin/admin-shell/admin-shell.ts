import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuthService } from '../admin-auth.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
}

/** Admin layout: top header + collapsible sidebar + routed content. */
@Component({
  selector: 'app-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="h-dvh flex flex-col bg-background text-on-background overflow-hidden">
      <!-- Header -->
      <header class="glass-panel border-b border-white/10 flex items-center justify-between gap-3 px-margin-mobile md:px-margin-desktop h-16 shrink-0">
        <div class="flex items-center gap-3">
          <button type="button" (click)="sidebarOpen.set(!sidebarOpen())"
            class="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-on-surface/10"
            aria-label="Toggle menu">
            <span class="material-symbols-outlined">menu</span>
          </button>
          <img src="logo.png" alt="" class="w-8 h-8 rounded-lg object-contain" />
          <span class="text-headline-md font-extrabold brand-gradient hidden sm:inline">DrawWithMe</span>
          <span class="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant bg-surface-variant/50 px-2 py-1 rounded-full">Admin</span>
        </div>
        <button type="button" (click)="logout()"
          class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-label-md text-on-surface hover:bg-on-surface/5 transition-colors">
          <span class="material-symbols-outlined text-[20px]">logout</span>
          <span class="hidden sm:inline">Sign out</span>
        </button>
      </header>

      <div class="flex-1 flex min-h-0">
        <!-- Sidebar -->
        <aside
          class="w-60 shrink-0 border-r border-white/10 glass-panel p-3 flex flex-col gap-1 absolute md:static z-30 h-[calc(100dvh-4rem)] md:h-auto transition-transform duration-200"
          [class.-translate-x-full]="!sidebarOpen()"
          [class.md:translate-x-0]="true">
          @for (item of nav; track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="bg-secondary/15 text-secondary"
              (click)="sidebarOpen.set(false)"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-label-md font-semibold text-on-surface-variant hover:bg-on-surface/5 transition-colors">
              <span class="material-symbols-outlined text-[22px]">{{ item.icon }}</span>
              {{ item.label }}
            </a>
          }
        </aside>

        <!-- Mobile backdrop -->
        @if (sidebarOpen()) {
          <div class="md:hidden fixed inset-0 top-16 bg-on-surface/40 backdrop-blur-sm z-20" (click)="sidebarOpen.set(false)"></div>
        }

        <!-- Content -->
        <main class="flex-1 min-w-0 overflow-y-auto p-margin-mobile md:p-margin-desktop">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AdminShell {
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly sidebarOpen = signal(false);
  protected readonly nav: NavItem[] = [{ label: 'Rooms', icon: 'meeting_room', link: '/admin/rooms' }];

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}
