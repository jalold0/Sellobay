import { prisma } from '@ecom/database';

import { createFcmClient, parseServiceAccount } from './fcm';
import { createPushService } from './service';

import type { PushDb, PushService } from './service';

export { createFcmClient, parseServiceAccount } from './fcm';
export type { FcmClient, PushMessage, SendResult, ServiceAccount } from './fcm';
export { buildOrderStatusMessage, createPushService, NOTIFIABLE_ORDER_STATUSES } from './service';
export type { PushDb, PushService } from './service';

let instance: PushService | undefined;

/**
 * Jarayon bo'yicha bitta nusxa. `FIREBASE_SERVICE_ACCOUNT` sozlanmagan bo'lsa
 * (lokal, preview) hamma chaqiruv jimgina hech narsa qilmaydi.
 */
export function getPushService(): PushService {
  if (!instance) {
    const account = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
    instance = createPushService(
      prisma as unknown as PushDb,
      account ? createFcmClient(account) : null,
    );
  }
  return instance;
}
