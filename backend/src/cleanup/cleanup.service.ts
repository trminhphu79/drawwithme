import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/** Hours of inactivity after which a room (and its data) is purged. */
const INACTIVITY_HOURS = 24;

/**
 * Hourly cron that deletes rooms with no activity (join / draw / chat) in the
 * last 24h. Operations, messages and artworks cascade-delete with the room.
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async purgeStaleRooms(): Promise<void> {
    const cutoff = new Date(Date.now() - INACTIVITY_HOURS * 60 * 60 * 1000);
    const { count } = await this.prisma.room.deleteMany({
      where: { lastActivityAt: { lt: cutoff } },
    });
    if (count > 0) {
      this.logger.log(`Purged ${count} room(s) inactive for >${INACTIVITY_HOURS}h`);
    }
  }
}
