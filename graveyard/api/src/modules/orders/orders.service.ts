import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@ecom/database';

import { PrismaService } from '../../shared/prisma/prisma.service';

import { type CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('Order must contain at least one item');

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = new Prisma.Decimal(0);
    const orderItemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
      const unitPrice = new Prisma.Decimal(product.basePrice);
      const total = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(total);
      return {
        productId: product.id,
        variantId: item.variantId,
        sellerId: product.sellerId,
        sku: product.sku,
        nameSnapshot: product.name as Prisma.InputJsonValue,
        quantity: item.quantity,
        unitPrice,
        totalPrice: total,
      };
    });

    const number = await this.generateOrderNumber();

    return this.prisma.order.create({
      data: {
        number,
        userId,
        status: OrderStatus.PENDING,
        subtotal,
        grandTotal: subtotal,
        shippingAddressId: dto.shippingAddressId,
        deliveryMethod: dto.deliveryMethod,
        notes: dto.notes,
        promoCode: dto.promoCode,
        items: { create: orderItemsData },
        statusHistory: { create: [{ status: OrderStatus.PENDING, changedBy: userId }] },
      },
      include: { items: true },
    });
  }

  list(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { placedAt: 'desc' },
    });
  }

  byId(userId: string, id: string) {
    return this.prisma.order.findFirst({
      where: { id, userId },
      include: { items: true, payments: true, deliveries: true, statusHistory: true },
    });
  }

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.order.count({
      where: { placedAt: { gte: new Date(`${year}-01-01`) } },
    });
    return `ORD-${year}-${(count + 1).toString().padStart(8, '0')}`;
  }
}
