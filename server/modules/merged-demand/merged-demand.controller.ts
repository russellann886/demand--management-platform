import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';

import { MergedDemandService } from './merged-demand.service';
import { getUserSections } from '../../common/utils/section-auth';
import { ALL_ADMIN_ROLES } from '@shared/api.interface';
import type {
  AddMergedSourcesRequest,
  CreateMergedDemandRequest,
  UpdateMergedDemandRequest,
} from '@shared/api.interface';

@Controller('api/merged-demands')
export class MergedDemandController {
  constructor(private readonly mergedDemandService: MergedDemandService) {}

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Get('source-demands')
  async listSourceDemands(
    @Req() req: Request,
    @Query('categoryId') categoryId: string,
  ) {
    const userSections = getUserSections(req.userContext?.roles);
    return this.mergedDemandService.listSourceDemands(categoryId, userSections);
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Get()
  async list(
    @Req() req: Request,
    @Query('categoryId') categoryId: string,
  ) {
    const userSections = getUserSections(req.userContext?.roles);
    return this.mergedDemandService.list(categoryId, userSections);
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Post()
  async create(@Req() req: Request, @Body() body: CreateMergedDemandRequest) {
    const userSections = getUserSections(req.userContext?.roles);
    return this.mergedDemandService.create(body, userSections);
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateMergedDemandRequest,
  ) {
    const userSections = getUserSections(req.userContext?.roles);
    return this.mergedDemandService.update(id, body, userSections);
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Post(':id/sources')
  async addSources(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: AddMergedSourcesRequest,
  ) {
    const userSections = getUserSections(req.userContext?.roles);
    return this.mergedDemandService.addSources(id, body, userSections);
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Delete(':id/sources/:demandId')
  async removeSource(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('demandId') demandId: string,
  ) {
    const userSections = getUserSections(req.userContext?.roles);
    return this.mergedDemandService.removeSource(id, demandId, userSections);
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userSections = getUserSections(req.userContext?.roles);
    return this.mergedDemandService.remove(id, userSections);
  }
}
