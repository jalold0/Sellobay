// Sellobay — Kategoriyalar API
// GET /api/categories — barcha aktiv top-level kategoriyalar + mahsulotning
// haqiqiy soni.
//
// So'rov `lib/catalog.ts` dagi `fetchTopCategories()` da — bosh sahifadagi
// kategoriya to'ri ham aynan shu funksiyadan o'qiydi. Ilgari to'r
// `mock-data.ts` dagi qotib yozilgan sonlarni ko'rsatardi, bu route esa
// haqiqiy sonni qaytarardi — ikki manba bir-biriga zid edi.

import { NextResponse } from 'next/server';

import { fetchTopCategories } from '../../../lib/catalog';

export const runtime = 'nodejs';
export const revalidate = 300; // 5 daq cache

export async function GET() {
  const items = await fetchTopCategories();
  return NextResponse.json({ items });
}
