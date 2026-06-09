import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RoomsService, RoomDto, RoomSummary } from './rooms.service';
import { OperationsService, DrawOperationDto } from '../canvas/operations.service';
import { ArtworksService } from '../artworks/artworks.service';
import { MessagesService, ChatMessageDto } from '../messages/messages.service';
import { StorageService } from '../storage/storage.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { SnapshotDto } from './dto/snapshot.dto';
import { ReferenceDto } from './dto/reference.dto';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly operations: OperationsService,
    private readonly artworks: ArtworksService,
    private readonly messages: MessagesService,
    private readonly storage: StorageService,
  ) {}

  @Post()
  create(@Body() dto: CreateRoomDto): Promise<RoomDto> {
    return this.rooms.create(dto);
  }

  @Post('join')
  join(@Body() dto: JoinRoomDto): Promise<RoomDto> {
    return this.rooms.join(dto);
  }

  /** Paginated, searchable lobby list of active rooms. */
  @Get()
  list(
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<{ rooms: RoomSummary[]; total: number }> {
    const skipN = Math.max(0, Number(skip) || 0);
    const takeN = Math.min(50, Math.max(1, Number(take) || 20));
    return this.rooms.list(search, skipN, takeN);
  }

  @Get(':code')
  get(@Param('code') code: string): Promise<RoomDto> {
    return this.rooms.findByCode(code);
  }

  /** Replay log for a room (ordered). */
  @Get(':code/operations')
  operationsForRoom(@Param('code') code: string): Promise<DrawOperationDto[]> {
    return this.operations.listByRoom(code);
  }

  /** Chat history for a room (ordered). */
  @Get(':code/messages')
  messagesForRoom(@Param('code') code: string): Promise<ChatMessageDto[]> {
    return this.messages.listByRoom(code);
  }

  /** Persist a rasterized snapshot (final artwork); returns the shareable id. */
  @Post(':code/snapshot')
  snapshot(
    @Param('code') code: string,
    @Body() dto: SnapshotDto,
  ): Promise<{ url: string; id: string }> {
    return this.artworks.saveSnapshot(code, dto.dataUrl, dto.title, dto.participants);
  }

  /** Upload/replace the room's shared reference image. */
  @Post(':code/reference')
  async reference(
    @Param('code') code: string,
    @Body() dto: ReferenceDto,
  ): Promise<{ url: string }> {
    const key = `rooms/${code.toUpperCase()}/reference-${Date.now()}.png`;
    const url = await this.storage.putDataUrl(key, dto.dataUrl);
    await this.operations.setReference(code, url);
    return { url };
  }
}
