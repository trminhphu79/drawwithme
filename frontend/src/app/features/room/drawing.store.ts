import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { SocketService } from '../../core/services/socket.service';
import { PreferencesStore } from '../../core/stores/preferences.store';
import { RoomService } from './room.service';
import { BrushSettings, PencilStyle, ToolId } from './tool.model';
import { DrawOperation, Point } from './operation.model';
import { Participant, RemoteCursor } from './participant.model';

/** Base swatches always shown in the palette, merged with saved colors. */
const BASE_PALETTE = [
  '#1b1c19', '#6f583c', '#897052', '#6a5c4a', '#605b53', '#e0c29f',
  '#f2e0c8', '#ba1a1a', '#7e3000', '#006591', '#3a7d44', '#ffffff',
];

/**
 * Feature signal store for the Drawing Room. Owns:
 *  - the event-sourced operation log (the canvas source of truth),
 *  - the active tool / brush settings,
 *  - participants + remote cursors,
 * and bridges to the realtime gateway (SocketService) + history (RoomService).
 * Provided at the smart DrawingRoom component scope.
 */
@Injectable()
export class DrawingStore {
  private readonly socket = inject(SocketService);
  private readonly rooms = inject(RoomService);
  private readonly prefs = inject(PreferencesStore);
  private readonly destroyRef = inject(DestroyRef);

  // ---- canvas state ----
  private readonly _operations = signal<DrawOperation[]>([]);
  private readonly _redo = signal<DrawOperation[]>([]);

  // ---- tool state ----
  private readonly _tool = signal<ToolId>('pencil');
  private readonly _size = signal(this.prefs.defaultBrushSize());
  private readonly _opacity = signal(this.prefs.defaultOpacity());
  private readonly _color = signal(this.prefs.recentColors()[0] ?? '#6f583c');
  private readonly _pencilStyle = signal<PencilStyle>('hard');
  private readonly _title = signal('Untitled');
  private readonly _referenceUrl = signal<string | null>(null);

  // ---- presence ----
  private readonly _participants = signal<Participant[]>([]);
  private readonly _cursors = signal<RemoteCursor[]>([]);

  private code = '';
  private myId = '';

  // ---- selectors ----
  readonly operations = this._operations.asReadonly();
  readonly tool = this._tool.asReadonly();
  readonly size = this._size.asReadonly();
  readonly opacity = this._opacity.asReadonly();
  readonly color = this._color.asReadonly();
  readonly pencilStyle = this._pencilStyle.asReadonly();
  readonly title = this._title.asReadonly();
  readonly referenceUrl = this._referenceUrl.asReadonly();
  readonly participants = this._participants.asReadonly();
  readonly cursors = this._cursors.asReadonly();
  readonly connected = this.socket.connected;

  readonly canUndo = computed(() => this._operations().length > 0);
  readonly canRedo = computed(() => this._redo().length > 0);
  readonly showBrushSettings = computed(() =>
    (['pencil', 'fill', 'eraser'] as ToolId[]).includes(this._tool()),
  );
  readonly recentColors = this.prefs.recentColors;
  readonly palette = computed(() => [
    ...new Set([...BASE_PALETTE, ...this.prefs.savedColors()]),
  ]);
  readonly brush = computed<BrushSettings>(() => ({
    tool: this._tool(),
    color: this._color(),
    size: this._size(),
    opacity: this._opacity() / 100,
    style: this._pencilStyle(),
  }));

