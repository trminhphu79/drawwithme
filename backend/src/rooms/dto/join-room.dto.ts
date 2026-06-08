import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @MinLength(4)
  @MaxLength(12)
  code!: string;

  @IsOptional()
  @IsString()
  password?: string;
}
