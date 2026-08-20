import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';

import { RuleService } from './rule.service';
import { ALL_ADMIN_ROLES } from '@shared/api.interface';
import type {
  CreateRuleRequest,
  UpdateRuleRequest,
  UpdateRuleStatusRequest,
} from '@shared/api.interface';

@Controller('api/rules')
export class RuleController {
  constructor(private readonly ruleService: RuleService) {}

  @Get()
  async list(
    @Query('section') section?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('creator') creator?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Req() req?: Request,
  ) {
    const creatorId =
      creator === 'me' ? req?.userContext?.userId : undefined;
    return this.ruleService.list({
      section: section || undefined,
      type: type || undefined,
      status: status || undefined,
      creatorId,
      page: page ? parseInt(page, 10) || 1 : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) || 20 : 20,
    });
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.ruleService.detail(id);
  }

  @NeedLogin()
  @Post()
  async create(@Req() req: Request, @Body() body: CreateRuleRequest) {
    return this.ruleService.create(
      body,
      req.userContext?.userId ?? '',
      req.userContext?.roles,
    );
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateRuleRequest,
    @Req() req: Request,
  ) {
    return this.ruleService.update(id, body, req.userContext?.roles);
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: Request) {
    return this.ruleService.delete(id, req.userContext?.roles);
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateRuleStatusRequest,
    @Req() req: Request,
  ) {
    return this.ruleService.updateStatus(
      id,
      body,
      req.userContext?.userId ?? '',
      req.userContext?.roles,
    );
  }
}
