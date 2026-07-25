import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Order } from '@ecom/database';

@Injectable()
export class ClickProvider {
  private readonly logger = new Logger(ClickProvider.name);

  constructor(private readonly config: ConfigService) {}

  initiate(order: Order) {
    const serviceId = this.config.get<string>('CLICK_SERVICE_ID');
    const merchantId = this.config.get<string>('CLICK_MERCHANT_ID');
    this.logger.log(`[CLICK] init order=${order.number}`);
    // TODO: Click Checkout / Direct API integratsiyasi
    return {
      provider: 'CLICK',
      orderId: order.id,
      checkoutUrl: `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${order.grandTotal}&transaction_param=${order.number}`,
    };
  }

  handleWebhook(payload: unknown) {
    this.logger.log(`[CLICK] webhook payload: ${JSON.stringify(payload)}`);
    // TODO: prepare/complete signature tekshiruvi va to'lov yangilash
    return { status: 0, error: 0, error_note: 'success' };
  }
}
