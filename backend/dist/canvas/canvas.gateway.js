"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvasGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const operations_service_1 = require("./operations.service");
const messages_service_1 = require("../messages/messages.service");
const prisma_service_1 = require("../prisma/prisma.service");
let CanvasGateway = class CanvasGateway {
    constructor(operations, messages, prisma) {
        this.operations = operations;
        this.messages = messages;
        this.prisma = prisma;
        this.rooms = new Map();
        this.pending = new Map();
        this.approved = new Map();
        this.hostByRoom = new Map();
        this.reactionSeq = 0;
        this.sysSeq = 0;
    }
    async onJoin(client, body) {
        const code = (body.code ?? '').toUpperCase();
        if (!code)
            return;
        const name = body.name || 'Guest';
        const clientId = body.clientId ?? '';
        const access = await this.getAccess(code);
        const hostId = access?.hostId ?? null;
        const joinMode = access?.joinMode ?? 'auto';
        this.hostByRoom.set(code, hostId);
        const approvedSet = this.approved.get(code) ?? new Set();
        if (hostId)
            approvedSet.add(hostId);
        this.approved.set(code, approvedSet);
        const isHost = !!clientId && clientId === hostId;
        const allowed = joinMode !== 'approval' || isHost || (!!clientId && approvedSet.has(clientId));
        if (!allowed) {
            const pend = this.pending.get(code) ?? new Map();
            pend.set(client.id, { clientId, name, avatar: body.avatar });
            this.pending.set(code, pend);
            client.data.code = code;
            client.data.pending = true;
            client.emit('join:pending', { code });
            this.notifyHost(code, { socketId: client.id, clientId, name, avatar: body.avatar });
            return;
        }
        this.admit(client, code, name, body.avatar, clientId, !!body.rejoin);
        if (isHost)
            this.sendPendingTo(client, code);
    }
    onApprove(client, body) {
        const code = (body.code ?? '').toUpperCase();
        if (!this.isHostSocket(client, code))
            return;
        const pend = this.pending.get(code)?.get(body.socketId);
        const target = this.server.sockets.sockets.get(body.socketId);
        if (!pend || !target)
            return;
        if (pend.clientId)
            this.approved.get(code)?.add(pend.clientId);
        this.admit(target, code, pend.name, pend.avatar, pend.clientId, false);
        this.resolveRequest(code, body.socketId);
    }
    onDeny(client, body) {
        const code = (body.code ?? '').toUpperCase();
        if (!this.isHostSocket(client, code))
            return;
        this.server.sockets.sockets.get(body.socketId)?.emit('join:denied', { code });
        this.pending.get(code)?.delete(body.socketId);
        this.resolveRequest(code, body.socketId);
    }
    admit(client, code, name, avatar, clientId, rejoin) {
        client.join(code);
        const members = this.rooms.get(code) ?? new Map();
        members.set(client.id, {
            name,
            colorIndex: this.nextColorIndex(members),
            avatar,
            clientId,
        });
        this.rooms.set(code, members);
        client.data.code = code;
        client.data.pending = false;
        this.pending.get(code)?.delete(client.id);
        this.emitPresence(code);
        void this.operations.touch(code).catch(() => undefined);
        client.emit('join:approved', { code });
        void this.operations
            .getReference(code)
            .then((url) => {
            if (url)
                client.emit('reference:updated', { url });
        })
            .catch(() => undefined);
        if (!rejoin) {
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
    async onCommit(client, body) {
        const code = (body.code ?? '').toUpperCase();
        if (!code || !body.op)
            return;
        try {
            const saved = await this.operations.create(code, body.op);
            client.to(code).emit('op:applied', saved);
        }
        catch {
        }
    }
    async onUndo(client, body) {
        const code = (body.code ?? '').toUpperCase();
        if (!code || !body.id)
            return;
        try {
            await this.operations.markUndone(code, body.id);
        }
        catch {
        }
        client.to(code).emit('op:undone', { id: body.id });
    }
    async onRedo(client, body) {
        const code = (body.code ?? '').toUpperCase();
        if (!code || !body.op)
            return;
        try {
            await this.operations.markRedone(code, body.op.id);
        }
        catch {
        }
        client.to(code).emit('op:applied', body.op);
    }
    async onReset(body) {
        const code = (body.code ?? '').toUpperCase();
        if (!code)
            return;
        try {
            await this.operations.clear(code);
        }
        catch {
        }
        this.server.to(code).emit('op:reset');
    }
    onReference(client, body) {
        const code = (body.code ?? '').toUpperCase();
        if (!code || !body.url)
            return;
        client.to(code).emit('reference:updated', { url: body.url });
    }
    onFinish(client, body) {
        const code = (body.code ?? '').toUpperCase();
        if (!code || !body.artworkId)
            return;
        client.to(code).emit('room:finished', {
            artworkId: body.artworkId,
            by: body.by || 'Someone',
        });
    }
    async onSettingsUpdate(client, body) {
        const code = (body.code ?? '').toUpperCase();
        const joinMode = body.joinMode === 'approval' ? 'approval' : 'auto';
        if (!this.isHostSocket(client, code))
            return;
        try {
            await this.prisma.room.update({
                where: { code },
                data: {
                    settings: { upsert: { create: { joinMode }, update: { joinMode } } },
                },
            });
        }
        catch {
        }
    }
    onTitle(client, body) {
        const code = (body.code ?? '').toUpperCase();
        if (!code)
            return;
        client.to(code).emit('title:updated', { title: body.title ?? '' });
    }
    onCursor(client, body) {
        const code = (body.code ?? '').toUpperCase();
        const presence = this.rooms.get(code)?.get(client.id);
        if (!presence)
            return;
        client.to(code).emit('cursor:move', {
            id: client.id,
            name: presence.name,
            colorIndex: presence.colorIndex,
            x: body.x,
            y: body.y,
        });
    }
    onProfileUpdate(client, body) {
        const code = (body.code ?? '').toUpperCase();
        const member = this.rooms.get(code)?.get(client.id);
        if (!member)
            return;
        if (body.name)
            member.name = body.name;
        member.avatar = body.avatar ?? member.avatar;
        this.emitPresence(code);
    }
    async onChat(client, body) {
        const code = (body.code ?? '').toUpperCase();
        const text = (body.text ?? '').trim();
        if (!code || !text)
            return;
        const presence = this.rooms.get(code)?.get(client.id);
        const author = presence?.name ?? body.name ?? 'Guest';
        const avatar = presence?.avatar ?? body.avatar;
        try {
            const saved = await this.messages.create(code, { authorId: client.id, author, avatar, text });
            this.server.to(code).emit('chat:message', saved);
        }
        catch {
        }
    }
    onReaction(client, body) {
        const code = (body.code ?? '').toUpperCase();
        if (!code || !body.emoji)
            return;
        const author = this.rooms.get(code)?.get(client.id)?.name ?? body.name ?? 'Guest';
        this.server.to(code).emit('reaction:show', {
            id: `r-${this.reactionSeq++}`,
            emoji: body.emoji,
            authorId: client.id,
            author,
            x: typeof body.x === 'number' ? body.x : 50,
        });
    }
    handleDisconnect(client) {
        const code = client.data.code;
        if (!code)
            return;
        if (this.pending.get(code)?.delete(client.id))
            this.resolveRequest(code, client.id);
        const members = this.rooms.get(code);
        if (!members)
            return;
        members.delete(client.id);
        if (members.size === 0)
            this.rooms.delete(code);
        this.emitPresence(code);
    }
    async getAccess(code) {
        try {
            const room = await this.prisma.room.findUnique({
                where: { code },
                include: { settings: true },
            });
            if (!room)
                return null;
            return {
                hostId: room.hostId,
                joinMode: room.settings?.joinMode ?? 'auto',
            };
        }
        catch {
            return null;
        }
    }
    isHostSocket(client, code) {
        const hostId = this.hostByRoom.get(code);
        const presence = this.rooms.get(code)?.get(client.id);
        return !!hostId && !!presence?.clientId && presence.clientId === hostId;
    }
    notifyHost(code, req) {
        const hostId = this.hostByRoom.get(code);
        if (!hostId)
            return;
        for (const [id, p] of this.rooms.get(code) ?? []) {
            if (p.clientId === hostId)
                this.server.to(id).emit('join:request', req);
        }
    }
    sendPendingTo(client, code) {
        const pend = this.pending.get(code);
        if (!pend?.size)
            return;
        client.emit('join:requests', [...pend.entries()].map(([socketId, p]) => ({
            socketId,
            clientId: p.clientId,
            name: p.name,
            avatar: p.avatar,
        })));
    }
    resolveRequest(code, socketId) {
        const hostId = this.hostByRoom.get(code);
        if (!hostId)
            return;
        for (const [id, p] of this.rooms.get(code) ?? []) {
            if (p.clientId === hostId)
                this.server.to(id).emit('join:resolved', { socketId });
        }
    }
    nextColorIndex(members) {
        const used = new Set([...members.values()].map((m) => m.colorIndex));
        let i = 0;
        while (used.has(i))
            i++;
        return i;
    }
    memberSummary(code) {
        const members = this.rooms.get((code ?? '').toUpperCase());
        if (!members)
            return { count: 0, avatars: [] };
        const avatars = [...members.values()]
            .map((m) => m.avatar)
            .filter((a) => !!a)
            .slice(0, 5);
        return { count: members.size, avatars };
    }
    emitPresence(code) {
        const members = this.rooms.get(code);
        const list = members
            ? [...members.entries()].map(([id, p]) => ({ id, name: p.name, colorIndex: p.colorIndex, avatar: p.avatar }))
            : [];
        this.server.to(code).emit('presence:update', list);
    }
};
exports.CanvasGateway = CanvasGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], CanvasGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('room:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], CanvasGateway.prototype, "onJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:approve'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], CanvasGateway.prototype, "onApprove", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:deny'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], CanvasGateway.prototype, "onDeny", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('op:commit'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], CanvasGateway.prototype, "onCommit", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('op:undo'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], CanvasGateway.prototype, "onUndo", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('op:redo'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], CanvasGateway.prototype, "onRedo", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('op:reset'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CanvasGateway.prototype, "onReset", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('reference:set'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], CanvasGateway.prototype, "onReference", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('room:finish'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], CanvasGateway.prototype, "onFinish", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('settings:update'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], CanvasGateway.prototype, "onSettingsUpdate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('title:set'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], CanvasGateway.prototype, "onTitle", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('cursor:move'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], CanvasGateway.prototype, "onCursor", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('profile:update'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], CanvasGateway.prototype, "onProfileUpdate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:send'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], CanvasGateway.prototype, "onChat", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('reaction:send'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], CanvasGateway.prototype, "onReaction", null);
exports.CanvasGateway = CanvasGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200').split(',') },
    }),
    __metadata("design:paramtypes", [operations_service_1.OperationsService,
        messages_service_1.MessagesService,
        prisma_service_1.PrismaService])
], CanvasGateway);
//# sourceMappingURL=canvas.gateway.js.map