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
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@ecom/ui';
import { slugify } from '@ecom/utils';
import { ArrowLeft, ImagePlus, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Breadcrumbs } from '../../../components/layout/breadcrumbs';
import { mockBrands, mockCategories } from '../../../lib/mock';

interface FormState {
  nameUz: string;
  nameRu: string;
  nameEn: string;
  descriptionUz: string;
  sku: string;
  slug: string;
  brandId: string;
  categoryId: string;
  basePrice: string;
  compareAtPrice: string;
  weight: string;
  taxRate: string;
  isFeatured: boolean;
  status: 'DRAFT' | 'ACTIVE' | 'PENDING_REVIEW';
}

const initialForm: FormState = {
  nameUz: '',
  nameRu: '',
  nameEn: '',
  descriptionUz: '',
  sku: '',
  slug: '',
  brandId: '',
  categoryId: '',
  basePrice: '',
  compareAtPrice: '',
  weight: '',
  taxRate: '0',
  isFeatured: false,
  status: 'DRAFT',
};

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [submitting, setSubmitting] = React.useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  // Slug avtomatik (foydalanuvchi qo`lda o`zgartirsa, override qiladi)
  const slugManuallyEdited = React.useRef(false);
  React.useEffect(() => {
    if (!slugManuallyEdited.current && form.nameUz) {
      setForm((s) => ({ ...s, slug: slugify(form.nameUz) }));
    }
  }, [form.nameUz]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameUz || !form.sku || !form.basePrice || !form.categoryId) {
      toast({
        title: 'Majburiy maydonlar to`ldirilmagan',
        description: 'Nomi (uz), SKU, narx va kategoriya kerak',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    // Real holatda: apiClient.post('/products', { ... })
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    toast({
      title: 'Mahsulot saqlandi',
      description: 'Qoralama saqlandi, faollashtirish uchun statusni o`zgartiring',
      variant: 'success',
    });
    router.push('/products');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs overrides={{ '/products/new': 'Yangi mahsulot' }} />
        }
        title="Yangi mahsulot"
        description="Mahsulot kartochkasini to`ldiring. Ko`p tilli matnlarni alohida tablardan kiriting."
        actions={
          <>
            <Button asChild variant="outline" size="sm" type="button">
              <Link href="/products">
                <ArrowLeft className="mr-2 h-4 w-4" /> Bekor qilish
              </Link>
            </Button>
            <Button size="sm" type="submit" disabled={submitting}>
              <Save className="mr-2 h-4 w-4" /> {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
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
                  <TabsTrigger value="en">English</TabsTrigger>
                </TabsList>
                <TabsContent value="uz" className="space-y-3">
                  <div>
                    <Label>Nomi (uz)*</Label>
                    <Input
                      value={form.nameUz}
                      onChange={(e) => update('nameUz', e.target.value)}
                      placeholder="Mahsulot nomi"
                    />
                  </div>
                  <div>
                    <Label>Tavsif (uz)</Label>
                    <Textarea
                      value={form.descriptionUz}
                      onChange={(e) => update('descriptionUz', e.target.value)}
                      placeholder="Mahsulot haqida batafsil"
                      rows={5}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="ru" className="space-y-3">
                  <div>
                    <Label>Название (ru)</Label>
                    <Input
                      value={form.nameRu}
                      onChange={(e) => update('nameRu', e.target.value)}
                      placeholder="Название товара"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="en" className="space-y-3">
                  <div>
                    <Label>Name (en)</Label>
                    <Input
                      value={form.nameEn}
                      onChange={(e) => update('nameEn', e.target.value)}
                      placeholder="Product name"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>SKU*</Label>
                  <Input
                    value={form.sku}
                    onChange={(e) => update('sku', e.target.value.toUpperCase())}
                    placeholder="SKU-000001"
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => {
                      slugManuallyEdited.current = true;
                      update('slug', slugify(e.target.value));
                    }}
                    placeholder="slug-avtomatik"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Narxlar</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Bazaviy narx (UZS)*</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.basePrice}
                  onChange={(e) => update('basePrice', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Eski narx</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.compareAtPrice}
                  onChange={(e) => update('compareAtPrice', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Soliq stavkasi (%)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.taxRate}
                  onChange={(e) => update('taxRate', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4" /> Rasmlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                  >
                    <ImagePlus className="h-5 w-5" />
                    {i === 0 ? 'Asosiy rasm' : `Rasm ${i + 1}`}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                PNG, JPG yoki WEBP. Har bir rasm 5 MB gacha.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tasniflash</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Kategoriya*</Label>
                <Select value={form.categoryId} onValueChange={(v) => update('categoryId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name.uz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Brend</Label>
                <Select value={form.brandId} onValueChange={(v) => update('brandId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockBrands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vazn (gramm)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.weight}
                  onChange={(e) => update('weight', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Holat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => update('status', v as FormState['status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Qoralama</SelectItem>
                    <SelectItem value="PENDING_REVIEW">Tekshiruvga yuborish</SelectItem>
                    <SelectItem value="ACTIVE">Darhol faollashtirish</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Faollashtirilgan mahsulot mijoz saytida ko`rinadi.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Tanlangan mahsulot</div>
                  <div className="text-xs text-muted-foreground">Bosh sahifada chiqaring</div>
                </div>
                <Switch
                  checked={form.isFeatured}
                  onCheckedChange={(v) => update('isFeatured', v)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
