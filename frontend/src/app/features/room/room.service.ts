import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api.config';
import { DrawOperation } from './operation.model';

/** REST client for room canvas data (operation history + snapshots). */
@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/rooms`;

  /** Replay log for a room, ordered by sequence. */
  getOperations(code: string): Observable<DrawOperation[]> {
    return this.http.get<DrawOperation[]>(`${this.base}/${code}/operations`);
  }

  /** Persist a rasterized snapshot (final artwork) + optional title/participants. */
  saveSnapshot(
    code: string,
    dataUrl: string,
    title?: string,
    participants?: string[],
  ): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.base}/${code}/snapshot`, {
      dataUrl,
      title,
      participants,
    });
  }
}
