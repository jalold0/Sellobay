import { z } from 'zod';

import { baseEnvSchema, envBool, loadEnv } from './config';

describe('loadEnv', () => {
  const schema = baseEnvSchema.extend({ PORT: z.coerce.number().int(), FLAG: envBool(false) });

  it('to`g`ri muhitni o`qiydi va standart qiymatlarni qo`yadi', () => {
    const env = loadEnv(schema, { PORT: '4001' });
    expect(env).toMatchObject({
      NODE_ENV: 'development',
      LOG_LEVEL: 'log',
      PORT: 4001,
      FLAG: false,
    });
  });

  it('xato bo`lsa HAMMA muammoni sanab, jarayonni to`xtatadi', () => {
    let message = '';
    try {
      loadEnv(schema, { NODE_ENV: 'prod', INTERNAL_API_KEY: 'short' });
    } catch (e) {
      message = (e as Error).message;
    }
    // Tartibdan qat'i nazar, uchala muammo ham xabarda bo'lishi shart.
    for (const key of ['NODE_ENV', 'PORT', 'INTERNAL_API_KEY']) expect(message).toContain(key);
  });

  it('envBool: "false" matni TRUE bo`lib ketmaydi (z.coerce.boolean tuzog`i)', () => {
    expect(loadEnv(schema, { PORT: '1', FLAG: 'false' }).FLAG).toBe(false);
    expect(loadEnv(schema, { PORT: '1', FLAG: '0' }).FLAG).toBe(false);
    expect(loadEnv(schema, { PORT: '1', FLAG: 'true' }).FLAG).toBe(true);
    expect(loadEnv(schema, { PORT: '1', FLAG: '1' }).FLAG).toBe(true);
    expect(() => loadEnv(schema, { PORT: '1', FLAG: 'yes' })).toThrow(/FLAG/);
  });
});
