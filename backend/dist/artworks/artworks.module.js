"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtworksModule = void 0;
const common_1 = require("@nestjs/common");
const artworks_service_1 = require("./artworks.service");
const artworks_controller_1 = require("./artworks.controller");
let ArtworksModule = class ArtworksModule {
};
exports.ArtworksModule = ArtworksModule;
exports.ArtworksModule = ArtworksModule = __decorate([
    (0, common_1.Module)({
        controllers: [artworks_controller_1.ArtworksController],
        providers: [artworks_service_1.ArtworksService],
        exports: [artworks_service_1.ArtworksService],
    })
], ArtworksModule);
//# sourceMappingURL=artworks.module.js.map