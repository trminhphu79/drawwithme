"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../prisma/prisma.service");
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let RoomsService = class RoomsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(search, skip, take) {
        const term = (search ?? '').trim();
        const where = {
            status: 'active',
            ...(term
                ? {
                    OR: [
                        { code: { contains: term.toUpperCase() } },
                        { name: { contains: term, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [rooms, total] = await this.prisma.$transaction([
            this.prisma.room.findMany({
                where,
                orderBy: { lastActivityAt: 'desc' },
                skip,
                take,
                include: {
                    _count: { select: { members: true } },
                    members: {
                        take: 5,
                        orderBy: { joinedAt: 'asc' },
                        include: { user: { select: { avatar: true } } },
                    },
                },
            }),
            this.prisma.room.count({ where }),
        ]);
        return {
            rooms: rooms.map((r) => ({
                code: r.code,
                name: r.name,
                memberCount: r._count.members,
                avatars: r.members.map((m) => m.user.avatar).filter((a) => !!a),
                createdAt: r.createdAt.toISOString(),
            })),
            total,
        };
    }
    async create(dto) {
        const code = await this.generateUniqueCode();
        const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : null;
        if (dto.hostId) {
            await this.prisma.user.upsert({
                where: { id: dto.hostId },
                create: { id: dto.hostId, type: 'anonymous' },
                update: {},
            });
        }
        const room = await this.prisma.room.create({
            data: {
                code,
                name: dto.name ?? 'Untitled Room',
                passwordHash,
                hostId: dto.hostId ?? null,
                settings: { create: { joinMode: dto.joinMode ?? 'auto' } },
            },
            include: { settings: true },
        });
        return this.toDto(room);
    }
    async join(dto) {
        const room = await this.prisma.room.findUnique({
            where: { code: dto.code.toUpperCase() },
            include: { settings: true },
        });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        if (room.passwordHash) {
            if (!dto.password)
                throw new common_1.UnauthorizedException('Password required');
            const ok = await bcrypt.compare(dto.password, room.passwordHash);
            if (!ok)
                throw new common_1.ForbiddenException('Incorrect password');
        }
        return this.toDto(room);
    }
    async findByCode(code) {
        const room = await this.prisma.room.findUnique({
            where: { code: code.toUpperCase() },
            include: { settings: true },
        });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        return this.toDto(room);
    }
    async getAccess(code) {
        const room = await this.prisma.room.findUnique({
            where: { code: code.toUpperCase() },
            include: { settings: true },
        });
        if (!room)
            return null;
        return {
            hostId: room.hostId,
            joinMode: room.settings?.joinMode ?? 'auto',
            capacity: room.settings?.capacity ?? 3,
        };
    }
    async listByHost(hostId) {
        const id = (hostId ?? '').trim();
        if (!id)
            return [];
        const rooms = await this.prisma.room.findMany({
            where: { hostId: id },
            orderBy: { lastActivityAt: 'desc' },
            include: { settings: true, _count: { select: { members: true } } },
        });
        return rooms.map((r) => this.toManaged(r));
    }
    async updateByHost(code, dto) {
        const existing = await this.prisma.room.findUnique({
            where: { code: code.toUpperCase() },
            select: { hostId: true },
        });
        this.assertHost(existing, dto.requesterId);
        const roomData = {};
        if (typeof dto.name === 'string')
            roomData.name = dto.name.trim() || 'Untitled Room';
        if (dto.status === 'active' || dto.status === 'archived')
            roomData.status = dto.status;
        const settings = {};
        if (dto.joinMode === 'auto' || dto.joinMode === 'approval')
            settings.joinMode = dto.joinMode;
        if (typeof dto.capacity === 'number') {
            settings.capacity = Math.min(50, Math.max(2, Math.round(dto.capacity)));
        }
        const room = await this.prisma.room.update({
            where: { code: code.toUpperCase() },
            data: {
                ...roomData,
                ...(Object.keys(settings).length
                    ? { settings: { upsert: { create: settings, update: settings } } }
                    : {}),
            },
            include: { settings: true, _count: { select: { members: true } } },
        });
        return this.toManaged(room);
    }
    async deleteByHost(code, requesterId) {
        const room = await this.prisma.room.findUnique({
            where: { code: code.toUpperCase() },
            select: { id: true, code: true, hostId: true },
        });
        this.assertHost(room, requesterId);
        await this.prisma.$transaction([
            this.prisma.artwork.deleteMany({ where: { roomId: room.id } }),
            this.prisma.room.delete({ where: { id: room.id } }),
        ]);
        return { deleted: true, code: room.code };
    }
    assertHost(room, requesterId) {
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        const id = (requesterId ?? '').trim();
        if (!id || !room.hostId || room.hostId !== id) {
            throw new common_1.ForbiddenException('You are not the host of this room');
        }
    }
    toManaged(r) {
        return {
            code: r.code,
            name: r.name,
            status: r.status,
            joinMode: r.settings?.joinMode ?? 'auto',
            capacity: r.settings?.capacity ?? 3,
            memberCount: r._count.members,
            createdAt: r.createdAt.toISOString(),
        };
    }
    async generateUniqueCode() {
        for (let attempt = 0; attempt < 10; attempt++) {
            const code = Array.from({ length: 6 }, () => CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length))).join('');
            const existing = await this.prisma.room.findUnique({ where: { code } });
            if (!existing)
                return code;
        }
        throw new Error('Could not generate a unique room code');
    }
    toDto(room) {
        return {
            id: room.id,
            code: room.code,
            name: room.name,
            hasPassword: !!room.passwordHash,
            hostId: room.hostId,
            joinMode: room.settings?.joinMode ?? 'auto',
            capacity: room.settings?.capacity ?? 3,
            width: room.width,
            height: room.height,
            status: room.status,
            createdAt: room.createdAt.toISOString(),
        };
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map