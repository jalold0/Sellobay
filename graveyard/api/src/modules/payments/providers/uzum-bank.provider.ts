import { Injectable, Logger } from '@nestjs/common';
import { type Order } from '@ecom/database';

@Injectable()
export class UzumBankProvider {
  private readonly logger = new Logger(UzumBankProvider.name);

  initiate(order: Order) {
    this.logger.log(`[UZUM_BANK] init order=${order.number}`);
    // TODO: Uzum Bank Acquiring API
    return { provider: 'UZUM_BANK', orderId: order.id, checkoutUrl: '' };
  }

  handleWebhook(payload: unknown) {
    this.logger.log(`[UZUM_BANK] webhook: ${JSON.stringify(payload)}`);
    return { status: 'ok' };
  }
}
