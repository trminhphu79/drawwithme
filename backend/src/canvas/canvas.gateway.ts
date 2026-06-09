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
import { PrismaService } from '../prisma/prisma.service';

interface Presence {
  name: string;
  /** Color slot; the frontend maps it to a distinct cursor/label color. */
  colorIndex: number;
  avatar?: string;
  /** Stable client id (used to recognise the host + approved members). */
  clientId?: string;
}

/** A joiner awaiting host approval (not yet in the room). */
interface PendingJoin {
  clientId: string;
  name: string;
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
  /** roomCode -> (socketId -> pending joiner) awaiting host approval. */
  private readonly pending = new Map<string, Map<string, PendingJoin>>();
  /** roomCode -> set of clientIds allowed in (host + approved). */
  private readonly approved = new Map<string, Set<string>>();
  /** roomCode -> hostId (cached from the DB on first join). */
  private readonly hostByRoom = new Map<string, string | null>();
  /** Debounce timers for persisting room title edits. */
  private readonly titleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Monotonic counters for unique reaction / system-message ids. */
  private reactionSeq = 0;
  private sysSeq = 0;

  constructor(
    private readonly operations: OperationsService,
    private readonly messages: MessagesService,
    private readonly prisma: PrismaService,
  ) {}

  @SubscribeMessage('room:join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { code: string; name?: string; avatar?: string; clientId?: string; rejoin?: boolean },
  ): Promise<void> {
    const code = (body.code ?? '').toUpperCase();
    if (!code) return;
    const name = body.name || 'Guest';
    const clientId = body.clientId ?? '';

    const access = await this.getAccess(code);
    const hostId = access?.hostId ?? null;
    const joinMode = access?.joinMode ?? 'auto';
    this.hostByRoom.set(code, hostId);

    const approvedSet = this.approved.get(code) ?? new Set<string>();
    if (hostId) approvedSet.add(hostId); // the host is always allowed
    this.approved.set(code, approvedSet);

    const isHost = !!clientId && clientId === hostId;
    const allowed =
      joinMode !== 'approval' || isHost || (!!clientId && approvedSet.has(clientId));

    if (!allowed) {
      // Hold the joiner outside the room until the host admits them.
      const pend = this.pending.get(code) ?? new Map<string, PendingJoin>();
      pend.set(client.id, { clientId, name, avatar: body.avatar });
      this.pending.set(code, pend);
      (client.data as { code?: string; pending?: boolean }).code = code;
      (client.data as { pending?: boolean }).pending = true;
      client.emit('join:pending', { code });
      this.notifyHost(code, { socketId: client.id, clientId, name, avatar: body.avatar });
      return;
    }

    this.admit(client, code, name, body.avatar, clientId, !!body.rejoin);

    // A joining host receives any requests that arrived before they connected.
    if (isHost) this.sendPendingTo(client, code);
  }

