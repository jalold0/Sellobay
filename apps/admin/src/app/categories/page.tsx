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
  StatusBadge,
  toast,
} from '@ecom/ui';
import { Eye, EyeOff, FolderTree, Plus } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { createCategory, listCategories, type AdminCategory } from '../../lib/auth/client';
import { formatNumber, pickLocalized } from '../../lib/format';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = React.useState<AdminCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [nameUz, setNameUz] = React.useState('');
  const [nameRu, setNameRu] = React.useState('');
  const [slug, setSlug] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listCategories();
    if (res.success) setCategories(res.data.items);
    else toast({ title: res.error.message, variant: 'destructive' });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async () => {
    if (saving || nameUz.trim().length < 2) return;
    setSaving(true);
    const res = await createCategory({
      name: { uz: nameUz.trim(), ru: nameRu.trim() || undefined },
      slug: slug.trim() || undefined,
    });
    setSaving(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Kategoriya qo`shildi', variant: 'success' });
    setNameUz('');
    setNameRu('');
    setSlug('');
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Kategoriyalar"
        description="Mahsulot daraxti va ko`p tilli nomlar"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <FolderTree className="text-muted-foreground h-4 w-4" />
            <CardTitle>Daraxt</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-muted-foreground p-10 text-center text-sm">Yuklanmoqda...</div>
            ) : categories.length === 0 ? (
              <div className="text-muted-foreground p-10 text-center text-sm">
                Hozircha kategoriya yo`q. O`ngdagi forma bilan qo`shing.
              </div>
            ) : (
              <ul className="divide-y">
                {categories.map((c) => (
                  <li key={c.id} className="hover:bg-muted/40 flex items-center gap-3 px-6 py-3">
                    {/*
                      Ilgari bu yerda drag-drop dastagi va "Tahrirlash" tugmasi
                      bor edi, lekin ikkalasi ham handler'siz — tartiblash va
                      tahrirlash API'si yozilgunicha ular olib tashlandi.
                      Ichki kategoriyalar ota-kategoriya nomi bilan ko'rsatiladi.
                    */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pickLocalized(c.name)}</span>
                        {c.isActive ? (
                          <StatusBadge tone="success" dot={false}>
                            <Eye className="h-3 w-3" />
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="muted" dot={false}>
                            <EyeOff className="h-3 w-3" />
                          </StatusBadge>
                        )}
                        {c.parentId ? (
                          <StatusBadge tone="muted" dot={false}>
                            ichki
                          </StatusBadge>
                        ) : null}
                      </div>
                      <div className="text-muted-foreground text-xs">/{c.slug}</div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{formatNumber(c.productsCount)}</span>
                      <span className="text-muted-foreground ml-1 text-xs">mahsulot</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yangi kategoriya</CardTitle>
            <p className="text-muted-foreground text-xs">Tezkor qo`shish</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="cat-uz">Nomi (uz)</Label>
              <Input
                id="cat-uz"
                value={nameUz}
                onChange={(e) => setNameUz(e.target.value)}
                placeholder="Masalan: Erkaklar kiyimi"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="cat-ru">Nomi (ru)</Label>
              <Input
                id="cat-ru"
                value={nameRu}
                onChange={(e) => setNameRu(e.target.value)}
                placeholder="Мужская одежда"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="cat-slug">Slug (ixtiyoriy)</Label>
              <Input
                id="cat-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="erkaklar-kiyimi"
                autoComplete="off"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Bo`sh qoldirilsa o`zbekcha nomdan hosil qilinadi.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={onCreate}
              disabled={saving || nameUz.trim().length < 2}
            >
              <Plus className="mr-2 h-4 w-4" />
              {saving ? 'Saqlanmoqda...' : 'Qo`shish'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
