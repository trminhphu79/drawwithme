import { Controller, Get, Param } from '@nestjs/common';
import { ArtworksService, ArtworkDto } from './artworks.service';

@Controller('artworks')
export class ArtworksController {
  constructor(private readonly artworks: ArtworksService) {}

  /** `id` here is the room code (the client navigates to /artwork/:code). */
  @Get(':id')
  get(@Param('id') id: string): Promise<ArtworkDto> {
    return this.artworks.getByRoomCode(id);
  }
}
