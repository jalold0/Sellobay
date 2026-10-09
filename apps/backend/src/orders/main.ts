import { bootstrapService } from '../common';

import { OrdersModule } from './orders.module';

void bootstrapService({ name: 'orders', module: OrdersModule, defaultPort: 4003 });
