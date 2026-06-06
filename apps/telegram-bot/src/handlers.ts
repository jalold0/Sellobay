import type { Bot } from 'grammy';

export function registerHandlers(bot: Bot) {
  bot.callbackQuery('orders', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('Sizning buyurtmalaringiz ro\'yxati tez orada bu yerda chiqadi.');
  });

  bot.callbackQuery('support', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('Yordam: support@example.uz yoki +998 71 000 00 00');
  });

  // Mini App'dan webApp.sendData() orqali kelgan ma'lumotlar:
  bot.on('message:web_app_data', async (ctx) => {
    const data = ctx.message.web_app_data.data;
    await ctx.reply(`Buyurtma qabul qilindi:\n${data}`);
  });
}
