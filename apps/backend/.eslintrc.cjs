// Servislar bir-birining ichki kodini import qila olmaydi (ADR 0012): ular faqat
// `src/common` va tarmoq (HTTP / RabbitMQ hodisalari) orqali gaplashadi.
const servicesImportingEachOther = (self) =>
  ['gateway', 'auth', 'catalog', 'orders']
    .filter((s) => s !== self)
    .map((s) => ({
      group: [`**/${s}`, `**/${s}/*`],
      message: `${self} servisi ${s} servisining kodini import qila olmaydi — HTTP yoki RabbitMQ hodisasi orqali gaplashing.`,
    }));

module.exports = {
  root: true,
  extends: ['@ecom/eslint-config/node.js'],
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    // NestJS dependency injection constructor tipidan foydalanadi (emitDecoratorMetadata):
    // `import type` sinfni o'chirib tashlaydi va DI JIM buziladi (`Object` bo'lib qoladi).
    '@typescript-eslint/consistent-type-imports': 'off',
  },
  overrides: ['gateway', 'auth', 'catalog', 'orders'].map((service) => ({
    files: [`src/${service}/**/*.ts`],
    rules: {
      'no-restricted-imports': ['error', { patterns: servicesImportingEachOther(service) }],
    },
  })),
};
