import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: true, addresses: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async listAddresses(userId: string) {
    return this.prisma.userAddress.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}
