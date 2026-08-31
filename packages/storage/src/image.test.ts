import { describe, expect, it } from 'vitest';

import { MAX_RECEIPT_BYTES, checkImageBytes, sniffImageKind } from './image.ts';

/** Berilgan sarlavha bilan boshlanadigan `size` baytli fayl yasaydi. */
function fileWith(header: number[], size = 64): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set(header, 0);
  return bytes;
}

const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// "RIFF" + 4 bayt hajm + "WEBP"
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];

describe('sniffImageKind', () => {
  it('JPEG, PNG va WEBP ni taniydi', () => {
    expect(sniffImageKind(fileWith(JPEG))).toBe('jpeg');
    expect(sniffImageKind(fileWith(PNG))).toBe('png');
    expect(sniffImageKind(fileWith(WEBP))).toBe('webp');
  });

  it('SVG ni rasm deb hisoblamaydi — ichida skript bo`lishi mumkin', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
    expect(sniffImageKind(svg)).toBeNull();
  });

  it('HTML faylni rad etadi', () => {
    const html = new TextEncoder().encode('<!doctype html><script>alert(1)</script>');
    expect(sniffImageKind(html)).toBeNull();
  });

  it('RIFF bilan boshlanadigan, lekin WEBP bo`lmagan faylni rad etadi (masalan WAV)', () => {
    // "RIFF" + hajm + "WAVE"
    const wav = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45];
    expect(sniffImageKind(fileWith(wav))).toBeNull();
  });

  it('sarlavhadan qisqa faylda xato bermaydi', () => {
    expect(sniffImageKind(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(sniffImageKind(new Uint8Array())).toBeNull();
  });
});

describe('checkImageBytes', () => {
  it('haqiqiy turdan kengaytma va Content-Type oladi', () => {
    const res = checkImageBytes(fileWith(PNG), MAX_RECEIPT_BYTES);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.image.ext).toBe('png');
      expect(res.image.contentType).toBe('image/png');
    }
  });

  it('bo`sh faylni rad etadi', () => {
    expect(checkImageBytes(new Uint8Array(), MAX_RECEIPT_BYTES).ok).toBe(false);
  });

  it('limitdan katta faylni rad etadi', () => {
    const big = fileWith(JPEG, MAX_RECEIPT_BYTES + 1);
    const res = checkImageBytes(big, MAX_RECEIPT_BYTES);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('katta');
  });

  it('limitning aynan o`zi bo`lgan faylni qabul qiladi', () => {
    expect(checkImageBytes(fileWith(JPEG, MAX_RECEIPT_BYTES), MAX_RECEIPT_BYTES).ok).toBe(true);
  });
});
