import { Injectable, NotFoundException } from '@nestjs/common';
import { Artwork, Room } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ArtworkDto {
  id: string;
  roomCode: string;
  title: string;
  imageUrl: string | null;
  participants: string[];
  createdAt: string;
}

@Injectable()
export class ArtworksService {
  constructor(private readonly prisma: PrismaService) {}

  private async roomByCode(code: string): Promise<Room> {
    const room = await this.prisma.room.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  /** Latest sealed artwork for a room; creates an empty one on first view. */
  async getByRoomCode(code: string): Promise<ArtworkDto> {
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

  /** Store a rasterized snapshot (+ optional title) as the room's artwork. */
  async saveSnapshot(code: string, dataUrl: string, title?: string): Promise<{ url: string }> {
    const room = await this.roomByCode(code);
    const cleanTitle = title?.trim();
    const existing = await this.prisma.artwork.findFirst({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      await this.prisma.artwork.update({
        where: { id: existing.id },
        data: cleanTitle ? { imageUrl: dataUrl, title: cleanTitle } : { imageUrl: dataUrl },
      });
    } else {
      await this.prisma.artwork.create({
        data: {
          roomId: room.id,
          title: cleanTitle || room.name,
          imageUrl: dataUrl,
          participants: [],
        },
      });
    }
    return { url: dataUrl };
  }

  private toDto(artwork: Artwork, roomCode: string): ArtworkDto {
    return {
      id: artwork.id,
      roomCode,
      title: artwork.title,
      imageUrl: artwork.imageUrl,
      participants: artwork.participants,
      createdAt: artwork.createdAt.toISOString(),
    };
  }
}
