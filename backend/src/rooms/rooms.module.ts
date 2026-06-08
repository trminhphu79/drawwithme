import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { CanvasModule } from '../canvas/canvas.module';
import { ArtworksModule } from '../artworks/artworks.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [CanvasModule, ArtworksModule, MessagesModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
