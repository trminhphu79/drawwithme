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
exports.ArtworksService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("../storage/storage.service");
let ArtworksService = class ArtworksService {
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
    }
    async get(idOrCode) {
        const byId = await this.prisma.artwork.findUnique({ where: { id: idOrCode } });
        if (byId)
            return this.toDto(byId);
        const room = await this.prisma.room.findUnique({ where: { code: idOrCode.toUpperCase() } });
        if (room) {
            const latest = await this.prisma.artwork.findFirst({
                where: { roomId: room.id },
                orderBy: { createdAt: 'desc' },
            });
            if (latest)
                return this.toDto(latest);
            const created = await this.prisma.artwork.create({
                data: { roomId: room.id, roomCode: room.code, title: room.name, participants: [] },
            });
            return this.toDto(created);
        }
        throw new common_1.NotFoundException('Artwork not found');
    }
    async getOperations(idOrCode) {
        let art = await this.prisma.artwork.findUnique({ where: { id: idOrCode } });
        if (!art) {
            const room = await this.prisma.room.findUnique({ where: { code: idOrCode.toUpperCase() } });
            if (room) {
                art = await this.prisma.artwork.findFirst({
                    where: { roomId: room.id },
                    orderBy: { createdAt: 'desc' },
                });
            }
        }
        return art?.operations ?? [];
    }
    async saveSnapshot(code, dataUrl, title, participants) {
        const room = await this.prisma.room.findUnique({ where: { code: code.toUpperCase() } });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        const existing = await this.prisma.artwork.findFirst({
            where: { roomId: room.id },
            orderBy: { createdAt: 'desc' },
        });
        const artworkId = existing?.id ?? (0, crypto_1.randomUUID)();
        const imageUrl = await this.storage.putDataUrl(`artworks/${artworkId}.png`, dataUrl);
        const operations = (await this.snapshotOperations(room.id));
        const cleanTitle = title?.trim();
        if (existing) {
            await this.prisma.artwork.update({
                where: { id: existing.id },
                data: {
                    imageUrl,
                    operations,
                    roomCode: room.code,
                    ...(cleanTitle ? { title: cleanTitle } : {}),
                    ...(participants?.length ? { participants } : {}),
                },
            });
        }
        else {
            await this.prisma.artwork.create({
                data: {
                    id: artworkId,
                    roomId: room.id,
                    roomCode: room.code,
                    title: cleanTitle || room.name,
                    imageUrl,
                    participants: participants ?? [],
                    operations,
                },
            });
        }
        return { url: imageUrl, id: artworkId };
    }
    async snapshotOperations(roomId) {
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
    toDto(a) {
        const ops = a.operations ?? [];
        return {
            id: a.id,
            roomCode: a.roomCode ?? null,
            title: a.title,
            imageUrl: a.imageUrl,
            participants: a.participants,
            replayable: Array.isArray(ops) && ops.length > 0,
            createdAt: a.createdAt.toISOString(),
        };
    }
};
exports.ArtworksService = ArtworksService;
exports.ArtworksService = ArtworksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService])
], ArtworksService);
//# sourceMappingURL=artworks.service.js.map