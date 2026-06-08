import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Artwork, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DrawOperationDto } from '../canvas/operations.service';

export interface ArtworkDto {
  id: string;
  roomCode: string | null;
  title: string;
  imageUrl: string | null;
  participants: string[];
  /** Whether a replay (operation snapshot) is available for this artwork. */
  replayable: boolean;
  createdAt: string;
}

@Injectable()
export class ArtworksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Resolve by artwork id first, then fall back to a room code (latest artwork). */
  async get(idOrCode: string): Promise<ArtworkDto> {
    const byId = await this.prisma.artwork.findUnique({ where: { id: idOrCode } });
    if (byId) return this.toDto(byId);

    const room = await this.prisma.room.findUnique({ where: { code: idOrCode.toUpperCase() } });
    if (room) {
      const latest = await this.prisma.artwork.findFirst({
        where: { roomId: room.id },
        orderBy: { createdAt: 'desc' },
      });
      if (latest) return this.toDto(latest);
      const created = await this.prisma.artwork.create({
        data: { roomId: room.id, roomCode: room.code, title: room.name, participants: [] },
      });
      return this.toDto(created);
    }
    throw new NotFoundException('Artwork not found');
  }

  /** Stored operation snapshot for replaying the artwork via its link. */
  async getOperations(idOrCode: string): Promise<DrawOperationDto[]> {
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
    return (art?.operations as unknown as DrawOperationDto[]) ?? [];
  }

  /**
   * Store a rasterized snapshot (→ R2) + the op log + metadata as the room's
   * artwork. Returns the artwork id (for the shareable link).
   */
  async saveSnapshot(
    code: string,
    dataUrl: string,
    title?: string,
    participants?: string[],
  ): Promise<{ url: string; id: string }> {
    const room = await this.prisma.room.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) throw new NotFoundException('Room not found');

    const existing = await this.prisma.artwork.findFirst({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
    });
    const artworkId = existing?.id ?? randomUUID();

    const imageUrl = await this.storage.putDataUrl(`artworks/${artworkId}.png`, dataUrl);
    const operations = (await this.snapshotOperations(room.id)) as unknown as Prisma.InputJsonValue;
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
    } else {
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

  private async snapshotOperations(roomId: string): Promise<DrawOperationDto[]> {
    const ops = await this.prisma.operation.findMany({
      where: { roomId, isUndone: false },
      orderBy: { seq: 'asc' },
    });
    return ops.map((o) => ({
      id: o.id,
      type: o.type as DrawOperationDto['type'],
      color: o.color,
      size: o.size,
      opacity: o.opacity,
      points: o.points as unknown as { x: number; y: number }[],
      style: (o.style as DrawOperationDto['style']) ?? undefined,
      authorId: o.authorId ?? undefined,
    }));
  }

  private toDto(a: Artwork): ArtworkDto {
    const ops = (a.operations as unknown as unknown[]) ?? [];
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
}
