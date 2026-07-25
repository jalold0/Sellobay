// Chek rasmini brauzerda kichraytirib JPEG data-URL qaytaradi (DB'da base64 saqlanadi).
// checkout-flow.tsx'dan ajratilgan sof util (xatti-harakat o'zgarmagan).

export async function downscaleToDataUrl(
  file: File,
  maxDim = 1400,
  quality = 0.82,
): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(new Error('read'));
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const im = new window.Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('img'));
    im.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}
