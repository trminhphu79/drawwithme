import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { RoomsModule } from './rooms/rooms.module';
import { CanvasModule } from './canvas/canvas.module';
import { ArtworksModule } from './artworks/artworks.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    RoomsModule,
    CanvasModule,
    ArtworksModule,
    CleanupModule,
    AdminModule,
  ],
})
export class AppModule {}
