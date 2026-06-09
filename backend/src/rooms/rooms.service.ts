import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Room, RoomSettings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';

/** A room card in the lobby list (total roster, all-time). */
export interface RoomSummary {
  code: string;
  name: string;
  memberCount: number;
  avatars: string[];
  createdAt: string;
}

/** Public room representation returned to clients (never leaks passwordHash). */
export interface RoomDto {
  id: string;
  code: string;
  name: string;
  hasPassword: boolean;
  hostId: string | null;
  joinMode: 'auto' | 'approval';
  width: number;
  height: number;
  status: string;
  createdAt: string;
}

type RoomWithSettings = Room & { settings: RoomSettings | null };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Paginated, searchable list of active rooms with their total roster. */
  async list(
    search: string | undefined,
    skip: number,
    take: number,
  ): Promise<{ rooms: RoomSummary[]; total: number }> {
    const term = (search ?? '').trim();
    const where = {
      status: 'active',
      ...(term
        ? {
            OR: [
              { code: { contains: term.toUpperCase() } },
              { name: { contains: term, mode: 'insensitive' as const } },
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
        avatars: r.members.map((m) => m.user.avatar).filter((a): a is string => !!a),
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    };
  }

  async create(dto: CreateRoomDto): Promise<RoomDto> {
    const code = await this.generateUniqueCode();
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : null;
    // Ensure the host exists as a (anonymous) user so the room can reference it.
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

  async join(dto: JoinRoomDto): Promise<RoomDto> {
    const room = await this.prisma.room.findUnique({
      where: { code: dto.code.toUpperCase() },
      include: { settings: true },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.passwordHash) {
      if (!dto.password) throw new UnauthorizedException('Password required');
      const ok = await bcrypt.compare(dto.password, room.passwordHash);
      if (!ok) throw new ForbiddenException('Incorrect password');
    }
    return this.toDto(room);
  }

  async findByCode(code: string): Promise<RoomDto> {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { settings: true },
    });
    if (!room) throw new NotFoundException('Room not found');
    return this.toDto(room);
  }

  /** Lightweight host/join-mode lookup for the realtime gateway. */
  async getAccess(code: string): Promise<{ hostId: string | null; joinMode: 'auto' | 'approval' } | null> {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { settings: true },
    });
    if (!room) return null;
    return { hostId: room.hostId, joinMode: (room.settings?.joinMode as 'auto' | 'approval') ?? 'auto' };
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = Array.from({ length: 6 }, () =>
        CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length)),
      ).join('');
      const existing = await this.prisma.room.findUnique({ where: { code } });
      if (!existing) return code;
    }
    throw new Error('Could not generate a unique room code');
  }

  private toDto(room: RoomWithSettings): RoomDto {
    return {
      id: room.id,
      code: room.code,
      name: room.name,
      hasPassword: !!room.passwordHash,
      hostId: room.hostId,
      joinMode: (room.settings?.joinMode as 'auto' | 'approval') ?? 'auto',
      width: room.width,
      height: room.height,
      status: room.status,
      createdAt: room.createdAt.toISOString(),
    };
  }
}
