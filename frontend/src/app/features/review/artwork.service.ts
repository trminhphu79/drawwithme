import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api.config';
import { Artwork } from './artwork.model';

/** REST client for completed artworks. */
@Injectable({ providedIn: 'root' })
export class ArtworkService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/artworks`;

  getArtwork(id: string): Observable<Artwork> {
    return this.http.get<Artwork>(`${this.base}/${id}`);
  }
}
