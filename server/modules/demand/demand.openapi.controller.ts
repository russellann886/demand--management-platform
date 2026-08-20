import {
  Body,
  Controller,
  forwardRef,
  Inject,
  Logger,
  Post,
} from '@nestjs/common';

import { DemandService } from './demand.service';
import { DemandNotificationAutomationService } from '../demand-notification/demand-notification.automation';
import type { CreateDemandOpenApiRequest } from '@shared/api.interface';

@Controller('openapi/demands')
export class DemandOpenApiController {
  private readonly logger = new Logger(DemandOpenApiController.name);

  constructor(
    private readonly demandService: DemandService,
    @Inject(forwardRef(() => DemandNotificationAutomationService))
    private readonly notificationService: DemandNotificationAutomationService,
  ) {}

  @Post()
  async create(@Body() body: CreateDemandOpenApiRequest) {
    const result = await this.demandService.createExternal(body);
    void this.notificationService
      .processNewDemand(result.id, body.categoryId)
      .catch((error) => {
        this.logger.error(
          `外部提交需求通知触发失败: demandId=${result.id}, error=${
            error instanceof Error ? error.stack ?? error.message : 'unknown'
          }`,
        );
      });
    return result;
  }
}
