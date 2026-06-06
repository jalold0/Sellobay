import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../shared/prisma/prisma.service';

import { type AddItemDto } from './dto/add-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    const existing = await this.prisma.cart.findFirst({
      where: { userId },
      include: { items: { include: { product: true, variant: true } } },
    });
    if (existing) return existing;
    return this.prisma.cart.create({
      data: { userId },
      include: { items: { include: { product: true, variant: true } } },
    });
  }

  async addItem(userId: string, dto: AddItemDto) {
    const cart = await this.getOrCreate(userId);
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');
    const unitPrice = dto.variantId
      ? (await this.prisma.productVariant.findUnique({ where: { id: dto.variantId } }))?.price ??
        product.basePrice
      : product.basePrice;
    return this.prisma.cartItem.upsert({
      where: {
        cartId_productId_variantId: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId ?? '',
        },
      },
      update: { quantity: { increment: dto.quantity ?? 1 } },
      create: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId,
        quantity: dto.quantity ?? 1,
        unitPrice,
      },
    });
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreate(userId);
    return this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  }
}
