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
const prisma_service_1 = require("../prisma/prisma.service");
let ArtworksService = class ArtworksService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async roomByCode(code) {
        const room = await this.prisma.room.findUnique({ where: { code: code.toUpperCase() } });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        return room;
    }
    async getByRoomCode(code) {
        const room = await this.roomByCode(code);
        let artwork = await this.prisma.artwork.findFirst({
            where: { roomId: room.id },
            orderBy: { createdAt: 'desc' },
        });
        if (!artwork) {
            artwork = await this.prisma.artwork.create({
                data: { roomId: room.id, title: room.name, participants: [] },
            });
        }
        return this.toDto(artwork, room.code);
    }
    async saveSnapshot(code, dataUrl) {
        const room = await this.roomByCode(code);
        const existing = await this.prisma.artwork.findFirst({
            where: { roomId: room.id },
            orderBy: { createdAt: 'desc' },
        });
        if (existing) {
            await this.prisma.artwork.update({
                where: { id: existing.id },
                data: { imageUrl: dataUrl },
            });
        }
        else {
            await this.prisma.artwork.create({
                data: { roomId: room.id, title: room.name, imageUrl: dataUrl, participants: [] },
            });
        }
        return { url: dataUrl };
    }
    toDto(artwork, roomCode) {
        return {
            id: artwork.id,
            roomCode,
            title: artwork.title,
            imageUrl: artwork.imageUrl,
            participants: artwork.participants,
            createdAt: artwork.createdAt.toISOString(),
        };
    }
};
exports.ArtworksService = ArtworksService;
exports.ArtworksService = ArtworksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ArtworksService);
//# sourceMappingURL=artworks.service.js.map