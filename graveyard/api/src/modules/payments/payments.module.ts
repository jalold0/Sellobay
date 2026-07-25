import { Module } from '@nestjs/common';

import { ClickProvider } from './providers/click.provider';
import { PaymeProvider } from './providers/payme.provider';
import { UzumBankProvider } from './providers/uzum-bank.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, ClickProvider, PaymeProvider, UzumBankProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
