import type { Bot } from 'grammy';

export function registerCommands(bot: Bot) {
  bot.api.setMyCommands([
    { command: 'start', description: 'Botni ishga tushirish' },
    { command: 'shop', description: "Do'konga o'tish (Mini App)" },
    { command: 'orders', description: 'Buyurtmalarim' },
    { command: 'help', description: "Yordam va qo'llab-quvvatlash" },
  ]);

  bot.command('start', async (ctx) => {
    const webAppUrl = process.env.TELEGRAM_WEBAPP_URL ?? '';
    await ctx.reply("Assalomu alaykum! E-Commerce botimizga xush kelibsiz.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Do'konni ochish", web_app: { url: webAppUrl } }],
          [{ text: "Buyurtmalarim", callback_data: 'orders' }],
          [{ text: "Qo'llab-quvvatlash", callback_data: 'support' }],
        ],
      },
    });
  });

  bot.command('shop', async (ctx) => {
    const url = process.env.TELEGRAM_WEBAPP_URL ?? '';
    await ctx.reply("Do'konni ochish:", {
      reply_markup: { inline_keyboard: [[{ text: 'Ochish', web_app: { url } }]] },
    });
  });

  bot.command('orders', async (ctx) => {
    await ctx.reply('Buyurtmalaringiz ro\'yxati tez orada qo\'shiladi.');
  });

  bot.command('help', async (ctx) => {
    await ctx.reply('Yordam markaziga +998 71 000 00 00 raqamiga qo\'ng\'iroq qiling.');
  });
}
