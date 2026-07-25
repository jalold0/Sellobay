import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { WarehousesService } from './warehouses.service';

@ApiTags('warehouses')
@Controller({ path: 'warehouses', version: '1' })
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.service.byId(id);
  }
}
