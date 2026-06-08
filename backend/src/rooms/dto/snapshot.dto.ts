import { IsString } from 'class-validator';

export class SnapshotDto {
  /** PNG data URL of the rasterized canvas. */
  @IsString()
  dataUrl!: string;
}
