import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { MovementsService } from './movements.service';

@ApiTags('movements')
@Controller({ path: 'movements', version: '1' })
export class MovementsController {
  constructor(private readonly service: MovementsService) {}

  @Get(':warehouseId')
  recent(@Param('warehouseId') warehouseId: string, @Query('limit') limit?: string) {
    return this.service.recent(warehouseId, limit ? Number(limit) : undefined);
  }
}
