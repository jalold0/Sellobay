import { Injectable } from '@nestjs/common';
import { StockMovementType } from '@ecom/database';

import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  listByWarehouse(warehouseId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { warehouseId },
      include: { variant: { include: { product: true } }, location: true },
    });
  }

  async adjust(params: {
    warehouseId: string;
    variantId: string;
    delta: number;
    reason?: string;
    performedBy?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.upsert({
        where: {
          warehouseId_variantId_locationId: {
            warehouseId: params.warehouseId,
            variantId: params.variantId,
            locationId: null as never,
          },
        },
        update: { quantityOnHand: { increment: params.delta } },
        create: {
          warehouseId: params.warehouseId,
          variantId: params.variantId,
          quantityOnHand: params.delta,
        },
      });

      await tx.stockMovement.create({
        data: {
          warehouseId: params.warehouseId,
          variantId: params.variantId,
          type: params.delta > 0 ? StockMovementType.RECEIVING : StockMovementType.ADJUSTMENT,
          quantity: Math.abs(params.delta),
          reason: params.reason,
          performedBy: params.performedBy,
        },
      });

      return item;
    });
  }
}
