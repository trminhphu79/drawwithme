import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { RoomsModule } from './rooms/rooms.module';
import { CanvasModule } from './canvas/canvas.module';
import { ArtworksModule } from './artworks/artworks.module';
import { CleanupModule } from './cleanup/cleanup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RoomsModule,
    CanvasModule,
    ArtworksModule,
    CleanupModule,
  ],
})
export class AppModule {}
