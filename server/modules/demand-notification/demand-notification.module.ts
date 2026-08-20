import { forwardRef, Module } from '@nestjs/common';

import { DemandModule } from '../demand/demand.module';
import { MergedDemandModule } from '../merged-demand/merged-demand.module';
import { DemandNotificationAutomationService } from './demand-notification.automation';

@Module({
  imports: [forwardRef(() => DemandModule), MergedDemandModule],
  providers: [DemandNotificationAutomationService],
  exports: [DemandNotificationAutomationService],
})
export class DemandNotificationModule {}
