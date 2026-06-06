import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
    });
  }

  tree() {
    return this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: { children: { include: { children: true } } },
      orderBy: { position: 'asc' },
    });
  }

  bySlug(slug: string) {
    return this.prisma.category.findUnique({
      where: { slug },
      include: { children: true, parent: true },
    });
  }
}
