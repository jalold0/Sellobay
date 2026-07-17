import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller({ path: 'inventory', version: '1' })
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get(':warehouseId')
  list(@Param('warehouseId') warehouseId: string) {
    return this.service.listByWarehouse(warehouseId);
  }

  @Post('adjust')
  adjust(
    @Body()
    body: {
      warehouseId: string;
      variantId: string;
      delta: number;
      reason?: string;
      performedBy?: string;
    },
  ) {
    return this.service.adjust(body);
  }
}
