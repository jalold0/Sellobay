import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus, type Prisma } from '@ecom/database';

import { PrismaService } from '../../shared/prisma/prisma.service';

import { type ListProductsQuery } from './dto/list-products.query';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProductsQuery) {
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      ...(query.brandId && { brandId: query.brandId }),
      ...(query.categoryId && { categories: { some: { categoryId: query.categoryId } } }),
      ...(query.sellerId && { sellerId: query.sellerId }),
      ...(query.minPrice && { basePrice: { gte: query.minPrice } }),
      ...(query.maxPrice && {
        basePrice: { ...(query.minPrice ? { gte: query.minPrice } : {}), lte: query.maxPrice },
      }),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sortBy === 'price'
        ? { basePrice: query.sortOrder ?? 'asc' }
        : query.sortBy === 'rating'
        ? { rating: query.sortOrder ?? 'desc' }
        : query.sortBy === 'newest'
        ? { publishedAt: 'desc' }
        : { soldCount: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { images: { where: { isPrimary: true }, take: 1 }, brand: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async bySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { position: 'asc' } },
        brand: true,
        categories: { include: { category: true } },
        variants: { where: { isActive: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
