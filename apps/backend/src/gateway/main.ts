import { ENV, bootstrapService } from '../common';

import { GatewayModule } from './gateway.module';

import type { GatewayEnv } from './gateway.env';

void bootstrapService({
  name: 'gateway',
  module: GatewayModule,
  defaultPort: 4000,
  proxy: true,
  configure: (app) => {
    const env = app.get<GatewayEnv>(ENV);
    // Brauzer klientlari (web, admin, seller) uchun. Mobil ilovalarga CORS kerak emas.
    app.enableCors({
      origin: env.CORS_ORIGINS.length ? env.CORS_ORIGINS : false,
      credentials: true,
      exposedHeaders: ['x-request-id', 'x-upstream', 'retry-after'],
    });
  },
});
