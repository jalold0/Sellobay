import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ListProductsQuery } from './dto/list-products.query';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  list(@Query() query: ListProductsQuery) {
    return this.service.list(query);
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.service.bySlug(slug);
  }
}
