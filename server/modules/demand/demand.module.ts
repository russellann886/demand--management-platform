import { forwardRef, Module } from '@nestjs/common';

import { DemandController } from './demand.controller';
import { DemandOpenApiController } from './demand.openapi.controller';
import { DemandService } from './demand.service';
import { DemandNotificationModule } from '../demand-notification/demand-notification.module';

@Module({
  imports: [forwardRef(() => DemandNotificationModule)],
  controllers: [DemandController, DemandOpenApiController],
  providers: [DemandService],
  exports: [DemandService],
})
export class DemandModule {}
