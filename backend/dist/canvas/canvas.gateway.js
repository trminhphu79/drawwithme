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
let CanvasGateway = class CanvasGateway {
    constructor(operations, messages) {
        this.operations = operations;
        this.messages = messages;
        this.rooms = new Map();
        this.reactionSeq = 0;
        this.sysSeq = 0;
    }
    onJoin(client, body) {
        const code = (body.code ?? '').toUpperCase();
        if (!code)
            return;
        client.join(code);
        const members = this.rooms.get(code) ?? new Map();
        const name = body.name || 'Guest';
        members.set(client.id, {
            name,
            colorIndex: this.nextColorIndex(members),
            avatar: body.avatar,
        });
        this.rooms.set(code, members);
        client.data.code = code;
        this.emitPresence(code);
        void this.operations.touch(code).catch(() => undefined);
        void this.operations
            .getReference(code)
            .then((url) => {
            if (url)
                client.emit('reference:updated', { url });
        })
            .catch(() => undefined);
        this.server.to(code).emit('chat:message', {
            id: `sys-${this.sysSeq++}`,
            authorId: 'system',
            author: name,
            text: `${name} joined the room`,
            at: new Date().toISOString(),
            system: true,
        });
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
        const members = this.rooms.get(code);
        if (!members)
            return;
        members.delete(client.id);
        if (members.size === 0)
            this.rooms.delete(code);
        this.emitPresence(code);
    }
    nextColorIndex(members) {
        const used = new Set([...members.values()].map((m) => m.colorIndex));
        let i = 0;
        while (used.has(i))
            i++;
        return i;
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
    __metadata("design:returntype", void 0)
], CanvasGateway.prototype, "onJoin", null);
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
        messages_service_1.MessagesService])
], CanvasGateway);
//# sourceMappingURL=canvas.gateway.js.map