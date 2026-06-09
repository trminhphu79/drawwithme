import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Host-authorized room update. `requesterId` is the caller's stable client id
 * (from localStorage); the service only applies the change when it matches the
 * room's hostId. Not strong auth — consistent with the app's anonymous model.
 */
export class ManageRoomDto {
  @IsString()
  @MaxLength(64)
  requesterId!: string;

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
