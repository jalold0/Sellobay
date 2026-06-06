import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'cart', version: '1' })
export class CartController {
  constructor(private readonly service: CartService) {}

  @Get()
  get(@CurrentUser('id') userId: string) {
    return this.service.getOrCreate(userId);
  }

  @Post('items')
  add(@CurrentUser('id') userId: string, @Body() dto: AddItemDto) {
    return this.service.addItem(userId, dto);
  }

  @Delete('items/:id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.removeItem(userId, id);
  }
}
