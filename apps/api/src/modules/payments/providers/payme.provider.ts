import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Order } from '@ecom/database';

@Injectable()
export class PaymeProvider {
  private readonly logger = new Logger(PaymeProvider.name);

  constructor(private readonly config: ConfigService) {}

  initiate(order: Order) {
    const merchantId = this.config.get<string>('PAYME_MERCHANT_ID');
    const amountTiyin = Number(order.grandTotal) * 100;
    const payload = `m=${merchantId};ac.order_id=${order.id};a=${amountTiyin}`;
    const base64 = Buffer.from(payload).toString('base64');
    this.logger.log(`[PAYME] init order=${order.number}`);
    return {
      provider: 'PAYME',
      orderId: order.id,
      checkoutUrl: `${this.config.get('PAYME_ENDPOINT')}/${base64}`,
    };
  }

  handleWebhook(payload: unknown) {
    this.logger.log(`[PAYME] webhook: ${JSON.stringify(payload)}`);
    // TODO: Payme Merchant API (CheckPerformTransaction, CreateTransaction, ...)
    return { result: { allow: true } };
  }
}
