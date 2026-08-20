import {
  Body,
  Controller,
  forwardRef,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Logger } from '@nestjs/common';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';

import { DemandService } from './demand.service';
import { DemandNotificationAutomationService } from '../demand-notification/demand-notification.automation';
import { getUserSections } from '../../common/utils/section-auth';
import { ALL_ADMIN_ROLES } from '@shared/api.interface';
import type {
  CreateCommentRequest,
  CreateDemandRequest,
  UpdateDemandAssigneeRequest,
  UpdateDemandScoreRequest,
  UpdateDemandStatusRequest,
} from '@shared/api.interface';

@Controller('api/demands')
export class DemandController {
  private readonly logger = new Logger(DemandController.name);

  constructor(
    private readonly demandService: DemandService,
    @Inject(forwardRef(() => DemandNotificationAutomationService))
    private readonly notificationService: DemandNotificationAutomationService,
  ) {}

  @Get()
  async list(
    @Query('categoryId') categoryId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.demandService.list(
      categoryId,
      parseInt(page ?? '1', 10) || 1,
      parseInt(pageSize ?? '20', 10) || 20,
    );
  }

  @NeedLogin()
  @Post()
  async create(@Req() req: Request, @Body() body: CreateDemandRequest) {
    const userId = req.userContext?.userId ?? '';
    const result = await this.demandService.create(body, userId);
    void this.notificationService
      .processNewDemand(result.id, body.categoryId)
      .catch((error) => {
        this.logger.error(
          `新需求通知触发失败: demandId=${result.id}, error=${
            error instanceof Error ? error.stack ?? error.message : 'unknown'
          }`,
        );
      });
    return result;
  }

  @NeedLogin()
  @Get('my')
  async listMine(@Req() req: Request) {
    const userId = req.userContext?.userId ?? '';
    return this.demandService.listMine(userId);
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.demandService.detail(id);
  }

  @Get(':id/comments')
  async listComments(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.demandService.listComments(
      id,
      parseInt(page ?? '1', 10) || 1,
      parseInt(pageSize ?? '20', 10) || 20,
    );
  }

  @NeedLogin()
  @Post(':id/comments')
  async createComment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: CreateCommentRequest,
  ) {
    const userId = req.userContext?.userId ?? '';
    return this.demandService.createComment(id, body, userId);
  }

  @NeedLogin()
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateDemandStatusRequest,
  ) {
    await this.demandService.updateStatus(id, body.status, body.plannedSchedule);
    return { success: true };
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Patch(':id/score')
  async updateScore(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateDemandScoreRequest,
  ) {
    const userSections = getUserSections(req.userContext?.roles);
    await this.demandService.updateManualScore(id, body.manualScore ?? null, userSections);
    return { success: true };
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Patch(':id/assignee')
  async updateAssignee(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateDemandAssigneeRequest,
  ) {
    const userSections = getUserSections(req.userContext?.roles);
    await this.demandService.updateAssignee(id, body.assignee, userSections);
    return { success: true };
  }
}
