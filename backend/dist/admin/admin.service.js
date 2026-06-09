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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../prisma/prisma.service");
let AdminService = AdminService_1 = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
        this.log = new common_1.Logger(AdminService_1.name);
    }
    async onModuleInit() {
        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD;
        if (!password) {
            this.log.warn('ADMIN_PASSWORD not set — admin account not seeded.');
            return;
        }
        try {
            const existing = await this.prisma.user.findFirst({ where: { username } });
            if (existing)
                return;
            await this.prisma.user.create({
                data: {
                    id: (0, crypto_1.randomUUID)(),
                    username,
                    type: 'admin',
                    passwordHash: await bcrypt.hash(password, 10),
                },
            });
            this.log.log(`Seeded admin account "${username}".`);
        }
        catch (err) {
            this.log.error('Failed to seed admin account', err);
        }
    }
    async validate(username, password) {
        const user = await this.prisma.user.findFirst({
            where: { username, type: 'admin' },
        });
        if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
            throw new common_1.UnauthorizedException('Invalid username or password');
        }
        return { id: user.id, username: user.username ?? username };
    }
    async listRooms(search, skip, take) {
        const term = (search ?? '').trim();
        const where = term
            ? {
                OR: [
                    { code: { contains: term.toUpperCase() } },
                    { name: { contains: term, mode: 'insensitive' } },
                ],
            }
            : {};
        const [rooms, total] = await this.prisma.$transaction([
            this.prisma.room.findMany({
                where,
                orderBy: { lastActivityAt: 'desc' },
                skip,
                take,
                include: { settings: true, _count: { select: { members: true } } },
            }),
            this.prisma.room.count({ where }),
        ]);
        return {
            rooms: rooms.map((r) => ({
                code: r.code,
                name: r.name,
                status: r.status,
                joinMode: r.settings?.joinMode ?? 'auto',
                capacity: r.settings?.capacity ?? 3,
                hostId: r.hostId,
                memberCount: r._count.members,
                createdAt: r.createdAt.toISOString(),
            })),
            total,
        };
    }
    async updateRoom(code, dto) {
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
        return {
            code: room.code,
            name: room.name,
            status: room.status,
            joinMode: room.settings?.joinMode ?? 'auto',
            capacity: room.settings?.capacity ?? 3,
            hostId: room.hostId,
            memberCount: room._count.members,
            createdAt: room.createdAt.toISOString(),
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map