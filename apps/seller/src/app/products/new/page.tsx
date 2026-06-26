'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@ecom/ui';
import { ArrowLeft, Image as ImageIcon, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

interface CategoryItem {
  id: string;
  slug: string;
  name: { uz?: string; ru?: string; en?: string } | string;
}

interface BrandItem {
  id: string;
  slug: string;
  name: string;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export default function SellerNewProductPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [categories, setCategories] = React.useState<CategoryItem[]>([]);
  const [brands, setBrands] = React.useState<BrandItem[]>([]);

  const [form, setForm] = React.useState({
    nameUz: '',
    nameRu: '',
    descriptionUz: '',
    sku: '',
    barcode: '',
    basePrice: '',
    compareAtPrice: '',
    weightGrams: '',
    categorySlug: '',
    brandSlug: '',
  });
  // 4 ta rasm slot (0 = asosiy)
  const [images, setImages] = React.useState<string[]>(['', '', '', '']);

  const setImage = (idx: number, value: string) =>
    setImages((prev) => prev.map((v, i) => (i === idx ? value : v)));

  // Variantlar (ixtiyoriy)
  interface VariantRow {
    color: string;
    size: string;
    priceOverride: string;
  }
  const [variants, setVariants] = React.useState<VariantRow[]>([]);
  const addVariant = () => setVariants((p) => [...p, { color: '', size: '', priceOverride: '' }]);
  const removeVariant = (idx: number) => setVariants((p) => p.filter((_, i) => i !== idx));
  const setVariant = (idx: number, key: keyof VariantRow, value: string) =>
    setVariants((p) => p.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));

  React.useEffect(() => {
    // Sellobay web /api/categories va /api/brands sayt API'lari — seller panelda yo'q
    // shu sababli to'g'ridan-to'g'ri Sellobay web URL'iga so'rov yuboramiz (CORS muammosi bo'lishi mumkin)
    // Yoki localStorage cache + seller'da kichik proxy
    // Hozircha hardcode list (DB'da ham shu slug'lar):
    setCategories([
      { id: '1', slug: 'clothing', name: 'Kiyim-kechak' },
      { id: '2', slug: 'shoes', name: 'Poyabzal' },
      { id: '3', slug: 'perfume', name: 'Atirlar' },
      { id: '4', slug: 'cosmetics', name: 'Kosmetika' },
      { id: '5', slug: 'beauty', name: "Go'zallik" },
      { id: '6', slug: 'accessories', name: 'Aksessuarlar' },
    ]);
    setBrands([
      { id: '1', slug: 'nike', name: 'Nike' },
      { id: '2', slug: 'adidas', name: 'Adidas' },
      { id: '3', slug: 'zara', name: 'Zara' },
      { id: '4', slug: 'chanel', name: 'Chanel' },
      { id: '5', slug: 'dior', name: 'Dior' },
    ]);
  }, []);

  const set = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const validate = (): string | null => {
    if (!form.nameUz.trim()) return "O'zbekcha nom kerak";
    if (!form.sku.trim()) return 'SKU kerak';
    if (!form.basePrice || Number(form.basePrice) <= 0) return "Narx 0 dan katta bo'lishi kerak";
    if (!form.categorySlug) return 'Kategoriya tanlang';
    for (let i = 0; i < images.length; i++) {
      const u = images[i]?.trim();
      if (u && !/^https?:\/\//i.test(u)) {
        return `Rasm ${i + 1} URL'i http:// yoki https:// bilan boshlanishi kerak`;
      }
    }
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast({ title: err, variant: 'destructive' });
      return;
    }
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      nameUz: form.nameUz.trim(),
      sku: form.sku.trim(),
      basePrice: Number(form.basePrice),
      categorySlug: form.categorySlug,
    };
    if (form.nameRu.trim()) payload.nameRu = form.nameRu.trim();
    if (form.descriptionUz.trim()) payload.descriptionUz = form.descriptionUz.trim();
    if (form.barcode.trim()) payload.barcode = form.barcode.trim();
    if (form.compareAtPrice && Number(form.compareAtPrice) > 0)
      payload.compareAtPrice = Number(form.compareAtPrice);
    if (form.weightGrams && Number(form.weightGrams) > 0)
      payload.weightGrams = Number(form.weightGrams);
    if (form.brandSlug) payload.brandSlug = form.brandSlug;
    const filledImages = images.map((u) => u.trim()).filter(Boolean);
    if (filledImages.length > 0) payload.imageUrls = filledImages;
    // Variantlar (faqat bittasi bo'lsa ham yuboramiz, server color/size bo'sh bo'lganlarini skip qiladi)
    const filledVariants = variants
      .map((v) => ({
        color: v.color.trim() || undefined,
        size: v.size.trim() || undefined,
        priceOverride:
          v.priceOverride && Number(v.priceOverride) > 0 ? Number(v.priceOverride) : undefined,
      }))
      .filter((v) => v.color || v.size);
    if (filledVariants.length > 0) payload.variants = filledVariants;

    let result: ApiResult<{ product: { id: string; slug: string; status: string } }> = {
      success: false,
    };
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      result = (await res.json()) as typeof result;
    } catch {
      result = { success: false, error: { code: 'NETWORK', message: 'Tarmoq xatosi' } };
    }
    setSubmitting(false);

    if (!result.success || !result.data) {
      toast({
        title: result.error?.message ?? 'Mahsulot saqlanmadi',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Mahsulot yaratildi',
      description:
        result.data.product.status === 'ACTIVE'
          ? 'Web va mobile saytlarda ko`rinadi'
          : 'Tasdiqlangach saytda ko`rinadi',
      variant: 'success',
    });
    router.push('/products');
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PageHeader
        title="Yangi mahsulot"
        description="Mahsulot ma`lumotlarini to`ldiring va saqlang"
        actions={
          <>
            <Button asChild variant="outline" size="sm" type="button">
              <Link href="/products">
                <ArrowLeft className="mr-2 h-4 w-4" /> Bekor qilish
              </Link>
            </Button>
            <Button size="sm" type="submit" disabled={submitting}>
              <Save className="mr-2 h-4 w-4" />
              {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Asosiy ma`lumotlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="uz">
                <TabsList>
                  <TabsTrigger value="uz">O`zbek</TabsTrigger>
                  <TabsTrigger value="ru">Русский</TabsTrigger>
                </TabsList>
                <TabsContent value="uz" className="space-y-3">
                  <div>
                    <Label>Nomi (uz)*</Label>
                    <Input
                      value={form.nameUz}
                      onChange={(e) => set('nameUz', e.target.value)}
                      placeholder="Mahsulot nomi"
                    />
                  </div>
                  <div>
                    <Label>Tavsif</Label>
                    <Textarea
                      value={form.descriptionUz}
                      onChange={(e) => set('descriptionUz', e.target.value)}
                      rows={4}
                      placeholder="Mahsulot xususiyatlari, material, parvarish..."
                    />
                  </div>
                </TabsContent>
                <TabsContent value="ru" className="space-y-3">
                  <div>
                    <Label>Название</Label>
                    <Input
                      value={form.nameRu}
                      onChange={(e) => set('nameRu', e.target.value)}
                      placeholder="Название"
                    />
                  </div>
                </TabsContent>
              </Tabs>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>SKU*</Label>
                  <Input
                    value={form.sku}
                    onChange={(e) => set('sku', e.target.value)}
                    placeholder="SB-000001"
                  />
                </div>
                <div>
                  <Label>Barcode</Label>
                  <Input
                    value={form.barcode}
                    onChange={(e) => set('barcode', e.target.value)}
                    placeholder="EAN-13"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Narx va vazn</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Narx (UZS)*</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.basePrice}
                  onChange={(e) => set('basePrice', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Eski narx (chizilgan)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.compareAtPrice}
                  onChange={(e) => set('compareAtPrice', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Vazn (g)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.weightGrams}
                  onChange={(e) => set('weightGrams', e.target.value)}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rasmlar (4 tagacha)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-[11px]">
                Rasm URL'larini joylashtiring. Bo&apos;sh qoldirsangiz, placeholder ishlatiladi.
                Birinchi slot — <strong>asosiy rasm</strong>. To&apos;liq fayl yuklash
                (Cloudinary/S3) keyingi bosqichda.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((url, i) => (
                  <div
                    key={i}
                    className={`flex aspect-square flex-col gap-1.5 rounded-lg border-2 p-2 ${
                      url
                        ? 'border-primary/40 bg-primary/5'
                        : i === 0
                          ? 'border-primary/60 border-dashed'
                          : 'border-dashed'
                    }`}
                  >
                    {url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Rasm ${i + 1}`}
                          className="h-16 w-full flex-1 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.opacity = '0.3';
                          }}
                        />
                      </>
                    ) : (
                      <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center text-[10px]">
                        <ImageIcon className="h-5 w-5" />
                        {i === 0 ? 'Asosiy' : `Rasm ${i + 1}`}
                      </div>
                    )}
                    <Input
                      value={url}
                      onChange={(e) => setImage(i, e.target.value)}
                      placeholder="https://..."
                      className="h-7 text-[10px]"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tasniflash</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Kategoriya*</Label>
                <Select value={form.categorySlug} onValueChange={(v) => set('categorySlug', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {typeof c.name === 'string' ? c.name : (c.name.uz ?? c.name.ru ?? c.slug)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Brend</Label>
                <Select value={form.brandSlug} onValueChange={(v) => set('brandSlug', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tanlang (ixtiyoriy)" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.slug} value={b.slug}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Variantlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground text-[11px]">
                Rang/o&apos;lcham kombinatsiyalari. Bo&apos;sh qoldirsangiz, asosiy mahsulot yagona
                variant sifatida sotiladi.
              </p>
              {variants.map((v, i) => (
                <div key={i} className="space-y-2 rounded-md border p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={v.color}
                      onChange={(e) => setVariant(i, 'color', e.target.value)}
                      placeholder="Rang (Qora)"
                      className="h-8 text-xs"
                    />
                    <Input
                      value={v.size}
                      onChange={(e) => setVariant(i, 'size', e.target.value)}
                      placeholder="O`lcham (M)"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={v.priceOverride}
                      onChange={(e) => setVariant(i, 'priceOverride', e.target.value)}
                      placeholder="Narx (ixtiyoriy)"
                      className="h-8 flex-1 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeVariant(i)}
                      className="h-8 text-red-600 hover:bg-red-50"
                    >
                      O&apos;chirish
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVariant}
                className="w-full"
              >
                + Variant qo&apos;shish
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Holat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                Test rejimida mahsulot darhol <strong>ACTIVE</strong> sifatida yaratiladi va
                web/mobile saytlarda ko&apos;rinadi. Production&apos;da admin tasdiqlashi shart
                bo&apos;ladi.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
