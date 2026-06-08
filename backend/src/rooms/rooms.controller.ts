import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RoomsService, RoomDto } from './rooms.service';
import { OperationsService, DrawOperationDto } from '../canvas/operations.service';
import { ArtworksService } from '../artworks/artworks.service';
import { MessagesService, ChatMessageDto } from '../messages/messages.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { SnapshotDto } from './dto/snapshot.dto';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly operations: OperationsService,
    private readonly artworks: ArtworksService,
    private readonly messages: MessagesService,
  ) {}

  @Post()
  create(@Body() dto: CreateRoomDto): Promise<RoomDto> {
    return this.rooms.create(dto);
  }

  @Post('join')
  join(@Body() dto: JoinRoomDto): Promise<RoomDto> {
    return this.rooms.join(dto);
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
}
