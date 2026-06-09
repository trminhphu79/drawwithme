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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomsController = void 0;
const common_1 = require("@nestjs/common");
const rooms_service_1 = require("./rooms.service");
const operations_service_1 = require("../canvas/operations.service");
const artworks_service_1 = require("../artworks/artworks.service");
const messages_service_1 = require("../messages/messages.service");
const storage_service_1 = require("../storage/storage.service");
const create_room_dto_1 = require("./dto/create-room.dto");
const join_room_dto_1 = require("./dto/join-room.dto");
const snapshot_dto_1 = require("./dto/snapshot.dto");
const reference_dto_1 = require("./dto/reference.dto");
let RoomsController = class RoomsController {
    constructor(rooms, operations, artworks, messages, storage) {
        this.rooms = rooms;
        this.operations = operations;
        this.artworks = artworks;
        this.messages = messages;
        this.storage = storage;
    }
    create(dto) {
        return this.rooms.create(dto);
    }
    join(dto) {
        return this.rooms.join(dto);
    }
    list(search, skip, take) {
        const skipN = Math.max(0, Number(skip) || 0);
        const takeN = Math.min(50, Math.max(1, Number(take) || 20));
        return this.rooms.list(search, skipN, takeN);
    }
    get(code) {
        return this.rooms.findByCode(code);
    }
    operationsForRoom(code) {
        return this.operations.listByRoom(code);
    }
    messagesForRoom(code) {
        return this.messages.listByRoom(code);
    }
    snapshot(code, dto) {
        return this.artworks.saveSnapshot(code, dto.dataUrl, dto.title, dto.participants);
    }
    async reference(code, dto) {
        const key = `rooms/${code.toUpperCase()}/reference-${Date.now()}.png`;
        const url = await this.storage.putDataUrl(key, dto.dataUrl);
        await this.operations.setReference(code, url);
        return { url };
    }
};
exports.RoomsController = RoomsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_room_dto_1.CreateRoomDto]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('join'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [join_room_dto_1.JoinRoomDto]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "join", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('skip')),
    __param(2, (0, common_1.Query)('take')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':code'),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(':code/operations'),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "operationsForRoom", null);
__decorate([
    (0, common_1.Get)(':code/messages'),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "messagesForRoom", null);
__decorate([
    (0, common_1.Post)(':code/snapshot'),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, snapshot_dto_1.SnapshotDto]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "snapshot", null);
__decorate([
    (0, common_1.Post)(':code/reference'),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reference_dto_1.ReferenceDto]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "reference", null);
exports.RoomsController = RoomsController = __decorate([
    (0, common_1.Controller)('rooms'),
    __metadata("design:paramtypes", [rooms_service_1.RoomsService,
        operations_service_1.OperationsService,
        artworks_service_1.ArtworksService,
        messages_service_1.MessagesService,
        storage_service_1.StorageService])
], RoomsController);
//# sourceMappingURL=rooms.controller.js.map