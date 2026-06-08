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
exports.ArtworksController = void 0;
const common_1 = require("@nestjs/common");
const artworks_service_1 = require("./artworks.service");
let ArtworksController = class ArtworksController {
    constructor(artworks) {
        this.artworks = artworks;
    }
    get(id) {
        return this.artworks.getByRoomCode(id);
    }
};
exports.ArtworksController = ArtworksController;
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArtworksController.prototype, "get", null);
exports.ArtworksController = ArtworksController = __decorate([
    (0, common_1.Controller)('artworks'),
    __metadata("design:paramtypes", [artworks_service_1.ArtworksService])
], ArtworksController);
//# sourceMappingURL=artworks.controller.js.map