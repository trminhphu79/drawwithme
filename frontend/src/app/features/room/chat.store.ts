import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { SocketService } from '../../core/services/socket.service';
import { PreferencesStore } from '../../core/stores/preferences.store';
import { SoundService } from '../../core/services/sound.service';
import { ChatService } from './chat.service';
import { ChatMessage, ReactionEvent } from './chat.model';

/**
 * Feature store for room chat + emoji reactions. Shares the singleton socket
 * (the DrawingStore owns connect + room:join). Messages and reactions are
 * broadcast by the server to EVERYONE (including the sender) so ordering and
 * animation timing stay identical across clients. Plays sounds on receipt.
 * Provided at the DrawingRoom smart-component scope.
 */
@Injectable()
export class ChatStore {
  private readonly socket = inject(SocketService);
  private readonly chat = inject(ChatService);
  private readonly prefs = inject(PreferencesStore);
  private readonly sound = inject(SoundService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _reactions = signal<ReactionEvent[]>([]);

  readonly messages = this._messages.asReadonly();
  readonly reactions = this._reactions.asReadonly();

  private code = '';
  private myId = '';

  readonly myIdSig = signal('');
  readonly isMuted = this.sound.muted;
  readonly hasMessages = computed(() => this._messages().length > 0);

  /** Bumps on every chat message received from someone else (drives the
   *  "new message" indicator on the chat bubble when the panel is closed). */
  private readonly _incoming = signal(0);
  readonly incomingCount = this._incoming.asReadonly();

  async init(code: string): Promise<void> {
    this.code = code;
    this.socket.connect();
    // Identify "my" messages by the stable client id (not the socket id, which
    // changes on every refresh/reconnect — that made own messages show as theirs).
    this.setMyId(this.prefs.clientId());

    try {
      const history = await firstValueFrom(this.chat.getMessages(code));
      if (history?.length) this._messages.set(history);
    } catch {
      /* API unavailable — start empty. */
    }

    this.socket
      .on<ChatMessage>('chat:message')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg) => this.onMessage(msg));

    this.socket
      .on<ReactionEvent>('reaction:show')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((r) => this.onReaction(r));
  }

  // ---- actions ----
  send(text: string): void {
    const body = text.trim();
    if (!body) return;
    this.socket.emit('chat:send', {
      code: this.code,
      text: body,
      name: this.prefs.displayName(),
      avatar: this.prefs.avatar(),
    });
    this.sound.sendMessage();
  }

  react(emoji: string): void {
    const x = Math.round(Math.random() * 60 + 20); // 20–80% of canvas width
    this.socket.emit('reaction:send', {
      code: this.code,
      emoji,
      x,
      name: this.prefs.displayName(),
    });
  }

  toggleMute(): void {
    this.sound.toggleMute();
  }

  isSelf(authorId: string): boolean {
    return authorId === this.myId;
  }

  // ---- handlers ----
  private onMessage(msg: ChatMessage): void {
    if (!msg) return;
    const isNew = !this._messages().some((m) => m.id === msg.id);
    this._messages.update((list) => (isNew ? [...list, msg] : list));
    if (isNew && !msg.system && msg.authorId !== this.myId) {
      this.sound.receiveMessage();
      this._incoming.update((n) => n + 1);
    }
  }

  private onReaction(r: ReactionEvent): void {
    if (!r) return;
    const event: ReactionEvent = { ...r, id: r.id || crypto.randomUUID() };
    this._reactions.update((list) => [...list, event]);
    this.sound.pop();
    // Match the 2.8s float-up animation, then drop it.
    setTimeout(() => {
      this._reactions.update((list) => list.filter((e) => e.id !== event.id));
    }, 4000);
  }

  private setMyId(id: string): void {
    this.myId = id;
    this.myIdSig.set(id);
  }
}
