"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminTokenService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
let AdminTokenService = class AdminTokenService {
    constructor() {
        this.secret = process.env.ADMIN_JWT_SECRET || process.env.ADMIN_PASSWORD || 'dwm-admin-dev-secret';
        this.ttlMs = 8 * 60 * 60 * 1000;
    }
    sign(user) {
        const payload = {
            sub: user.id,
            username: user.username,
            exp: Date.now() + this.ttlMs,
        };
        const body = this.b64url(JSON.stringify(payload));
        return `${body}.${this.b64url(this.hmac(body))}`;
    }
    verify(token) {
        if (!token)
            return null;
        const [body, sig] = token.split('.');
        if (!body || !sig)
            return null;
        const expected = this.b64url(this.hmac(body));
        if (!this.safeEqual(sig, expected))
            return null;
        try {
            const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
            if (!payload.exp || payload.exp < Date.now())
                return null;
            return payload;
        }
        catch {
            return null;
        }
    }
    hmac(data) {
        return (0, crypto_1.createHmac)('sha256', this.secret).update(data).digest();
    }
    b64url(input) {
        return Buffer.from(input).toString('base64url');
    }
    safeEqual(a, b) {
        const ab = Buffer.from(a);
        const bb = Buffer.from(b);
        return ab.length === bb.length && (0, crypto_1.timingSafeEqual)(ab, bb);
    }
};
exports.AdminTokenService = AdminTokenService;
exports.AdminTokenService = AdminTokenService = __decorate([
    (0, common_1.Injectable)()
], AdminTokenService);
//# sourceMappingURL=admin-token.service.js.map