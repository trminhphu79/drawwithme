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
  /** Color slot; the frontend maps it to a distinct cursor/label color. */
  colorIndex: number;
  avatar?: string;
}

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
    @MessageBody() body: { code: string; name?: string; avatar?: string },
  ): void {
    const code = (body.code ?? '').toUpperCase();
    if (!code) return;
    client.join(code);

    const members = this.rooms.get(code) ?? new Map<string, Presence>();
    const name = body.name || 'Guest';
    members.set(client.id, {
      name,
      colorIndex: this.nextColorIndex(members),
      avatar: body.avatar,
    });
    this.rooms.set(code, members);
    (client.data as { code?: string }).code = code;

    this.emitPresence(code);
    void this.operations.touch(code).catch(() => undefined);

    // Send the current shared reference image to the new joiner.
    void this.operations
      .getReference(code)
      .then((url) => {
        if (url) client.emit('reference:updated', { url });
      })
      .catch(() => undefined);

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

  @SubscribeMessage('reference:set')
  onReference(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; url: string },
  ): void {
    const code = (body.code ?? '').toUpperCase();
    if (!code || !body.url) return;
    // Persistence happens via the REST upload; just notify everyone else.
    client.to(code).emit('reference:updated', { url: body.url });
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
      colorIndex: presence.colorIndex,
      x: body.x,
      y: body.y,
    });
  }

  @SubscribeMessage('profile:update')
  onProfileUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; name?: string; avatar?: string },
  ): void {
    const code = (body.code ?? '').toUpperCase();
    const member = this.rooms.get(code)?.get(client.id);
    if (!member) return;
    if (body.name) member.name = body.name;
    member.avatar = body.avatar ?? member.avatar;
    this.emitPresence(code);
  }

  @SubscribeMessage('chat:send')
  async onChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; text: string; name?: string; avatar?: string },
  ): Promise<void> {
    const code = (body.code ?? '').toUpperCase();
    const text = (body.text ?? '').trim();
    if (!code || !text) return;
    const presence = this.rooms.get(code)?.get(client.id);
    const author = presence?.name ?? body.name ?? 'Guest';
    const avatar = presence?.avatar ?? body.avatar;
    try {
      const saved = await this.messages.create(code, { authorId: client.id, author, avatar, text });
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

  /** Smallest color slot not currently used in the room (keeps cursors distinct). */
  private nextColorIndex(members: Map<string, Presence>): number {
    const used = new Set([...members.values()].map((m) => m.colorIndex));
    let i = 0;
    while (used.has(i)) i++;
    return i;
  }

  private emitPresence(code: string): void {
    const members = this.rooms.get(code);
    const list = members
      ? [...members.entries()].map(([id, p]) => ({ id, name: p.name, colorIndex: p.colorIndex, avatar: p.avatar }))
      : [];
    this.server.to(code).emit('presence:update', list);
  }
}
