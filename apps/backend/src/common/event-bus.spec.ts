import { processDelivery } from './event-bus';

import type { ConsumeMessage } from 'amqplib';

function message(content: string, routingKey = 'order.created', messageId = 'm1'): ConsumeMessage {
  return {
    content: Buffer.from(content),
    fields: { routingKey },
    properties: { messageId },
  } as unknown as ConsumeMessage;
}

describe('processDelivery', () => {
  const setup = () => ({
    channel: { ack: jest.fn(), nack: jest.fn() },
    logger: { error: jest.fn() },
  });

  it('muvaffaqiyatli qayta ishlansa ack, handler nom/payload/messageId oladi', async () => {
    const { channel, logger } = setup();
    const handler = jest.fn().mockResolvedValue(undefined);
    const msg = message('{"orderId":"o1"}');

    await processDelivery(channel, msg, handler, logger);

    expect(handler).toHaveBeenCalledWith('order.created', { orderId: 'o1' }, 'm1');
    expect(channel.ack).toHaveBeenCalledWith(msg);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('handler yiqilsa nack(requeue=false) — dead-letter, cheksiz qayta urinish yo`q', async () => {
    const { channel, logger } = setup();
    const msg = message('{}');

    await processDelivery(channel, msg, () => Promise.reject(new Error('baza yo`q')), logger);

    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    expect(channel.ack).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('baza yo`q'));
  });

  it('yaroqsiz JSON — handler chaqirilmaydi, dead-letter', async () => {
    const { channel, logger } = setup();
    const handler = jest.fn();
    const msg = message('{buzuq');

    await processDelivery(channel, msg, handler, logger);

    expect(handler).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
  });

  it('maxfiy hodisa mazmuni (OTP kodi) logga tushmaydi', async () => {
    const { channel, logger } = setup();
    const msg = message('{"phone":"+998901234567","code":"482913"}', 'otp.requested');

    await processDelivery(
      channel,
      msg,
      () => Promise.reject(new Error('SMS provayder 500')),
      logger,
    );

    const logged = JSON.stringify(logger.error.mock.calls);
    expect(logged).not.toContain('482913');
    expect(logged).not.toContain('+998901234567');
    expect(logged).toContain('otp.requested');
  });
});