  // ---- lifecycle ----
  /** Connect, join the room, load history and subscribe to live events. */
  async init(code: string): Promise<void> {
    this.code = code;
    const socket = this.socket.connect();
    this.myId = socket.id ?? '';

    // (Re)announce ourselves on every connect — incl. reconnects, where Socket.IO
    // assigns a fresh id. Without this a reconnected client drops out of the room
    // map and stops appearing in / receiving presence updates.
    const join = () => {
      this.myId = socket.id ?? '';
      this.socket.emit('room:join', {
        code,
        name: this.prefs.displayName(),
        avatar: this.prefs.avatar(),
      });
    };
    socket.on('connect', join);
    if (socket.connected) join();

    // Leaving the room (component destroyed) → tear down the shared socket so
    // we don't leak the connection or its listeners. The rx subscriptions below
    // are already cleaned up via takeUntilDestroyed.
    this.destroyRef.onDestroy(() => {
      socket.off('connect', join);
      this.socket.disconnect();
    });

    // History (best-effort — drawing works offline too).
    try {
      const ops = await firstValueFrom(this.rooms.getOperations(code));
      if (ops?.length) this._operations.set(ops);
    } catch {
      /* API not available yet — start with an empty canvas. */
    }

    this.socket
      .on<DrawOperation>('op:applied')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((op) => this.applyRemote(op));

    this.socket
      .on<{ id: string }>('op:undone')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ id }) => this.removeOperation(id));

    this.socket
      .on<Participant[]>('presence:update')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this._participants.set(list ?? []));

    this.socket
      .on<RemoteCursor>('cursor:move')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cursor) => this.upsertCursor(cursor));

    this.socket
      .on<void>('op:reset')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.clearLocal());

    this.socket
      .on<{ url: string }>('reference:updated')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ url }) => this._referenceUrl.set(url));

    this.socket
      .on<{ title: string }>('title:updated')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ title }) => this._title.set(title));
  }

  /** Broadcast a changed display name / avatar to everyone in the room. */
  updateProfile(): void {
    this.socket.emit('profile:update', {
      code: this.code,
      name: this.prefs.displayName(),
      avatar: this.prefs.avatar(),
    });
  }

  /** Upload/replace the shared reference image and broadcast it. */
  async setReference(dataUrl: string): Promise<void> {
    try {
      const { url } = await firstValueFrom(this.rooms.uploadReference(this.code, dataUrl));
      this._referenceUrl.set(url);
      this.socket.emit('reference:set', { code: this.code, url });
    } catch {
      /* upload failed — ignore */
    }
  }

  // ---- tool actions ----
  setTool(tool: ToolId): void {
    this._tool.set(tool);
  }
  setSize(size: number): void {
    this._size.set(size);
  }
  setOpacity(opacity: number): void {
    this._opacity.set(opacity);
  }
  setColor(color: string): void {
    this._color.set(color);
    this.prefs.pushRecentColor(color);
  }
  setPencilStyle(style: PencilStyle): void {
    this._pencilStyle.set(style);
    this._tool.set('pencil');
  }
  setTitle(title: string): void {
    this._title.set(title);
    this.socket.emit('title:set', { code: this.code, title });
  }
  // ---- drawing actions ----
  /** Commit a finished stroke/erase/fill from the canvas (optimistic local). */
  commit(op: Omit<DrawOperation, 'id' | 'authorId'>): void {
    const full: DrawOperation = { ...op, id: crypto.randomUUID(), authorId: this.myId };
    this._operations.update((ops) => [...ops, full]);
    this._redo.set([]);
    this.socket.emit('op:commit', { code: this.code, op: full });
  }

  undo(): void {
    const ops = this._operations();
    if (!ops.length) return;
    const last = ops[ops.length - 1];
    this._operations.set(ops.slice(0, -1));
    this._redo.update((r) => [...r, last]);
    this.socket.emit('op:undo', { code: this.code, id: last.id });
  }

  redo(): void {
    const redo = this._redo();
    if (!redo.length) return;
    const op = redo[redo.length - 1];
    this._redo.set(redo.slice(0, -1));
    this._operations.update((ops) => (ops.some((o) => o.id === op.id) ? ops : [...ops, op]));
    // Restore (un-undo) on the server, which re-broadcasts to others automatically.
    this.socket.emit('op:redo', { code: this.code, op });
  }

  /** Clear the whole canvas for everyone in the room. */
  reset(): void {
    this.clearLocal();
    this.socket.emit('op:reset', { code: this.code });
  }

  private clearLocal(): void {
    this._operations.set([]);
    this._redo.set([]);
  }

  /** Throttled cursor broadcast (called from the canvas component). */
  moveCursor(point: Point): void {
    this.socket.emit('cursor:move', { code: this.code, ...point });
  }

  /**
   * Persist a rasterized snapshot of the finished artwork (best-effort).
   * Returns the shareable artwork id, or null if persistence failed.
   */
  async seal(dataUrl: string): Promise<string | null> {
    // Usernames of everyone currently in the room (deduped).
    const names = this._participants().map((p) => p.name).filter(Boolean);
    const participants = names.length
      ? [...new Set(names)]
      : [this.prefs.displayName() || 'You'];
    try {
      const res = await firstValueFrom(
        this.rooms.saveSnapshot(this.code, dataUrl, this._title(), participants),
      );
      return res.id;
    } catch {
      return null;
    }
  }

  // ---- remote handlers ----
  private applyRemote(op: DrawOperation): void {
    if (!op || op.authorId === this.myId) return; // ignore our own echoes
    this._operations.update((ops) =>
      ops.some((o) => o.id === op.id) ? ops : [...ops, op],
    );
  }

  private removeOperation(id: string): void {
    this._operations.update((ops) => ops.filter((o) => o.id !== id));
  }

  private upsertCursor(cursor: RemoteCursor): void {
    if (!cursor || cursor.id === this.myId) return;
    this._cursors.update((list) => {
      const rest = list.filter((c) => c.id !== cursor.id);
      return [...rest, cursor];
    });
  }
}
