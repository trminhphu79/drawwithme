import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Wire shape of an operation, shared with the Angular client. */
export interface DrawOperationDto {
  id: string;
  type: 'stroke' | 'erase' | 'fill';
  color: string;
  size: number;
  opacity: number;
  points: { x: number; y: number }[];
  style?: 'hard' | 'soft' | 'shadow';
  authorId?: string;
}

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async roomIdByCode(code: string): Promise<string> {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      select: { id: true },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room.id;
  }

  /**
   * Persist a committed operation, reusing the client-supplied id so the same
   * id is shared by every client + the DB. This is what makes undo/redo (which
   * reference an op by id) sync correctly across all participants.
   */
  async create(code: string, op: DrawOperationDto): Promise<DrawOperationDto> {
    const roomId = await this.roomIdByCode(code);
    await this.prisma.operation.create({
      data: {
        id: op.id,
        roomId,
        type: op.type,
        color: op.color,
        size: Math.round(op.size),
        opacity: op.opacity,
        points: op.points as unknown as object,
        style: op.style ?? null,
        authorId: op.authorId ?? null,
      },
    });
    await this.bumpActivity(roomId);
    return { ...op };
  }

  /** Mark a room as active right now (resets the inactivity timer). */
  async touch(code: string): Promise<void> {
    await this.bumpActivity(await this.roomIdByCode(code));
  }

  private async bumpActivity(roomId: string): Promise<void> {
    await this.prisma.room.update({
      where: { id: roomId },
      data: { lastActivityAt: new Date() },
    });
  }

  /** Restore a previously-undone operation (redo). */
  async markRedone(code: string, id: string): Promise<void> {
    const roomId = await this.roomIdByCode(code);
    await this.prisma.operation.updateMany({
      where: { id, roomId },
      data: { isUndone: false },
    });
  }

  /** Ordered replay log (excludes undone ops). */
  async listByRoom(code: string): Promise<DrawOperationDto[]> {
    const roomId = await this.roomIdByCode(code);
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

  /** Soft-delete an operation (used by undo). */
  async markUndone(code: string, id: string): Promise<void> {
    const roomId = await this.roomIdByCode(code);
    await this.prisma.operation.updateMany({
      where: { id, roomId },
      data: { isUndone: true },
    });
  }
}
