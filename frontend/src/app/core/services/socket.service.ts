import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/api.config';

/**
 * App-wide Socket.IO wrapper. Lazily connects on first use, mirrors connection
 * state into a signal, and exposes typed emit/on helpers. Feature stores use
 * this for the real-time canvas channel.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  readonly connected = signal(false);

  connect(): Socket {
    if (this.socket) return this.socket;
    const opts = {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
    };
    // Empty SOCKET_URL (production) → connect to the same origin (proxied by nginx).
    this.socket = SOCKET_URL ? io(SOCKET_URL, opts) : io(opts);
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
    // Close the connection promptly when the tab is closed/backgrounded so the
    // server drops our presence immediately (pagehide is more reliable than
    // beforeunload, esp. on mobile/iOS bfcache).
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.handlePageHide);
    }
    return this.socket;
  }

  private readonly handlePageHide = (): void => {
    this.socket?.disconnect();
  };

  emit<T>(event: string, payload: T): void {
    this.connect().emit(event, payload);
  }

  /** Subscribe to a server event; auto-removes the listener on unsubscribe. */
  on<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const socket = this.connect();
      const handler = (data: T) => subscriber.next(data);
      socket.on(event, handler);
      return () => socket.off(event, handler);
    });
  }

  disconnect(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.handlePageHide);
    }
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }
}
