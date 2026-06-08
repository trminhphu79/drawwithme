import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/config/api.config';
import { ChatMessage } from './chat.model';

/** REST client for chat history. */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/rooms`;

  getMessages(code: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.base}/${code}/messages`);
  }
}
