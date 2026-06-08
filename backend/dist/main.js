"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    const origin = process.env.CORS_ORIGIN ?? 'http://localhost:4200';
    app.enableCors({ origin: origin.split(','), credentials: true });
    const express = app.getHttpAdapter().getInstance();
    express.use(require('express').json({ limit: '25mb' }));
    const port = Number(process.env.PORT ?? 3000);
    await app.listen(port, '0.0.0.0');
    console.log(`DrawWithMe API listening on http://0.0.0.0:${port}/api`);
}
void bootstrap();
//# sourceMappingURL=main.js.map