  /** Host admits a pending joiner. */
  @SubscribeMessage('join:approve')
  onApprove(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; socketId: string },
  ): void {
    const code = (body.code ?? '').toUpperCase();
    if (!this.isHostSocket(client, code)) return;
    const pend = this.pending.get(code)?.get(body.socketId);
    const target = this.server.sockets.sockets.get(body.socketId);
    if (!pend || !target) return;
    if (pend.clientId) this.approved.get(code)?.add(pend.clientId);
    this.admit(target, code, pend.name, pend.avatar, pend.clientId, false);
    this.resolveRequest(code, body.socketId);
  }

  /** Host rejects a pending joiner. */
  @SubscribeMessage('join:deny')
  onDeny(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; socketId: string },
  ): void {
    const code = (body.code ?? '').toUpperCase();
    if (!this.isHostSocket(client, code)) return;
    this.server.sockets.sockets.get(body.socketId)?.emit('join:denied', { code });
    this.pending.get(code)?.delete(body.socketId);
    this.resolveRequest(code, body.socketId);
  }

  /** Add a socket to the active room + presence (auto-join or after approval). */
  private admit(
    client: Socket,
    code: string,
    name: string,
    avatar: string | undefined,
    clientId: string,
    rejoin: boolean,
  ): void {
    client.join(code);
    const members = this.rooms.get(code) ?? new Map<string, Presence>();
    members.set(client.id, {
      name,
      colorIndex: this.nextColorIndex(members),
      avatar,
      clientId,
    });
    this.rooms.set(code, members);
    (client.data as { code?: string; pending?: boolean }).code = code;
    (client.data as { pending?: boolean }).pending = false;
    this.pending.get(code)?.delete(client.id);

    this.emitPresence(code);
    void this.operations.touch(code).catch(() => undefined);
    // Record the user + their membership in this room (all-time roster).
    void this.recordMembership(code, clientId, name, avatar);

    // Confirm entry (the FE flips out of the waiting state on this).
    client.emit('join:approved', { code });

    // Send the current shared reference image to the new joiner.
    void this.operations
      .getReference(code)
      .then((url) => {
        if (url) client.emit('reference:updated', { url });
      })
      .catch(() => undefined);

    // Announce the arrival as a system chat message (ephemeral, not persisted).
    // Skipped on reconnect/tab-reopen (rejoin) AND when the same user is already
    // present in another tab (so opening tabs doesn't spam "X joined").
    const alreadyHere =
      !!clientId &&
      [...members.values()].filter((m) => m.clientId === clientId).length > 1;
    if (!rejoin && !alreadyHere) {
      this.server.to(code).emit('chat:message', {
        id: `sys-${this.sysSeq++}`,
        authorId: 'system',
        author: name,
        text: `${name} joined the room`,
        at: new Date().toISOString(),
        system: true,
      });
    }
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

  @SubscribeMessage('room:finish')
  onFinish(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; artworkId: string; by?: string },
  ): void {
    const code = (body.code ?? '').toUpperCase();
    if (!code || !body.artworkId) return;
    // Tell everyone else the session was sealed so they can view the result.
    client.to(code).emit('room:finished', {
      artworkId: body.artworkId,
      by: body.by || 'Someone',
    });
  }

  @SubscribeMessage('settings:update')
  async onSettingsUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; joinMode: 'auto' | 'approval' },
  ): Promise<void> {
    const code = (body.code ?? '').toUpperCase();
    const joinMode = body.joinMode === 'approval' ? 'approval' : 'auto';
    if (!this.isHostSocket(client, code)) return; // only the host can change settings
    try {
      await this.prisma.room.update({
        where: { code },
        data: {
          settings: { upsert: { create: { joinMode }, update: { joinMode } } },
        },
      });
    } catch {
      /* room missing / db error — ignore */
    }
  }

  @SubscribeMessage('title:set')
  onTitle(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { code: string; title: string },
  ): void {
    const code = (body.code ?? '').toUpperCase();
    if (!code) return;
    const title = (body.title ?? '').trim();
    // Notify everyone else (the sender already updated its own title locally).
    client.to(code).emit('title:updated', { title: body.title ?? '' });
    // Persist (debounced) so the lobby list shows the latest title.
    clearTimeout(this.titleTimers.get(code));
    this.titleTimers.set(
      code,
      setTimeout(() => {
        this.titleTimers.delete(code);
        void this.prisma.room
          .update({ where: { code }, data: { name: title || 'Untitled Room' } })
          .catch(() => undefined);
      }, 600),
    );
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
    // A waiting joiner left — drop their pending request + clear it on the host.
    if (this.pending.get(code)?.delete(client.id)) this.resolveRequest(code, client.id);
    const members = this.rooms.get(code);
    if (!members) return;
    members.delete(client.id);
    if (members.size === 0) this.rooms.delete(code);
    this.emitPresence(code);
  }

  // ---- host approval helpers ----
  /** Room access (host + join mode) straight from the DB. */
  private async getAccess(
    code: string,
  ): Promise<{ hostId: string | null; joinMode: 'auto' | 'approval' } | null> {
    try {
      const room = await this.prisma.room.findUnique({
        where: { code },
        include: { settings: true },
      });
      if (!room) return null;
      return {
        hostId: room.hostId,
        joinMode: (room.settings?.joinMode as 'auto' | 'approval') ?? 'auto',
      };
    } catch {
      return null; // DB hiccup → fail open (auto join)
    }
  }

  /** Is this socket the room's host (by its clientId)? */
  private isHostSocket(client: Socket, code: string): boolean {
    const hostId = this.hostByRoom.get(code);
    const presence = this.rooms.get(code)?.get(client.id);
    return !!hostId && !!presence?.clientId && presence.clientId === hostId;
  }

  /** Push a join request to every host socket currently in the room. */
  private notifyHost(
    code: string,
    req: { socketId: string; clientId: string; name: string; avatar?: string },
  ): void {
    const hostId = this.hostByRoom.get(code);
    if (!hostId) return;
    for (const [id, p] of this.rooms.get(code) ?? []) {
      if (p.clientId === hostId) this.server.to(id).emit('join:request', req);
    }
  }

  /** Send the full pending list to a (host) socket — used when the host joins. */
  private sendPendingTo(client: Socket, code: string): void {
    const pend = this.pending.get(code);
    if (!pend?.size) return;
    client.emit(
      'join:requests',
      [...pend.entries()].map(([socketId, p]) => ({
        socketId,
        clientId: p.clientId,
        name: p.name,
        avatar: p.avatar,
      })),
    );
  }

  /** Tell host sockets a request was handled (approved/denied/left). */
  private resolveRequest(code: string, socketId: string): void {
    const hostId = this.hostByRoom.get(code);
    if (!hostId) return;
    for (const [id, p] of this.rooms.get(code) ?? []) {
      if (p.clientId === hostId) this.server.to(id).emit('join:resolved', { socketId });
    }
  }

  /** Smallest color slot not currently used in the room (keeps cursors distinct). */
  private nextColorIndex(members: Map<string, Presence>): number {
    const used = new Set([...members.values()].map((m) => m.colorIndex));
    let i = 0;
    while (used.has(i)) i++;
    return i;
  }

  /** Upsert the (anonymous) user + their room membership on join. Best-effort. */
  private async recordMembership(
    code: string,
    clientId: string,
    name: string,
    avatar: string | undefined,
  ): Promise<void> {
    if (!clientId) return;
    try {
      await this.prisma.user.upsert({
        where: { id: clientId },
        create: { id: clientId, username: name, avatar, type: 'anonymous' },
        update: { username: name, avatar },
      });
      const room = await this.prisma.room.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!room) return;
      await this.prisma.roomMember.upsert({
        where: { roomId_userId: { roomId: room.id, userId: clientId } },
        create: { roomId: room.id, userId: clientId },
        update: {},
      });
    } catch {
      /* db hiccup — membership is best-effort */
    }
  }

  /** Live member count + a few avatar keys for a room (for the lobby list). */
  memberSummary(code: string): { count: number; avatars: string[] } {
    const members = this.rooms.get((code ?? '').toUpperCase());
    if (!members) return { count: 0, avatars: [] };
    const avatars = [...members.values()]
      .map((m) => m.avatar)
      .filter((a): a is string => !!a)
      .slice(0, 5);
    return { count: members.size, avatars };
  }

  private emitPresence(code: string): void {
    const members = this.rooms.get(code);
    // De-duplicate by clientId so multiple tabs from the same browser/user
    // count as ONE active member (avatars + count stay per-user, not per-socket).
    const seen = new Set<string>();
    const list: { id: string; name: string; colorIndex: number; avatar?: string }[] = [];
    for (const [id, p] of members ?? []) {
      const key = p.clientId || id;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ id, name: p.name, colorIndex: p.colorIndex, avatar: p.avatar });
    }
    this.server.to(code).emit('presence:update', list);
  }
}
