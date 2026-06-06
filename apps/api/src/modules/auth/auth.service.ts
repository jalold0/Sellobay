import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hashPassword, verifyPassword } from '@ecom/auth';
import { UserStatus, UserRole } from '@ecom/database';

import { PrismaService } from '../../shared/prisma/prisma.service';

import { type LoginDto } from './dto/login.dto';
import { type RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (existing) throw new ConflictException('User with this email or phone already exists');

    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        status: UserStatus.PENDING,
        roles: { create: [{ role: UserRole.CUSTOMER }] },
      },
      include: { roles: true },
    });

    return this.issueTokens(user.id, user.roles.map((r) => r.role));
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: dto.email ? { email: dto.email } : { phone: dto.phone },
      include: { roles: true },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.status === UserStatus.BLOCKED) throw new UnauthorizedException('Account blocked');

    const valid = await verifyPassword(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(user.id, user.roles.map((r) => r.role));
  }

  private issueTokens(userId: string, roles: string[]) {
    const payload = { sub: userId, roles };
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '30d',
    });
    return { accessToken, refreshToken };
  }
}
