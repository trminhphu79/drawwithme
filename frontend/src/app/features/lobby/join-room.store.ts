import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LobbyService } from './lobby.service';
import { JoinMode, Room } from './room.model';
import { PreferencesStore } from '../../core/stores/preferences.store';

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

  readonly code = this._code.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly error = this._error.asReadonly();
  readonly canJoin = computed(() => this._code().trim().length >= 4 && !this._busy());

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
