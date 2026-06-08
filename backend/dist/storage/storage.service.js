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
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
let StorageService = StorageService_1 = class StorageService {
    constructor() {
        this.logger = new common_1.Logger(StorageService_1.name);
        this.bucket = process.env.R2_BUCKET;
        this.publicBase = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/+$/, '');
        const accountId = process.env.R2_ACCOUNT_ID;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        this.configured = !!(accountId && accessKeyId && secretAccessKey && this.bucket && this.publicBase);
        if (this.configured) {
            this.client = new client_s3_1.S3Client({
                region: 'auto',
                endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
                credentials: { accessKeyId: accessKeyId, secretAccessKey: secretAccessKey },
            });
            this.logger.log(`R2 storage enabled (bucket: ${this.bucket})`);
        }
        else {
            this.logger.warn('R2 not configured — storing media as data URLs (fallback).');
        }
    }
    async putDataUrl(key, dataUrl) {
        if (!this.configured || !dataUrl?.startsWith('data:'))
            return dataUrl;
        const match = /^data:(.+?);base64,(.*)$/s.exec(dataUrl);
        if (!match)
            return dataUrl;
        try {
            return await this.putBuffer(key, Buffer.from(match[2], 'base64'), match[1]);
        }
        catch (err) {
            this.logger.error(`R2 upload failed for ${key}: ${err.message}`);
            return dataUrl;
        }
    }
    async putBuffer(key, body, contentType) {
        await this.client.send(new client_s3_1.PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
        return `${this.publicBase}/${key}`;
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StorageService);
//# sourceMappingURL=storage.service.js.map