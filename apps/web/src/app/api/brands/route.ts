// Sellobay — Brendlar API
// GET /api/brands — barcha aktiv brendlar
//
// So'rov `lib/catalog.ts` dagi `fetchBrands()` da — bosh sahifadagi brend
// paneli, katalog filtri va brend sahifasi ham aynan shu funksiyadan
// o'qiydi. Ilgari UI `mock-data.ts` dagi 8 ta qotib yozilgan brendni
// ko'rsatardi, bu route esa haqiqiy ro'yxatni qaytarardi.

import { withApi } from '@/lib/api-handler';

import { fetchBrands } from '../../../lib/catalog';

export const runtime = 'nodejs';
export const revalidate = 300;

// Javob endi `{ success, data: { items } }` konvertida — barcha
// route'lar bilan bir xil. Ilgari bu yo'l xom `{ items }` qaytarardi
// va klientda ALOHIDA metod (`getRaw`) kerak bo'lardi; noto'g'risini
// chaqirish muvaffaqiyatli javobni ham xato deb ko'rsatardi.
export const GET = withApi(async () => ({ items: await fetchBrands() }));
