import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentProvider } from '@ecom/database';

import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('initiate/:orderId/:provider')
  initiate(@Param('orderId') orderId: string, @Param('provider') provider: PaymentProvider) {
    return this.service.initiate(orderId, provider);
  }

  @Post('webhook/:provider')
  webhook(@Param('provider') provider: PaymentProvider, @Body() payload: unknown) {
    return this.service.handleWebhook(provider, payload);
  }
}
