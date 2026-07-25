import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.warehouse.findMany({
      where: { isActive: true },
      include: { _count: { select: { inventory: true, locations: true } } },
    });
  }

  async byId(id: string) {
    const wh = await this.prisma.warehouse.findUnique({
      where: { id },
      include: { locations: true },
    });
    if (!wh) throw new NotFoundException('Warehouse not found');
    return wh;
  }
}
