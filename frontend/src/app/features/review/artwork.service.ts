import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/config/api.config';
import { Artwork } from './artwork.model';
import { DrawOperation } from '../room/operation.model';

/** REST client for completed artworks (by artwork id or room code). */
@Injectable({ providedIn: 'root' })
export class ArtworkService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/artworks`;

  getArtwork(id: string): Observable<Artwork> {
    return this.http.get<Artwork>(`${this.base}/${id}`);
  }

  /** Stored operation snapshot for replaying via the link. */
  getOperations(id: string): Observable<DrawOperation[]> {
    return this.http.get<DrawOperation[]>(`${this.base}/${id}/operations`);
  }
}
