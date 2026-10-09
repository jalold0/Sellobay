import { randomUUID } from 'node:crypto';

import {
  type DynamicModule,
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { type AmqpConnectionManager, type ChannelWrapper, connect } from 'amqp-connection-manager';
import { z } from 'zod';

import { ENV } from './config';
import {
  type DomainEventName,
  type DomainEvents,
  EVENTS_DEAD_LETTER_EXCHANGE,
  EVENTS_EXCHANGE,
  SENSITIVE_EVENT_TTL_MS,
} from './events';

import type { Channel, ConsumeMessage } from 'amqplib';

export const rabbitEnvSchema = z.object({ RABBITMQ_URL: z.string().url() });
export type RabbitEnv = z.infer<typeof rabbitEnvSchema>;

export type EventHandler = (
  event: DomainEventName,
  payload: unknown,
  messageId: string,
) => Promise<void>;

/**
 * Bitta xabarni qayta ishlaydi: muvaffaqiyatda `ack`, xatoda `nack` (qayta navbatga QO'YMASDAN):
 * xabar `.dlq` navbatiga tushadi va u yerda ko'zdan kechiriladi. Cheksiz qayta urinish
 * zaharli xabar butun navbatni to'xtatib qo'yishiga olib keladi.
 *
 * Eksport qilingan: sof mantiq, RabbitMQ'siz testlanadi.
 */
export async function processDelivery(
  channel: Pick<Channel, 'ack' | 'nack'>,
  msg: ConsumeMessage,
  handler: EventHandler,
  logger: Pick<Logger, 'error'>,
): Promise<void> {
  const event = msg.fields.routingKey as DomainEventName;
  const messageId = String(msg.properties.messageId ?? '');
  let payload: unknown;
  try {
    payload = JSON.parse(msg.content.toString('utf8'));
  } catch {
    // Yaroqsiz JSON hech qachon tuzalmaydi — qayta urinishning foydasi yo'q.
    logger.error(`${event} (${messageId}): JSON o'qilmadi, dead-letter`);
    channel.nack(msg, false, false);
    return;
  }

  try {
    await handler(event, payload, messageId);
    channel.ack(msg);
  } catch (e) {
    // Maxfiy hodisa mazmuni (OTP kodi) logga CHIQMAYDI — faqat nomi va xato.
    logger.error(
      `${event} (${messageId}) bajarilmadi: ${e instanceof Error ? e.message : String(e)}`,
    );
    channel.nack(msg, false, false);
  }
}

/**
 * Hodisa shinasi (RabbitMQ, topic exchange).
 *
 * - `publish` — xabar `persistent`, `messageId` bilan (iste'molchi shu bo'yicha idempotent bo'ladi);
 * - `subscribe` — `durable` navbat + dead-letter navbat, `prefetch` 10.
 *
 * Ulanish uzilsa `amqp-connection-manager` o'zi qayta ulanadi va yuborilmaganlarni navbatga oladi.
 *
 * DIQQAT (orders bosqichida hal qilinadi): baza yozuvi va hodisa yuborish bitta
 * tranzaksiyada EMAS. Buyurtma uchun «transactional outbox» kerak bo'ladi.
 */
@Injectable()
export class EventBus implements OnApplicationShutdown {
  private readonly logger = new Logger(EventBus.name);
  private readonly connection: AmqpConnectionManager;
  private readonly channel: ChannelWrapper;

  constructor(@Inject(ENV) env: RabbitEnv) {
    this.connection = connect([env.RABBITMQ_URL]);
    this.connection.on('connectFailed', ({ err }) =>
      this.logger.warn(`RabbitMQ'ga ulanib bo'lmadi: ${err.message}`),
    );
    this.channel = this.connection.createChannel({
      json: true,
      setup: async (ch: Channel) => {
        await ch.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
        await ch.assertExchange(EVENTS_DEAD_LETTER_EXCHANGE, 'direct', { durable: true });
      },
    });
  }

  get isConnected(): boolean {
    return this.connection.isConnected();
  }

  async publish<K extends DomainEventName>(
    event: K,
    payload: DomainEvents[K],
    opts: { messageId?: string; sensitive?: boolean } = {},
  ): Promise<void> {
    await this.channel.publish(EVENTS_EXCHANGE, event, payload, {
      persistent: true,
      messageId: opts.messageId ?? randomUUID(),
      timestamp: Date.now(),
      contentType: 'application/json',
      ...(opts.sensitive ? { expiration: String(SENSITIVE_EVENT_TTL_MS) } : {}),
    });
  }

  /** `queue` ga `events` hodisalarini bog'laydi va `handler` bilan iste'mol qiladi. */
  async subscribe(queue: string, events: DomainEventName[], handler: EventHandler): Promise<void> {
    await this.channel.addSetup(async (ch: Channel) => {
      await ch.assertQueue(`${queue}.dlq`, { durable: true });
      await ch.bindQueue(`${queue}.dlq`, EVENTS_DEAD_LETTER_EXCHANGE, queue);
      await ch.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': EVENTS_DEAD_LETTER_EXCHANGE,
          'x-dead-letter-routing-key': queue,
        },
      });
      for (const event of events) await ch.bindQueue(queue, EVENTS_EXCHANGE, event);
      await ch.prefetch(10);
      await ch.consume(queue, (msg) => {
        if (msg) void processDelivery(ch, msg, handler, this.logger);
      });
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.channel.close().catch(() => undefined);
    await this.connection.close().catch(() => undefined);
  }
}

@Global()
@Module({})
export class EventBusModule {
  static forRoot(): DynamicModule {
    return { module: EventBusModule, providers: [EventBus], exports: [EventBus] };
  }
}
