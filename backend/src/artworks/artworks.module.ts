import { Module } from '@nestjs/common';
import { ArtworksService } from './artworks.service';
import { ArtworksController } from './artworks.controller';

@Module({
  controllers: [ArtworksController],
  providers: [ArtworksService],
  exports: [ArtworksService],
})
export class ArtworksModule {}
