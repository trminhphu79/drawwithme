import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../admin.service';
import { AdminAuthService } from '../admin-auth.service';
import { AdminRoom, UpdateRoomPayload } from '../admin.model';

const PAGE = 20;
const CAPS = [2, 3, 4, 5, 8, 10];

/** Room Management: list rooms + edit their settings (name/status/join/capacity). */
@Component({
  selector: 'app-admin-rooms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <div class="w-full max-w-5xl mx-auto flex flex-col gap-5">
      <div class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-display-lg font-extrabold leading-none">Rooms</h1>
          <p class="text-body-sm text-on-surface-variant mt-1">{{ total() }} total</p>
        </div>
        <div class="relative w-64 max-w-full">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[20px]">search</span>
          <input
            class="w-full bg-on-surface/5 border border-outline-variant/40 focus:border-secondary focus:ring-0 rounded-xl py-2.5 pl-11 pr-4 text-body-md text-on-surface outline-none"
            placeholder="Search code or title…"
            [value]="search()"
            (input)="onSearch($any($event.target).value)" />
        </div>
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
                <span class="font-mono-label text-mono-label tracking-wider bg-surface-variant/50 px-2 py-1 rounded-md border border-outline-variant/50 shrink-0">#{{ room.code }}</span>
                <input
                  class="min-w-0 flex-1 bg-transparent border-b border-transparent hover:border-outline-variant/60 focus:border-secondary text-on-surface font-bold py-1 outline-none transition-colors"
                  [value]="room.name"
                  (input)="patch(room.code, { name: $any($event.target).value })" />
              </div>
              <span class="text-body-sm text-on-surface-variant flex items-center gap-1 shrink-0">
                <span class="material-symbols-outlined text-[16px]">group</span>{{ room.memberCount }}
                <span class="opacity-50">·</span>{{ room.createdAt | date: 'mediumDate' }}
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
              <!-- Status -->
              <div class="flex items-center gap-2">
                <span class="text-label-sm font-bold uppercase opacity-60">Status</span>
                @for (s of ['active', 'archived']; track s) {
                  <button type="button" (click)="patch(room.code, { status: $any(s) })"
                    class="px-3 py-1 rounded-full text-label-sm font-semibold transition-all"
                    [class]="room.status === s ? 'bg-secondary text-on-secondary' : 'bg-on-surface/5 text-on-surface-variant hover:bg-on-surface/10'">
                    {{ s }}
                  </button>
                }
              </div>
              <!-- Join mode -->
              <div class="flex items-center gap-2">
                <span class="text-label-sm font-bold uppercase opacity-60">Join</span>
                @for (m of ['auto', 'approval']; track m) {
                  <button type="button" (click)="patch(room.code, { joinMode: $any(m) })"
                    class="px-3 py-1 rounded-full text-label-sm font-semibold transition-all"
                    [class]="room.joinMode === m ? 'bg-secondary text-on-secondary' : 'bg-on-surface/5 text-on-surface-variant hover:bg-on-surface/10'">
                    {{ m }}
                  </button>
                }
              </div>
              <!-- Capacity -->
              <div class="flex items-center gap-2">
                <span class="text-label-sm font-bold uppercase opacity-60">Limit</span>
                <div class="flex items-center gap-1 bg-surface-variant/40 rounded-full p-1">
                  @for (n of caps; track n) {
                    <button type="button" (click)="patch(room.code, { capacity: n })"
                      class="w-8 h-8 rounded-full text-label-sm font-bold transition-all"
                      [class]="room.capacity === n ? 'bg-secondary text-on-secondary' : 'text-on-surface-variant hover:bg-on-surface/10'">
                      {{ n }}
                    </button>
                  }
                </div>
              </div>

              <button type="button" (click)="save(room)"
                [disabled]="!dirty().has(room.code) || saving() === room.code"
                class="ml-auto px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                @if (saving() === room.code) {
                  <span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                } @else {
                  <span class="material-symbols-outlined text-[18px]">save</span>
                }
                Save
              </button>
            </div>
          </div>
        } @empty {
          @if (!loading()) {
            <p class="text-center py-16 text-on-surface-variant/70">No rooms found.</p>
          }
        }
      </div>

      @if (loading()) {
        <p class="text-center text-on-surface-variant/60 py-4 flex items-center justify-center gap-2">
          <span class="material-symbols-outlined animate-spin">progress_activity</span> Loading…
        </p>
      }
      @if (hasMore() && !loading()) {
        <div class="flex justify-center">
          <button type="button" (click)="loadMore()"
            class="glass-panel border border-outline-variant px-6 py-3 rounded-lg font-label-md hover:bg-on-surface/5 active:scale-95 transition-all">
            Load more ({{ rooms().length }} of {{ total() }})
          </button>
        </div>
      }
    </div>
  `,
})
export class AdminRooms {
  private readonly api = inject(AdminService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly caps = CAPS;
  protected readonly rooms = signal<AdminRoom[]>([]);
  protected readonly total = signal(0);
  protected readonly search = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly dirty = signal<Set<string>>(new Set());
  protected readonly saving = signal<string | null>(null);

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    void this.fetch(true);
  }

  protected hasMore(): boolean {
    return this.rooms().length < this.total();
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.fetch(true), 300);
  }

  protected loadMore(): void {
    void this.fetch(false);
  }

  /** Update a room's fields locally + flag it dirty. */
  protected patch(code: string, partial: Partial<AdminRoom>): void {
    this.rooms.update((list) => list.map((r) => (r.code === code ? { ...r, ...partial } : r)));
    this.dirty.update((s) => new Set(s).add(code));
  }

  protected async save(room: AdminRoom): Promise<void> {
    this.saving.set(room.code);
    this.error.set(null);
    const payload: UpdateRoomPayload = {
      name: room.name,
      status: room.status as 'active' | 'archived',
      joinMode: room.joinMode,
      capacity: room.capacity,
    };
    try {
      const updated = await firstValueFrom(this.api.updateRoom(room.code, payload));
      this.rooms.update((list) => list.map((r) => (r.code === updated.code ? updated : r)));
      this.dirty.update((s) => {
        const next = new Set(s);
        next.delete(room.code);
        return next;
      });
    } catch (err) {
      if (!this.handleAuth(err)) this.error.set('Could not save changes.');
    } finally {
      this.saving.set(null);
    }
  }

  private async fetch(reset: boolean): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    const skip = reset ? 0 : this.rooms().length;
    try {
      const res = await firstValueFrom(this.api.listRooms(this.search(), skip, PAGE));
      this.total.set(res.total);
      this.rooms.update((cur) => (reset ? res.rooms : [...cur, ...res.rooms]));
    } catch (err) {
      if (!this.handleAuth(err)) this.error.set('Could not load rooms.');
    } finally {
      this.loading.set(false);
    }
  }

  /** On 401, drop the token and bounce to login. Returns true if handled. */
  private handleAuth(err: unknown): boolean {
    if ((err as { status?: number })?.status === 401) {
      this.auth.logout();
      this.router.navigate(['/admin/login']);
      return true;
    }
    return false;
  }
}
