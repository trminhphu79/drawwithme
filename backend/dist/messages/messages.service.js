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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const MAX_HISTORY = 200;
let MessagesService = class MessagesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async roomIdByCode(code) {
        const room = await this.prisma.room.findUnique({
            where: { code: code.toUpperCase() },
            select: { id: true },
        });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        return room.id;
    }
    async create(code, data) {
        const roomId = await this.roomIdByCode(code);
        const msg = await this.prisma.message.create({
            data: { roomId, authorId: data.authorId, author: data.author, text: data.text.slice(0, 2000) },
        });
        await this.prisma.room.update({ where: { id: roomId }, data: { lastActivityAt: new Date() } });
        return { id: msg.id, authorId: msg.authorId, author: msg.author, text: msg.text, at: msg.createdAt.toISOString() };
    }
    async listByRoom(code) {
        const roomId = await this.roomIdByCode(code);
        const rows = await this.prisma.message.findMany({
            where: { roomId },
            orderBy: { createdAt: 'asc' },
            take: MAX_HISTORY,
        });
        return rows.map((m) => ({
            id: m.id,
            authorId: m.authorId,
            author: m.author,
            text: m.text,
            at: m.createdAt.toISOString(),
        }));
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MessagesService);
//# sourceMappingURL=messages.service.js.map