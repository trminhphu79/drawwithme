import { IsString } from 'class-validator';

export class ReferenceDto {
  /** Data URL of the uploaded reference image. */
  @IsString()
  dataUrl!: string;
}
