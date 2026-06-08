import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SnapshotDto {
  /** PNG data URL of the rasterized canvas. */
  @IsString()
  dataUrl!: string;

  /** Optional artwork title (used for the saved file name). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}
