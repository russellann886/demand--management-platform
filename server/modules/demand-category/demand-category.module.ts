import { Module } from '@nestjs/common';

import { DemandCategoryController } from './demand-category.controller';
import { DemandCategoryService } from './demand-category.service';

@Module({
  controllers: [DemandCategoryController],
  providers: [DemandCategoryService],
  exports: [DemandCategoryService],
})
export class DemandCategoryModule {}
