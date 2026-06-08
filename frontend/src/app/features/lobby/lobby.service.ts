import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api.config';
import { CreateRoomRequest, JoinRoomRequest, Room } from './room.model';

/** REST client for room lifecycle (create / join / fetch). */
@Injectable({ providedIn: 'root' })
export class LobbyService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/rooms`;

  createRoom(body: CreateRoomRequest): Observable<Room> {
    return this.http.post<Room>(this.base, body);
  }

  joinRoom(body: JoinRoomRequest): Observable<Room> {
    return this.http.post<Room>(`${this.base}/join`, body);
  }

  getRoom(code: string): Observable<Room> {
    return this.http.get<Room>(`${this.base}/${code}`);
  }
}
