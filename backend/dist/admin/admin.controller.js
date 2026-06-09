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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const admin_token_service_1 = require("./admin-token.service");
const admin_guard_1 = require("./admin.guard");
const login_dto_1 = require("./dto/login.dto");
const update_room_dto_1 = require("./dto/update-room.dto");
let AdminController = class AdminController {
    constructor(admin, tokens) {
        this.admin = admin;
        this.tokens = tokens;
    }
    async login(dto) {
        const user = await this.admin.validate(dto.username, dto.password);
        return { token: this.tokens.sign(user), username: user.username };
    }
    me() {
        return { ok: true };
    }
    listRooms(search, skip, take) {
        const skipN = Math.max(0, Number(skip) || 0);
        const takeN = Math.min(100, Math.max(1, Number(take) || 20));
        return this.admin.listRooms(search, skipN, takeN);
    }
    updateRoom(code, dto) {
        return this.admin.updateRoom(code, dto);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.AdminLoginDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], AdminController.prototype, "me", null);
__decorate([
    (0, common_1.Get)('rooms'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('skip')),
    __param(2, (0, common_1.Query)('take')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listRooms", null);
__decorate([
    (0, common_1.Patch)('rooms/:code'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_room_dto_1.UpdateRoomDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateRoom", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        admin_token_service_1.AdminTokenService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map