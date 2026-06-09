import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminTokenService } from './admin-token.service';
import { AdminGuard } from './admin.guard';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminTokenService, AdminGuard],
})
export class AdminModule {}
