import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/config/api.config';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginResponse, AdminRoom, AdminRoomList, UpdateRoomPayload } from './admin.model';

/** REST client for the admin panel. Attaches the bearer token on guarded calls. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AdminAuthService);
  private readonly base = `${API_URL}/admin`;

  login(username: string, password: string): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(`${this.base}/login`, { username, password });
  }

  listRooms(search: string, skip: number, take: number): Observable<AdminRoomList> {
    let params = new HttpParams().set('skip', skip).set('take', take);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<AdminRoomList>(`${this.base}/rooms`, {
      params,
      headers: this.authHeaders(),
    });
  }

  updateRoom(code: string, payload: UpdateRoomPayload): Observable<AdminRoom> {
    return this.http.patch<AdminRoom>(`${this.base}/rooms/${code}`, payload, {
      headers: this.authHeaders(),
    });
  }

  deleteRoom(code: string): Observable<{ deleted: true; code: string }> {
    return this.http.delete<{ deleted: true; code: string }>(`${this.base}/rooms/${code}`, {
      headers: this.authHeaders(),
    });
  }

  private authHeaders(): Record<string, string> {
    const token = this.auth.token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
