import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Room } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';

/** Public room representation returned to clients (never leaks passwordHash). */
export interface RoomDto {
  id: string;
  code: string;
  name: string;
  hasPassword: boolean;
  width: number;
  height: number;
  status: string;
  createdAt: string;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomDto): Promise<RoomDto> {
    const code = await this.generateUniqueCode();
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : null;
    const room = await this.prisma.room.create({
      data: { code, name: dto.name ?? 'Untitled Room', passwordHash },
    });
    return this.toDto(room);
  }

  async join(dto: JoinRoomDto): Promise<RoomDto> {
    const room = await this.prisma.room.findUnique({ where: { code: dto.code.toUpperCase() } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.passwordHash) {
      if (!dto.password) throw new UnauthorizedException('Password required');
      const ok = await bcrypt.compare(dto.password, room.passwordHash);
      if (!ok) throw new ForbiddenException('Incorrect password');
    }
    return this.toDto(room);
  }

  async findByCode(code: string): Promise<RoomDto> {
    const room = await this.prisma.room.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) throw new NotFoundException('Room not found');
    return this.toDto(room);
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

  private toDto(room: Room): RoomDto {
    return {
      id: room.id,
      code: room.code,
      name: room.name,
      hasPassword: !!room.passwordHash,
      width: room.width,
      height: room.height,
      status: room.status,
      createdAt: room.createdAt.toISOString(),
    };
  }
}
