import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/** Hours of inactivity after which a room (and its data) is purged. */
const INACTIVITY_HOURS = 24;
/** Empty rooms (nobody ever joined) are purged after just 1h of no activity. */
const EMPTY_ROOM_INACTIVITY_HOURS = 1;

/**
 * Hourly cron that purges rooms:
 *  - empty rooms (nobody joined) untouched for >1h, and
 *  - any room with no activity (join / draw / chat) in the last 24h.
 * Members, settings, operations and messages cascade-delete with the room;
 * artworks are kept (their FK is SetNull by design).
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async purgeStaleRooms(): Promise<void> {
    // Empty rooms nobody joined, untouched for >1h.
    const emptyCutoff = new Date(Date.now() - EMPTY_ROOM_INACTIVITY_HOURS * 60 * 60 * 1000);
    const empty = await this.prisma.room.deleteMany({
      where: { members: { none: {} }, lastActivityAt: { lt: emptyCutoff } },
    });
    if (empty.count > 0) {
      this.logger.log(
        `Purged ${empty.count} empty room(s) untouched for >${EMPTY_ROOM_INACTIVITY_HOURS}h`,
      );
    }

    // Any room inactive for >24h.
    const cutoff = new Date(Date.now() - INACTIVITY_HOURS * 60 * 60 * 1000);
    const { count } = await this.prisma.room.deleteMany({
      where: { lastActivityAt: { lt: cutoff } },
    });
    if (count > 0) {
      this.logger.log(`Purged ${count} room(s) inactive for >${INACTIVITY_HOURS}h`);
    }
  }
}
