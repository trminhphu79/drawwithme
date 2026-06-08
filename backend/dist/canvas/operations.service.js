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
exports.OperationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let OperationsService = class OperationsService {
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
    async create(code, op) {
        const roomId = await this.roomIdByCode(code);
        await this.prisma.operation.create({
            data: {
                id: op.id,
                roomId,
                type: op.type,
                color: op.color,
                size: Math.round(op.size),
                opacity: op.opacity,
                points: op.points,
                style: op.style ?? null,
                authorId: op.authorId ?? null,
            },
        });
        await this.bumpActivity(roomId);
        return { ...op };
    }
    async touch(code) {
        await this.bumpActivity(await this.roomIdByCode(code));
    }
    async clear(code) {
        const roomId = await this.roomIdByCode(code);
        await this.prisma.operation.deleteMany({ where: { roomId } });
        await this.bumpActivity(roomId);
    }
    async bumpActivity(roomId) {
        await this.prisma.room.update({
            where: { id: roomId },
            data: { lastActivityAt: new Date() },
        });
    }
    async markRedone(code, id) {
        const roomId = await this.roomIdByCode(code);
        await this.prisma.operation.updateMany({
            where: { id, roomId },
            data: { isUndone: false },
        });
    }
    async listByRoom(code) {
        const roomId = await this.roomIdByCode(code);
        const ops = await this.prisma.operation.findMany({
            where: { roomId, isUndone: false },
            orderBy: { seq: 'asc' },
        });
        return ops.map((o) => ({
            id: o.id,
            type: o.type,
            color: o.color,
            size: o.size,
            opacity: o.opacity,
            points: o.points,
            style: o.style ?? undefined,
            authorId: o.authorId ?? undefined,
        }));
    }
    async markUndone(code, id) {
        const roomId = await this.roomIdByCode(code);
        await this.prisma.operation.updateMany({
            where: { id, roomId },
            data: { isUndone: true },
        });
    }
};
exports.OperationsService = OperationsService;
exports.OperationsService = OperationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OperationsService);
//# sourceMappingURL=operations.service.js.map