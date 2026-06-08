import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ChatMessageDto {
  id: string;
  authorId: string;
  author: string;
  text: string;
  at: string;
}

const MAX_HISTORY = 200;

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async roomIdByCode(code: string): Promise<string> {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      select: { id: true },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room.id;
  }

  async create(
    code: string,
    data: { authorId: string; author: string; text: string },
  ): Promise<ChatMessageDto> {
    const roomId = await this.roomIdByCode(code);
    const msg = await this.prisma.message.create({
      data: { roomId, authorId: data.authorId, author: data.author, text: data.text.slice(0, 2000) },
    });
    await this.prisma.room.update({ where: { id: roomId }, data: { lastActivityAt: new Date() } });
    return { id: msg.id, authorId: msg.authorId, author: msg.author, text: msg.text, at: msg.createdAt.toISOString() };
  }

  async listByRoom(code: string): Promise<ChatMessageDto[]> {
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
}
