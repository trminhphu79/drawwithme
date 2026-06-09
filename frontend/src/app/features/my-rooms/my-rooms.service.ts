import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/config/api.config';
import { ManageRoomPayload, ManagedRoom } from './my-rooms.model';

/** REST client for self-service room management (host authorized by client id). */
@Injectable({ providedIn: 'root' })
export class MyRoomsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/rooms`;

  /** Rooms the given client id hosts. */
  listMine(hostId: string): Observable<ManagedRoom[]> {
    const params = new HttpParams().set('hostId', hostId);
    return this.http.get<ManagedRoom[]>(`${this.base}/mine`, { params });
  }

  updateMine(code: string, payload: ManageRoomPayload): Observable<ManagedRoom> {
    return this.http.patch<ManagedRoom>(`${this.base}/${code}`, payload);
  }

  deleteMine(code: string, hostId: string): Observable<{ deleted: true; code: string }> {
    const params = new HttpParams().set('hostId', hostId);
    return this.http.delete<{ deleted: true; code: string }>(`${this.base}/${code}`, { params });
  }
}
