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
import { ManageRoomDto } from './dto/manage-room.dto';

/** A room card in the lobby list (total roster, all-time). */
export interface RoomSummary {
  code: string;
  name: string;
  memberCount: number;
  avatars: string[];
  createdAt: string;
}

/** A room the requesting user hosts (for the "My Rooms" management page). */
export interface ManagedRoomDto {
  code: string;
  name: string;
  status: string;
  joinMode: 'auto' | 'approval';
  capacity: number;
  memberCount: number;
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
  capacity: number;
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
      // Only surface rooms that someone has actually joined (hide empty ones).
      members: { some: {} },
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

  /** Lightweight host/join-mode/capacity lookup for the realtime gateway. */
  async getAccess(
    code: string,
  ): Promise<{ hostId: string | null; joinMode: 'auto' | 'approval'; capacity: number } | null> {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { settings: true },
    });
    if (!room) return null;
    return {
      hostId: room.hostId,
      joinMode: (room.settings?.joinMode as 'auto' | 'approval') ?? 'auto',
      capacity: room.settings?.capacity ?? 3,
    };
  }

  // ---- "My Rooms": self-service management for the room's host ----

  /** All rooms hosted by this client id, newest activity first. */
  async listByHost(hostId: string): Promise<ManagedRoomDto[]> {
    const id = (hostId ?? '').trim();
    if (!id) return [];
    const rooms = await this.prisma.room.findMany({
      where: { hostId: id },
      orderBy: { lastActivityAt: 'desc' },
      include: { settings: true, _count: { select: { members: true } } },
    });
    return rooms.map((r) => this.toManaged(r));
  }

  /** Update a hosted room's settings — only if the requester is the host. */
  async updateByHost(code: string, dto: ManageRoomDto): Promise<ManagedRoomDto> {
    const existing = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      select: { hostId: true },
    });
    this.assertHost(existing, dto.requesterId);

    const roomData: { name?: string; status?: string } = {};
    if (typeof dto.name === 'string') roomData.name = dto.name.trim() || 'Untitled Room';
    if (dto.status === 'active' || dto.status === 'archived') roomData.status = dto.status;

    const settings: { joinMode?: string; capacity?: number } = {};
    if (dto.joinMode === 'auto' || dto.joinMode === 'approval') settings.joinMode = dto.joinMode;
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

  /** Delete a hosted room + all its data — only if the requester is the host. */
  async deleteByHost(code: string, requesterId: string): Promise<{ deleted: true; code: string }> {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      select: { id: true, code: true, hostId: true },
    });
    this.assertHost(room, requesterId);
    await this.prisma.$transaction([
      this.prisma.artwork.deleteMany({ where: { roomId: room!.id } }),
      this.prisma.room.delete({ where: { id: room!.id } }),
    ]);
    return { deleted: true, code: room!.code };
  }

  /** Throw unless `requesterId` is the room's host. */
  private assertHost(room: { hostId: string | null } | null, requesterId: string): void {
    if (!room) throw new NotFoundException('Room not found');
    const id = (requesterId ?? '').trim();
    if (!id || !room.hostId || room.hostId !== id) {
      throw new ForbiddenException('You are not the host of this room');
    }
  }

  private toManaged(
    r: Room & { settings: RoomSettings | null; _count: { members: number } },
  ): ManagedRoomDto {
    return {
      code: r.code,
      name: r.name,
      status: r.status,
      joinMode: (r.settings?.joinMode as 'auto' | 'approval') ?? 'auto',
      capacity: r.settings?.capacity ?? 3,
      memberCount: r._count.members,
      createdAt: r.createdAt.toISOString(),
    };
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
      capacity: room.settings?.capacity ?? 3,
      width: room.width,
      height: room.height,
      status: room.status,
      createdAt: room.createdAt.toISOString(),
    };
  }
}
