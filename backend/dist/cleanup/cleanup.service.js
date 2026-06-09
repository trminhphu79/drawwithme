"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const INACTIVITY_HOURS = 24;
const EMPTY_ROOM_INACTIVITY_HOURS = 1;
let CleanupService = CleanupService_1 = class CleanupService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(CleanupService_1.name);
    }
    async purgeStaleRooms() {
        const emptyCutoff = new Date(Date.now() - EMPTY_ROOM_INACTIVITY_HOURS * 60 * 60 * 1000);
        const empty = await this.prisma.room.deleteMany({
            where: { members: { none: {} }, lastActivityAt: { lt: emptyCutoff } },
        });
        if (empty.count > 0) {
            this.logger.log(`Purged ${empty.count} empty room(s) untouched for >${EMPTY_ROOM_INACTIVITY_HOURS}h`);
        }
        const cutoff = new Date(Date.now() - INACTIVITY_HOURS * 60 * 60 * 1000);
        const { count } = await this.prisma.room.deleteMany({
            where: { lastActivityAt: { lt: cutoff } },
        });
        if (count > 0) {
            this.logger.log(`Purged ${count} room(s) inactive for >${INACTIVITY_HOURS}h`);
        }
    }
};
exports.CleanupService = CleanupService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CleanupService.prototype, "purgeStaleRooms", null);
exports.CleanupService = CleanupService = CleanupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CleanupService);
//# sourceMappingURL=cleanup.service.js.map