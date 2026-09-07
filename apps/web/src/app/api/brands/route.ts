// Sellobay — Brendlar API
// GET /api/brands — barcha aktiv brendlar
//
// So'rov `lib/catalog.ts` dagi `fetchBrands()` da — bosh sahifadagi brend
// paneli, katalog filtri va brend sahifasi ham aynan shu funksiyadan
// o'qiydi. Ilgari UI `mock-data.ts` dagi 8 ta qotib yozilgan brendni
// ko'rsatardi, bu route esa haqiqiy ro'yxatni qaytarardi.

import { NextResponse } from 'next/server';

import { fetchBrands } from '../../../lib/catalog';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET() {
  const items = await fetchBrands();
  return NextResponse.json({ items });
}
