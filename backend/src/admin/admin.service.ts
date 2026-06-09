import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminRoomDto {
  code: string;
  name: string;
  status: string;
  joinMode: 'auto' | 'approval';
  capacity: number;
  hostId: string | null;
  memberCount: number;
  createdAt: string;
}

export interface UpdateRoomSettings {
  name?: string;
  status?: 'active' | 'archived';
  joinMode?: 'auto' | 'approval';
  capacity?: number;
}

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly log = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Seed a single admin account from env on boot (idempotent). */
  async onModuleInit(): Promise<void> {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      this.log.warn('ADMIN_PASSWORD not set — admin account not seeded.');
      return;
    }
    try {
      const existing = await this.prisma.user.findFirst({ where: { username } });
      if (existing) return; // already there — never re-init
      await this.prisma.user.create({
        data: {
          id: randomUUID(),
          username,
          type: 'admin',
          passwordHash: await bcrypt.hash(password, 10),
        },
      });
      this.log.log(`Seeded admin account "${username}".`);
    } catch (err) {
      this.log.error('Failed to seed admin account', err as Error);
    }
  }

  /** Verify credentials; returns the admin user or throws. */
  async validate(username: string, password: string): Promise<{ id: string; username: string }> {
    const user = await this.prisma.user.findFirst({
      where: { username, type: 'admin' },
    });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid username or password');
    }
    return { id: user.id, username: user.username ?? username };
  }

  /** Paginated, searchable room list for the admin table (with live-ish counts). */
  async listRooms(
    search: string | undefined,
    skip: number,
    take: number,
  ): Promise<{ rooms: AdminRoomDto[]; total: number }> {
    const term = (search ?? '').trim();
    const where = term
      ? {
          OR: [
            { code: { contains: term.toUpperCase() } },
            { name: { contains: term, mode: 'insensitive' as const } },
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
        joinMode: (r.settings?.joinMode as 'auto' | 'approval') ?? 'auto',
        capacity: r.settings?.capacity ?? 3,
        hostId: r.hostId,
        memberCount: r._count.members,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * Hard-delete a room and everything tied to it. Operations, messages,
   * settings and memberships cascade automatically; artworks are deleted
   * explicitly (their FK is SetNull, so they'd otherwise survive).
   */
  async deleteRoom(code: string): Promise<{ deleted: true; code: string }> {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      select: { id: true, code: true },
    });
    if (!room) throw new NotFoundException('Room not found');
    await this.prisma.$transaction([
      this.prisma.artwork.deleteMany({ where: { roomId: room.id } }),
      this.prisma.room.delete({ where: { id: room.id } }),
    ]);
    this.log.log(`Deleted room ${room.code} and all associated data.`);
    return { deleted: true, code: room.code };
  }

  /** Update a room's name/status + settings (joinMode/capacity). */
  async updateRoom(code: string, dto: UpdateRoomSettings): Promise<AdminRoomDto> {
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
    return {
      code: room.code,
      name: room.name,
      status: room.status,
      joinMode: (room.settings?.joinMode as 'auto' | 'approval') ?? 'auto',
      capacity: room.settings?.capacity ?? 3,
      hostId: room.hostId,
      memberCount: room._count.members,
      createdAt: room.createdAt.toISOString(),
    };
  }
}
