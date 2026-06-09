import { Module } from '@nestjs/common';
import { CanvasGateway } from './canvas.gateway';
import { OperationsService } from './operations.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [MessagesModule],
  providers: [CanvasGateway, OperationsService],
  exports: [OperationsService, CanvasGateway],
})
export class CanvasModule {}
