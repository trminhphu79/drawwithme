import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PreferencesStore } from '../../core/stores/preferences.store';
import { AppFooter } from '../../core/ui/app-footer';
import { ConfirmDialog } from '../../core/ui/confirm-dialog';
import { Skeleton } from '../../core/ui/skeleton';
import { MyRoomsService } from './my-rooms.service';
import { ManageRoomPayload, ManagedRoom } from './my-rooms.model';

const CAPS = [2, 3, 4, 5, 8, 10];

/**
 * SMART. "My Rooms" — rooms the current user hosts (matched by their stable
 * client id). They can rename, flip join mode / capacity / status, enter, or
 * delete each room (which removes ALL of its data). No login required: identity
 * is the localStorage client id, and the API authorizes each change against it.
 */
@Component({
  selector: 'app-my-rooms-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, AppFooter, ConfirmDialog, Skeleton],
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
        class="grow w-full max-w-4xl mx-auto px-margin-mobile md:px-0 py-6 flex flex-col gap-5">
        <div>
          <h1 class="text-display-lg font-extrabold leading-none">My Rooms</h1>
          <p class="text-body-sm text-on-surface-variant mt-1">
            Rooms you host — rename, tune access, or delete them.
          </p>
        </div>

        @if (error()) {
          <p class="text-body-sm text-error flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">error</span>{{ error() }}
          </p>
        }

        <div class="flex flex-col gap-3">
          @for (room of rooms(); track room.code) {
            <div class="glass-panel rounded-xl p-4 flex flex-col gap-4">
              <div class="flex items-center justify-between gap-3 flex-wrap">
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="font-mono-label text-mono-label tracking-wider bg-surface-variant/50 px-2 py-1 rounded-md border border-outline-variant/50 shrink-0"
                    >#{{ room.code }}</span
                  >
                  <input
                    class="min-w-0 flex-1 bg-transparent border-b border-transparent hover:border-outline-variant/60 focus:border-secondary text-on-surface font-bold py-1 outline-none transition-colors"
                    maxlength="120"
                    [value]="room.name"
                    (input)="patch(room.code, { name: $any($event.target).value })" />
                </div>
                <span
                  class="text-body-sm text-on-surface-variant flex items-center gap-1 shrink-0">
                  <span class="material-symbols-outlined text-[16px]">group</span
                  >{{ room.memberCount }}
                  <span class="opacity-50">·</span>{{ room.createdAt | date: 'mediumDate' }}
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
                <!-- Status -->
                <div class="flex items-center gap-2">
                  <span class="text-label-sm font-bold uppercase opacity-60">Status</span>
                  @for (s of ['active', 'archived']; track s) {
                    <button
                      type="button"
                      (click)="patch(room.code, { status: $any(s) })"
                      class="px-3 py-1 rounded-full text-label-sm font-semibold transition-all"
                      [class]="
                        room.status === s
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-on-surface/5 text-on-surface-variant hover:bg-on-surface/10'
                      ">
                      {{ s }}
                    </button>
                  }
                </div>
                <!-- Join mode -->
                <div class="flex items-center gap-2">
                  <span class="text-label-sm font-bold uppercase opacity-60">Join</span>
                  @for (m of ['auto', 'approval']; track m) {
                    <button
                      type="button"
                      (click)="patch(room.code, { joinMode: $any(m) })"
                      class="px-3 py-1 rounded-full text-label-sm font-semibold transition-all"
                      [class]="
                        room.joinMode === m
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-on-surface/5 text-on-surface-variant hover:bg-on-surface/10'
                      ">
                      {{ m }}
                    </button>
                  }
                </div>
                <!-- Capacity -->
                <div class="flex items-center gap-2">
                  <span class="text-label-sm font-bold uppercase opacity-60">Limit</span>
                  <div class="flex items-center gap-1 bg-surface-variant/40 rounded-full p-1">
                    @for (n of caps; track n) {
                      <button
                        type="button"
                        (click)="patch(room.code, { capacity: n })"
                        class="w-8 h-8 rounded-full text-label-sm font-bold transition-all"
                        [class]="
                          room.capacity === n
                            ? 'bg-secondary text-on-secondary'
                            : 'text-on-surface-variant hover:bg-on-surface/10'
                        ">
                        {{ n }}
                      </button>
                    }
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 flex-wrap pt-1 border-t border-outline-variant/20">
                <button
                  type="button"
                  (click)="enter(room.code)"
                  class="mt-3 px-4 py-2 rounded-lg bg-on-surface/5 text-on-surface font-label-md hover:bg-on-surface/10 active:scale-95 transition-all flex items-center gap-1">
                  <span class="material-symbols-outlined text-[18px]">login</span>
                  Enter
                </button>
                <div class="ml-auto mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    (click)="save(room)"
                    [disabled]="!dirty().has(room.code) || saving() === room.code"
                    class="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                    @if (saving() === room.code) {
                      <span class="material-symbols-outlined text-[18px] animate-spin"
                        >progress_activity</span
                      >
                    } @else {
                      <span class="material-symbols-outlined text-[18px]">save</span>
                    }
                    Save
                  </button>
                  <button
                    type="button"
                    (click)="confirmDeleteCode.set(room.code)"
                    [disabled]="deleting() === room.code"
                    title="Delete room + all its data"
                    class="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error active:scale-95 transition-all disabled:opacity-40">
                    @if (deleting() === room.code) {
                      <span class="material-symbols-outlined text-[20px] animate-spin"
                        >progress_activity</span
                      >
                    } @else {
                      <span class="material-symbols-outlined text-[20px]">delete</span>
                    }
                  </button>
                </div>
              </div>
            </div>
          } @empty {
            @if (!loading()) {
              <div
                class="text-center py-16 text-on-surface-variant/70 flex flex-col items-center gap-3">
                <span class="material-symbols-outlined text-[40px] text-secondary/40"
                  >meeting_room</span
                >
                <p class="text-body-md">You don’t host any rooms yet.</p>
                <a
                  routerLink="/join"
                  class="brand-bg px-5 py-2.5 rounded-lg font-label-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-1 shadow-sm">
                  <span class="material-symbols-outlined text-[18px]">add</span>
                  Create a room
                </a>
              </div>
            }
          }

          @if (loading()) {
            @for (i of [0, 1, 2]; track i) {
              <app-skeleton class="h-28 w-full rounded-xl" />
            }
          }
        </div>

        <app-footer />
      </main>
    </div>

    @if (confirmDeleteCode(); as code) {
      <app-confirm-dialog
        title="Delete this room?"
        [message]="
          'Permanently delete room #' +
          code +
          ' and ALL its data — strokes, chat, artworks and members. This cannot be undone.'
        "
        confirmLabel="Delete room"
        (confirm)="onConfirmDelete(code)"
        (cancel)="confirmDeleteCode.set(null)" />
    }
  `,
})
export class MyRoomsPage {
  private readonly api = inject(MyRoomsService);
  private readonly prefs = inject(PreferencesStore);
  private readonly router = inject(Router);

  protected readonly caps = CAPS;
  protected readonly rooms = signal<ManagedRoom[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly dirty = signal<Set<string>>(new Set());
  protected readonly saving = signal<string | null>(null);
  protected readonly confirmDeleteCode = signal<string | null>(null);
  protected readonly deleting = signal<string | null>(null);

  constructor() {
    void this.fetch();
  }

  protected enter(code: string): void {
    this.router.navigate(['/room', code]);
  }

  /** Update a room's fields locally + flag it dirty. */
  protected patch(code: string, partial: Partial<ManagedRoom>): void {
    this.rooms.update((list) => list.map((r) => (r.code === code ? { ...r, ...partial } : r)));
    this.dirty.update((s) => new Set(s).add(code));
  }

  protected async save(room: ManagedRoom): Promise<void> {
    this.saving.set(room.code);
    this.error.set(null);
    const payload: ManageRoomPayload = {
      requesterId: this.prefs.clientId(),
      name: room.name,
      status: room.status,
      joinMode: room.joinMode,
      capacity: room.capacity,
    };
    try {
      const updated = await firstValueFrom(this.api.updateMine(room.code, payload));
      this.rooms.update((list) => list.map((r) => (r.code === updated.code ? updated : r)));
      this.dirty.update((s) => {
        const next = new Set(s);
        next.delete(room.code);
        return next;
      });
    } catch {
      this.error.set('Could not save changes.');
    } finally {
      this.saving.set(null);
    }
  }

  protected async onConfirmDelete(code: string): Promise<void> {
    this.confirmDeleteCode.set(null);
    this.deleting.set(code);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.deleteMine(code, this.prefs.clientId()));
      this.rooms.update((list) => list.filter((r) => r.code !== code));
    } catch {
      this.error.set('Could not delete the room.');
    } finally {
      this.deleting.set(null);
    }
  }

  private async fetch(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(this.api.listMine(this.prefs.clientId()));
      this.rooms.set(list);
    } catch {
      this.error.set('Could not load your rooms.');
    } finally {
      this.loading.set(false);
    }
  }
}
