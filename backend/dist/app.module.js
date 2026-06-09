"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const prisma_module_1 = require("./prisma/prisma.module");
const storage_module_1 = require("./storage/storage.module");
const rooms_module_1 = require("./rooms/rooms.module");
const canvas_module_1 = require("./canvas/canvas.module");
const artworks_module_1 = require("./artworks/artworks.module");
const cleanup_module_1 = require("./cleanup/cleanup.module");
const admin_module_1 = require("./admin/admin.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            storage_module_1.StorageModule,
            rooms_module_1.RoomsModule,
            canvas_module_1.CanvasModule,
            artworks_module_1.ArtworksModule,
            cleanup_module_1.CleanupModule,
            admin_module_1.AdminModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map