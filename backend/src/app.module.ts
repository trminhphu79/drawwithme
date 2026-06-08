import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RoomsModule } from './rooms/rooms.module';
import { CanvasModule } from './canvas/canvas.module';
import { ArtworksModule } from './artworks/artworks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RoomsModule,
    CanvasModule,
    ArtworksModule,
  ],
})
export class AppModule {}
