import { Injectable } from '@nestjs/common';
import { PaymentProvider as ProviderEnum } from '@ecom/database';

import { PrismaService } from '../../shared/prisma/prisma.service';

import { ClickProvider } from './providers/click.provider';
import { PaymeProvider } from './providers/payme.provider';
import { UzumBankProvider } from './providers/uzum-bank.provider';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly click: ClickProvider,
    private readonly payme: PaymeProvider,
    private readonly uzum: UzumBankProvider,
  ) {}

  async initiate(orderId: string, provider: ProviderEnum) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    switch (provider) {
      case ProviderEnum.CLICK:
        return this.click.initiate(order);
      case ProviderEnum.PAYME:
        return this.payme.initiate(order);
      case ProviderEnum.UZUM_BANK:
        return this.uzum.initiate(order);
      default:
        throw new Error(`Provider ${provider} not yet implemented`);
    }
  }

  async handleWebhook(provider: ProviderEnum, payload: unknown) {
    switch (provider) {
      case ProviderEnum.CLICK:
        return this.click.handleWebhook(payload);
      case ProviderEnum.PAYME:
        return this.payme.handleWebhook(payload);
      case ProviderEnum.UZUM_BANK:
        return this.uzum.handleWebhook(payload);
      default:
        throw new Error(`Provider ${provider} webhook not implemented`);
    }
  }
}
