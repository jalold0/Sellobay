// Zod'ni OpenAPI bilan kengaytiradi.
//
// `.openapi({ example, description })` chaqiruvi `@asteasolutions/
// zod-to-openapi` qo'shadigan metod. U GLOBAL prototipga yoziladi,
// shuning uchun bir marta va ENG BIRINCHI bajarilishi kerak — aks
// holda undan oldin yuklangan sxema faylida metod topilmaydi.
//
// Shuning uchun barcha sxema fayllari `z` ni shu yerdan oladi,
// to'g'ridan-to'g'ri `zod` dan emas: import tartibi shu bilan
// kafolatlanadi.
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export { z };
