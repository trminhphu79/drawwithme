import { Controller, Get, Param } from '@nestjs/common';
import { ArtworksService, ArtworkDto } from './artworks.service';
import { DrawOperationDto } from '../canvas/operations.service';

@Controller('artworks')
export class ArtworksController {
  constructor(private readonly artworks: ArtworksService) {}

  /** `id` is an artwork id (shareable) or a room code (current session). */
  @Get(':id')
  get(@Param('id') id: string): Promise<ArtworkDto> {
    return this.artworks.get(id);
  }

  /** Stored operation snapshot — replay the artwork via its link. */
  @Get(':id/operations')
  operations(@Param('id') id: string): Promise<DrawOperationDto[]> {
    return this.artworks.getOperations(id);
  }
}
