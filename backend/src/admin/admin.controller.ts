import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService, AdminRoomDto } from './admin.service';
import { AdminTokenService } from './admin-token.service';
import { AdminGuard } from './admin.guard';
import { AdminLoginDto } from './dto/login.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly tokens: AdminTokenService,
  ) {}

  /** Public: exchange username/password for a bearer token. */
  @Post('login')
  async login(@Body() dto: AdminLoginDto): Promise<{ token: string; username: string }> {
    const user = await this.admin.validate(dto.username, dto.password);
    return { token: this.tokens.sign(user), username: user.username };
  }

  /** Confirm the current token is still valid (used by the FE guard). */
  @Get('me')
  @UseGuards(AdminGuard)
  me(): { ok: true } {
    return { ok: true };
  }

  @Get('rooms')
  @UseGuards(AdminGuard)
  listRooms(
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<{ rooms: AdminRoomDto[]; total: number }> {
    const skipN = Math.max(0, Number(skip) || 0);
    const takeN = Math.min(100, Math.max(1, Number(take) || 20));
    return this.admin.listRooms(search, skipN, takeN);
  }

  @Patch('rooms/:code')
  @UseGuards(AdminGuard)
  updateRoom(@Param('code') code: string, @Body() dto: UpdateRoomDto): Promise<AdminRoomDto> {
    return this.admin.updateRoom(code, dto);
  }

  /** Hard-delete a room + all its data (operations, messages, artworks, …). */
  @Delete('rooms/:code')
  @UseGuards(AdminGuard)
  deleteRoom(@Param('code') code: string): Promise<{ deleted: true; code: string }> {
    return this.admin.deleteRoom(code);
  }
}
