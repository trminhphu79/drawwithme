import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LobbyService } from './lobby.service';
import { JoinMode, Room, RoomSummary } from './room.model';
import { PreferencesStore } from '../../core/stores/preferences.store';

const PAGE_SIZE = 20;

/**
 * Feature signal store for the Join/Lobby screen. Owns the room-code input,
 * busy/error UI state, and orchestrates create/join via LobbyService.
 * Provided at the smart component scope.
 */
@Injectable()
export class JoinRoomStore {
  private readonly lobby = inject(LobbyService);
  private readonly prefs = inject(PreferencesStore);

  private readonly _code = signal('');
  private readonly _password = signal('');
  private readonly _busy = signal(false);
  private readonly _error = signal<string | null>(null);

  // ---- lobby room list ----
  private readonly _rooms = signal<RoomSummary[]>([]);
  private readonly _total = signal(0);
  private readonly _search = signal('');
  private readonly _listLoading = signal(false);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  readonly code = this._code.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly error = this._error.asReadonly();
  readonly canJoin = computed(() => this._code().trim().length >= 4 && !this._busy());

  readonly rooms = this._rooms.asReadonly();
  readonly total = this._total.asReadonly();
  readonly search = this._search.asReadonly();
  readonly listLoading = this._listLoading.asReadonly();
  readonly hasMore = computed(() => this._rooms().length < this._total());

  setCode(value: string): void {
    this._code.set(value.toUpperCase().replace(/\s+/g, ''));
    this._error.set(null);
  }

  setPassword(value: string): void {
    this._password.set(value);
  }

  async join(): Promise<Room | null> {
    const code = this._code().trim();
    if (code.length < 4) return null;
    return this.run(() =>
      this.lobby.joinRoom({ code, password: this._password() || undefined }),
    );
  }

  async create(joinMode: JoinMode = 'auto'): Promise<Room | null> {
    return this.run(() =>
      this.lobby.createRoom({ hostId: this.prefs.clientId(), joinMode }),
    );
  }

  // ---- room list ----
  /** Load the first page (or reload after a search change). */
  async loadRooms(): Promise<void> {
    await this.fetchPage(true);
  }

  /** Lazy-load the next page when scrolling. */
  async loadMore(): Promise<void> {
    if (this._listLoading() || !this.hasMore()) return;
    await this.fetchPage(false);
  }

  /** Debounced search by code / title. */
  setSearch(value: string): void {
    this._search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.fetchPage(true), 300);
  }

  private async fetchPage(reset: boolean): Promise<void> {
    if (this._listLoading()) return;
    this._listLoading.set(true);
    const skip = reset ? 0 : this._rooms().length;
    try {
      const res = await firstValueFrom(this.lobby.listRooms(this._search(), skip, PAGE_SIZE));
      this._total.set(res.total);
      this._rooms.update((cur) => (reset ? res.rooms : [...cur, ...res.rooms]));
    } catch {
      if (reset) {
        this._rooms.set([]);
        this._total.set(0);
      }
    } finally {
      this._listLoading.set(false);
    }
  }

  private async run(call: () => ReturnType<LobbyService['joinRoom']>): Promise<Room | null> {
    this._busy.set(true);
    this._error.set(null);
    try {
      return await firstValueFrom(call());
    } catch (err: unknown) {
      this._error.set(this.toMessage(err));
      return null;
    } finally {
      this._busy.set(false);
    }
  }

  private toMessage(err: unknown): string {
    const status = (err as { status?: number })?.status;
    if (status === 404) return 'Room not found. Check the code and try again.';
    if (status === 401 || status === 403) return 'Incorrect password.';
    if (status === 0 || status === undefined) return 'Cannot reach the server. Is the API running?';
    return 'Something went wrong. Please try again.';
  }
}
