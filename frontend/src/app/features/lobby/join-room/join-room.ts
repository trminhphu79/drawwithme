import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { JoinRoomStore } from '../join-room.store';
import { AppFooter } from '../../../core/ui/app-footer';
import { InstallButton } from '../../../core/ui/install-button';
import { Skeleton } from '../../../core/ui/skeleton';
import { avatarUrl } from '../../../core/models/avatars';

/**
 * SMART / container. The lobby: a searchable, lazy-loaded list of active rooms
 * (cards with title / code / live members), a header code-join box, and create.
 */
@Component({
  selector: 'app-join-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppFooter, InstallButton, Skeleton],
  providers: [JoinRoomStore],
  template: `
    <div class="min-h-screen flex flex-col bg-background text-on-background">
      <!-- Header: logo + join-by-code -->
      <header
        class="sticky top-0 z-20 glass-panel border-b border-white/10 px-margin-mobile md:px-margin-desktop py-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 shrink-0">
          <img src="logo.png" alt="" class="w-9 h-9 rounded-lg object-contain" />
          <span class="text-headline-md font-extrabold brand-gradient hidden sm:inline">DrawWithMe</span>
        </div>
        <div class="flex items-center gap-2">
          <input
            aria-label="Room code"
            class="w-32 sm:w-44 bg-on-surface/5 border-0 border-b-2 border-outline-variant focus:border-secondary focus:ring-0 rounded-t-lg py-2 px-3 font-mono-label text-mono-label tracking-[0.15em] text-on-surface outline-none transition-all placeholder:text-on-surface-variant/50"
            placeholder="ENTER CODE"
            maxlength="12"
            [value]="store.code()"
            (input)="store.setCode($any($event.target).value)"
            (keyup.enter)="onJoin()" />
          <button
            type="button"
            (click)="onJoin()"
            [disabled]="!store.canJoin()"
            class="brand-bg px-4 py-2 rounded-lg font-label-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-1 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <span class="hidden sm:inline">Join</span>
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </header>

      <main class="grow w-full max-w-5xl mx-auto px-margin-mobile md:px-0 py-6 flex flex-col gap-5">
        <!-- Title + total + create -->
        <div class="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 class="text-display-lg font-extrabold leading-none">Rooms</h1>
            <p class="text-body-sm text-on-surface-variant mt-1">
              {{ store.total() }} active room{{ store.total() === 1 ? '' : 's' }}
            </p>
          </div>
          <button
            type="button"
            (click)="onCreate()"
            [disabled]="store.busy()"
            class="brand-bg px-5 py-3 rounded-lg font-label-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-1 shadow-sm disabled:opacity-40">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Create New Room
          </button>
        </div>

        <!-- Search -->
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[20px]">search</span>
          <input
            aria-label="Search rooms"
            class="w-full bg-on-surface/5 border border-outline-variant/40 focus:border-secondary focus:ring-0 rounded-xl py-3 pl-11 pr-4 text-body-md text-on-surface outline-none transition-all placeholder:text-on-surface-variant/50"
            placeholder="Search by code or title…"
            [value]="store.search()"
            (input)="store.setSearch($any($event.target).value)" />
        </div>

        @if (store.error()) {
          <p class="text-body-sm text-error flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">error</span>{{ store.error() }}
          </p>
        }

        <!-- Room grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (room of store.rooms(); track room.code) {
            <button
              type="button"
              (click)="enterRoom(room.code)"
              class="glass-panel rounded-xl p-4 text-left flex flex-col gap-4 hover:elevation-3 hover:-translate-y-0.5 active:scale-[0.99] transition-all">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-bold text-on-surface truncate flex-1">{{ room.name }}</h3>
                <span class="shrink-0 font-mono-label text-mono-label tracking-wider text-on-surface-variant bg-surface-variant/50 px-2 py-1 rounded-md border border-outline-variant/50">
                  #{{ room.code }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-2 mt-auto">
                @if (room.avatars.length) {
                  <div class="flex -space-x-2 items-center">
                    @for (a of room.avatars; track a) {
                      <img [src]="avatarUrl(a)" alt="" class="w-7 h-7 rounded-full object-cover border-2 border-surface bg-surface-variant" />
                    }
                  </div>
                  <span class="text-body-sm text-on-surface-variant">
                    {{ room.memberCount }} active
                  </span>
                } @else {
                  <span class="text-body-sm text-on-surface-variant/60 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">bedtime</span>
                    No one here yet
                  </span>
                }
              </div>
            </button>
          } @empty {
            @if (!store.listLoading()) {
              <div class="col-span-full text-center py-16 text-on-surface-variant/70 flex flex-col items-center gap-2">
                <span class="material-symbols-outlined text-[40px] text-secondary/40">grid_view</span>
                <p class="text-body-md">{{ store.search() ? 'No rooms match your search.' : 'No rooms yet — create the first one!' }}</p>
              </div>
            }
          }

          <!-- Loading skeletons -->
          @if (store.listLoading()) {
            @for (i of skeletons; track i) {
              <div class="glass-panel rounded-xl p-4 flex flex-col gap-4">
                <div class="flex items-center justify-between gap-2">
                  <app-skeleton class="h-5 w-32 rounded-md" />
                  <app-skeleton class="h-6 w-16 rounded-md" />
                </div>
                <app-skeleton class="h-7 w-24 rounded-full" />
              </div>
            }
          }
        </div>

        <!-- Infinite-scroll sentinel -->
        <div #sentinel class="h-1"></div>

        <div class="mt-2 flex justify-center">
          <app-install-button />
        </div>
        <app-footer />
      </main>
    </div>
  `,
})
export class JoinRoom {
  protected readonly store = inject(JoinRoomStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly avatarUrl = avatarUrl;
  protected readonly skeletons = [0, 1, 2];

  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  constructor() {
    void this.store.loadRooms();
    afterNextRender(() => {
      const el = this.sentinel()?.nativeElement;
      if (!el || typeof IntersectionObserver === 'undefined') return;
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) void this.store.loadMore();
        },
        { rootMargin: '300px' },
      );
      io.observe(el);
      this.destroyRef.onDestroy(() => io.disconnect());
    });
  }

  protected async onJoin(): Promise<void> {
    const room = await this.store.join();
    if (room) this.router.navigate(['/room', room.code]);
  }

  protected async onCreate(): Promise<void> {
    const room = await this.store.create();
    if (room) this.router.navigate(['/room', room.code]);
  }

  protected enterRoom(code: string): void {
    this.router.navigate(['/room', code]);
  }
}
