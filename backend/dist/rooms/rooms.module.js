"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomsModule = void 0;
const common_1 = require("@nestjs/common");
const rooms_controller_1 = require("./rooms.controller");
const rooms_service_1 = require("./rooms.service");
const canvas_module_1 = require("../canvas/canvas.module");
const artworks_module_1 = require("../artworks/artworks.module");
const messages_module_1 = require("../messages/messages.module");
let RoomsModule = class RoomsModule {
};
exports.RoomsModule = RoomsModule;
exports.RoomsModule = RoomsModule = __decorate([
    (0, common_1.Module)({
        imports: [canvas_module_1.CanvasModule, artworks_module_1.ArtworksModule, messages_module_1.MessagesModule],
        controllers: [rooms_controller_1.RoomsController],
        providers: [rooms_service_1.RoomsService],
        exports: [rooms_service_1.RoomsService],
    })
], RoomsModule);
//# sourceMappingURL=rooms.module.js.map