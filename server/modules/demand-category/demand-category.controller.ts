import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';

import { DemandCategoryService } from './demand-category.service';
import { getUserSections } from '../../common/utils/section-auth';
import { ALL_ADMIN_ROLES } from '@shared/api.interface';
import type {
  CreateDemandCategoryRequest,
  UpdateDemandCategoryRequest,
} from '@shared/api.interface';

@Controller('api/demand-categories')
export class DemandCategoryController {
  constructor(
    private readonly demandCategoryService: DemandCategoryService,
  ) {}

  @Get()
  async list() {
    return this.demandCategoryService.list(true);
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Get('all')
  async listAll(@Req() req: Request) {
    const userSections = getUserSections(req.userContext?.roles);
    return this.demandCategoryService.list(false, userSections);
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Get('board-admins')
  async getBoardAdmins() {
    return this.demandCategoryService.getBoardAdmins();
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Post()
  async create(@Req() req: Request, @Body() body: CreateDemandCategoryRequest) {
    const userSections = getUserSections(req.userContext?.roles);
    return this.demandCategoryService.create(body, userSections);
  }

  @CanRole(ALL_ADMIN_ROLES)
  @NeedLogin()
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateDemandCategoryRequest,
  ) {
    const userSections = getUserSections(req.userContext?.roles);
    return this.demandCategoryService.update(id, body, userSections);
  }
}
