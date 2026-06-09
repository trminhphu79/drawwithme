import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  password?: string;

  /** Stable client id of the creator (becomes the room host). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  hostId?: string;

  /** "auto" (default) or "approval" (host must admit joiners). */
  @IsOptional()
  @IsIn(['auto', 'approval'])
  joinMode?: 'auto' | 'approval';
}
