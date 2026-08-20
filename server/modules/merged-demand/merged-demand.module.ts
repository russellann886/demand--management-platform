import { forwardRef, Module } from '@nestjs/common';

import { DemandModule } from '../demand/demand.module';
import { MergedDemandController } from './merged-demand.controller';
import { MergedDemandService } from './merged-demand.service';

@Module({
  imports: [forwardRef(() => DemandModule)],
  controllers: [MergedDemandController],
  providers: [MergedDemandService],
  exports: [MergedDemandService],
})
export class MergedDemandModule {}
