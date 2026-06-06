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
import { ArrowLeft, ImagePlus, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

export default function SellerNewProductPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    toast({
      title: 'Mahsulot tekshiruvga yuborildi',
      description: 'Tasdiqlangach saytda ko`rinadi.',
      variant: 'success',
    });
    router.push('/products');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PageHeader
        title="Yangi mahsulot"
        description="Mahsulot ma`lumotlarini to`ldiring — Admin tekshirgandan keyin saytda ko`rinadi."
        actions={
          <>
            <Button asChild variant="outline" size="sm" type="button">
              <Link href="/products">
                <ArrowLeft className="mr-2 h-4 w-4" /> Bekor qilish
              </Link>
            </Button>
            <Button size="sm" type="submit" disabled={submitting}>
              <Save className="mr-2 h-4 w-4" />
              {submitting ? 'Yuborilmoqda...' : 'Tekshiruvga yuborish'}
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
                    <Input placeholder="Mahsulot nomi" />
                  </div>
                  <div>
                    <Label>Tavsif</Label>
                    <Textarea rows={4} placeholder="Mahsulot xususiyatlari, material, parvarish..." />
                  </div>
                </TabsContent>
                <TabsContent value="ru" className="space-y-3">
                  <div>
                    <Label>Название</Label>
                    <Input placeholder="Название" />
                  </div>
                </TabsContent>
              </Tabs>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>SKU*</Label>
                  <Input placeholder="SK-000000" />
                </div>
                <div>
                  <Label>Barcode</Label>
                  <Input placeholder="EAN-13" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Narx va stok</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Narx (UZS)*</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <Label>Stok*</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <Label>Vazn (g)</Label>
                <Input type="number" placeholder="0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rasmlar</CardTitle>
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
                    {i === 0 ? 'Asosiy' : `Rasm ${i + 1}`}
                  </button>
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
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clothing">Kiyim-kechak</SelectItem>
                    <SelectItem value="shoes">Poyabzal</SelectItem>
                    <SelectItem value="perfume">Atirlar</SelectItem>
                    <SelectItem value="cosmetics">Kosmetika</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Brend</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nike">Nike</SelectItem>
                    <SelectItem value="adidas">Adidas</SelectItem>
                    <SelectItem value="zara">Zara</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Holat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Variantlar bor</div>
                  <div className="text-xs text-muted-foreground">Rang/o`lcham</div>
                </div>
                <Switch />
              </div>
              <div className="rounded-md border bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                Yangi mahsulot avtomatik <strong>Tekshiruvga</strong> yuboriladi. Admin tasdiqlagach faollashadi.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
