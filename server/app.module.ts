import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { DemandCategoryModule } from './modules/demand-category/demand-category.module';
import { DemandModule } from './modules/demand/demand.module';
import { MergedDemandModule } from './modules/merged-demand/merged-demand.module';
import { DemandNotificationModule } from './modules/demand-notification/demand-notification.module';
import { RuleModule } from './modules/rule/rule.module';
import { ViewModule } from './modules/view/view.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    DemandCategoryModule,
    DemandModule,
    MergedDemandModule,
    DemandNotificationModule,
    RuleModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
