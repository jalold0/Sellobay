import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  recent(warehouseId: string, limit = 50) {
    return this.prisma.stockMovement.findMany({
      where: { warehouseId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
