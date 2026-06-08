import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DrawOperationDto, OperationsService } from './operations.service';
import { MessagesService } from '../messages/messages.service';

interface Presence {
  name: string;
  colorClass: string;
}

const CURSOR_COLORS = [
  'bg-secondary text-on-secondary',
  'bg-tertiary text-on-tertiary',
  'bg-primary text-on-primary',
  'bg-primary-container text-on-primary-container',
];

/**
 * Real-time canvas gateway. Strokes are persisted via OperationsService then
 * broadcast to OTHER room members (the author renders optimistically), so the
 * canvas stays consistent for late joiners (who load history over REST).
 */
@WebSocketGateway({
  cors: { origin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200').split(',') },
})
export class CanvasGateway implements OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  /** roomCode -> (socketId -> presence). */
  private readonly rooms = new Map<string, Map<string, Presence>>();
  /** Monotonic counters for unique reaction / system-message ids. */
  private reactionSeq = 0;
  private sysSeq = 0;

  constructor(
    private readonly operations: OperationsService,
    private readonly messages: MessagesService,
  ) {}

  @SubscribeMessage('room:join')
  onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; name?: string },
  ): void {
    const code = (body.code ?? '').toUpperCase();
    if (!code) return;
    client.join(code);

    const members = this.rooms.get(code) ?? new Map<string, Presence>();
    const name = body.name || 'Guest';
    members.set(client.id, {
      name,
      colorClass: CURSOR_COLORS[members.size % CURSOR_COLORS.length],
    });
    this.rooms.set(code, members);
    (client.data as { code?: string }).code = code;

    this.emitPresence(code);
    void this.operations.touch(code).catch(() => undefined);

    // Announce the arrival as a system chat message (ephemeral, not persisted).
    this.server.to(code).emit('chat:message', {
      id: `sys-${this.sysSeq++}`,
      authorId: 'system',
      author: name,
      text: `${name} joined the room`,
      at: new Date().toISOString(),
      system: true,
    });
  }

  @SubscribeMessage('op:commit')
  async onCommit(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; op: DrawOperationDto },
  ): Promise<void> {
    const code = (body.code ?? '').toUpperCase();
    if (!code || !body.op) return;
    try {
      const saved = await this.operations.create(code, body.op);
      client.to(code).emit('op:applied', saved);
    } catch {
      /* room missing / db error — drop silently for the demo */
    }
  }

  @SubscribeMessage('op:undo')
  async onUndo(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; id: string },
  ): Promise<void> {
    const code = (body.code ?? '').toUpperCase();
    if (!code || !body.id) return;
    try {
      await this.operations.markUndone(code, body.id);
    } catch {
      /* ignore */
    }
    client.to(code).emit('op:undone', { id: body.id });
  }

  @SubscribeMessage('op:redo')
  async onRedo(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; op: DrawOperationDto },
  ): Promise<void> {
    const code = (body.code ?? '').toUpperCase();
    if (!code || !body.op) return;
    try {
      await this.operations.markRedone(code, body.op.id);
    } catch {
      /* ignore */
    }
    // Re-broadcast the restored op so others re-add it (no manual redo needed).
    client.to(code).emit('op:applied', body.op);
  }

  @SubscribeMessage('op:reset')
  async onReset(@MessageBody() body: { code: string }): Promise<void> {
    const code = (body.code ?? '').toUpperCase();
    if (!code) return;
    try {
      await this.operations.clear(code);
    } catch {
      /* ignore */
    }
    // Clear everyone's canvas (including the sender, for consistency).
    this.server.to(code).emit('op:reset');
  }

  @SubscribeMessage('cursor:move')
  onCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; x: number; y: number },
  ): void {
    const code = (body.code ?? '').toUpperCase();
    const presence = this.rooms.get(code)?.get(client.id);
    if (!presence) return;
    client.to(code).emit('cursor:move', {
      id: client.id,
      name: presence.name,
      colorClass: presence.colorClass,
      x: body.x,
      y: body.y,
    });
  }

  @SubscribeMessage('chat:send')
  async onChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; text: string; name?: string },
  ): Promise<void> {
    const code = (body.code ?? '').toUpperCase();
    const text = (body.text ?? '').trim();
    if (!code || !text) return;
    const author = this.rooms.get(code)?.get(client.id)?.name ?? body.name ?? 'Guest';
    try {
      const saved = await this.messages.create(code, { authorId: client.id, author, text });
      // Broadcast to EVERYONE (incl. sender) for consistent ordering.
      this.server.to(code).emit('chat:message', saved);
    } catch {
      /* room missing / db error — drop silently */
    }
  }

  @SubscribeMessage('reaction:send')
  onReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; emoji: string; x?: number; name?: string },
  ): void {
    const code = (body.code ?? '').toUpperCase();
    if (!code || !body.emoji) return;
    const author = this.rooms.get(code)?.get(client.id)?.name ?? body.name ?? 'Guest';
    // Broadcast to EVERYONE so the float-up animation fires in sync.
    this.server.to(code).emit('reaction:show', {
      id: `r-${this.reactionSeq++}`,
      emoji: body.emoji,
      authorId: client.id,
      author,
      x: typeof body.x === 'number' ? body.x : 50,
    });
  }

  handleDisconnect(client: Socket): void {
    const code = (client.data as { code?: string }).code;
    if (!code) return;
    const members = this.rooms.get(code);
    if (!members) return;
    members.delete(client.id);
    if (members.size === 0) this.rooms.delete(code);
    this.emitPresence(code);
  }

  private emitPresence(code: string): void {
    const members = this.rooms.get(code);
    const list = members
      ? [...members.entries()].map(([id, p]) => ({ id, name: p.name, colorClass: p.colorClass }))
      : [];
    this.server.to(code).emit('presence:update', list);
  }
}
