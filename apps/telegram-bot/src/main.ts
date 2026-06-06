import 'dotenv/config';
import { Bot } from 'grammy';
import pino from 'pino';

import { registerCommands } from './commands';
import { registerHandlers } from './handlers';

const logger = pino({ name: 'telegram-bot' });

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

  const bot = new Bot(token);
  registerCommands(bot);
  registerHandlers(bot);

  bot.catch((err) => logger.error({ err }, 'bot error'));

  logger.info('Telegram bot starting (long polling)...');
  await bot.start({
    onStart: (botInfo) => logger.info(`@${botInfo.username} ishga tushdi`),
  });
}

main().catch((err) => {
  logger.error({ err }, 'fatal');
  process.exit(1);
});
