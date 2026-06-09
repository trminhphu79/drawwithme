import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: 'active' | 'archived';

  @IsOptional()
  @IsIn(['auto', 'approval'])
  joinMode?: 'auto' | 'approval';

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(50)
  capacity?: number;
}
