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
  Switch,
  toast,
} from '@ecom/ui';
import { CornerDownRight, Eye, EyeOff, FolderTree, Pencil, Plus } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import {
  createCategory,
  listCategories,
  updateCategory,
  type AdminCategory,
} from '../../lib/auth/client';
import { formatNumber, pickLocalized } from '../../lib/format';

interface FormState {
  nameUz: string;
  nameRu: string;
  nameEn: string;
  slug: string;
  parentId: string;
  position: string;
  iconUrl: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  nameUz: '',
  nameRu: '',
  nameEn: '',
  slug: '',
  parentId: '',
  position: '0',
  iconUrl: '',
  isActive: true,
};

function localizedField(name: unknown, key: 'uz' | 'ru' | 'en'): string {
  if (name && typeof name === 'object' && key in name) {
    const v = (name as Record<string, unknown>)[key];
    return typeof v === 'string' ? v : '';
  }
  return '';
}

/** Bo'limlar va ularning ichidagi turlar, tartib bo'yicha. */
function asTree(items: AdminCategory[]): { node: AdminCategory; depth: number }[] {
  const byParent = new Map<string | null, AdminCategory[]>();
  const ids = new Set(items.map((c) => c.id));
  for (const c of items) {
    const key = c.parentId && ids.has(c.parentId) ? c.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }
  const out: { node: AdminCategory; depth: number }[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const c of byParent.get(parent) ?? []) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ node: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = React.useState<AdminCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState<AdminCategory | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

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

  const tree = React.useMemo(() => asTree(categories), [categories]);

  // Bo'lim sifatida faqat yuqori darajadagilar tanlanadi (do'kon ikki
  // darajali). Tahrirlanayotgan kategoriyaning o'zi ro'yxatda bo'lmaydi.
  const departments = categories.filter((c) => c.parentId === null && c.id !== editing?.id);

  const startEdit = (c: AdminCategory) => {
    setEditing(c);
    setForm({
      nameUz: localizedField(c.name, 'uz'),
      nameRu: localizedField(c.name, 'ru'),
      nameEn: localizedField(c.name, 'en'),
      slug: c.slug,
      parentId: c.parentId ?? '',
      position: String(c.position),
      iconUrl: c.iconUrl ?? '',
      isActive: c.isActive,
    });
  };

  const reset = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || form.nameUz.trim().length < 2) return;
    setSaving(true);
    const payload = {
      name: {
        uz: form.nameUz.trim(),
        ru: form.nameRu.trim() || undefined,
        en: form.nameEn.trim() || undefined,
      },
      parentId: form.parentId || null,
      position: Number.parseInt(form.position, 10) || 0,
      iconUrl: form.iconUrl.trim() || null,
      isActive: form.isActive,
    };
    const res = editing
      ? await updateCategory(editing.id, payload)
      : await createCategory({ ...payload, slug: form.slug.trim() || undefined });
    setSaving(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Kategoriya saqlandi' : 'Kategoriya qo`shildi', variant: 'success' });
    reset();
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Kategoriyalar"
        description="Bo`limlar (Ayollar, Erkaklar...) va ularning ichidagi turlar. Do`kon va ilova o`zgarishni 2 daqiqa ichida ko`radi."
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
                {tree.map(({ node: c, depth }) => (
                  <li
                    key={c.id}
                    className={`flex items-center gap-3 py-3 pr-4 ${
                      editing?.id === c.id ? 'bg-muted/60' : 'hover:bg-muted/40'
                    }`}
                    style={{ paddingLeft: `${1.5 + depth * 1.75}rem` }}
                  >
                    {depth > 0 ? (
                      <CornerDownRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    ) : null}
                    {c.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.iconUrl}
                        alt=""
                        className="bg-muted h-8 w-8 shrink-0 rounded-md object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={depth === 0 ? 'font-semibold' : 'font-medium'}>
                          {pickLocalized(c.name)}
                        </span>
                        {c.isActive ? (
                          <StatusBadge tone="success" dot={false}>
                            <Eye className="h-3 w-3" />
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="muted" dot={false}>
                            <EyeOff className="h-3 w-3" />
                          </StatusBadge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        /{c.slug} · tartib {c.position}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <span className="font-medium">{formatNumber(c.productsCount)}</span>
                      <span className="text-muted-foreground ml-1 text-xs">mahsulot</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(c)}
                      aria-label={`${pickLocalized(c.name)} — tahrirlash`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>
              {editing ? `Tahrirlash: ${pickLocalized(editing.name)}` : 'Yangi kategoriya'}
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              {editing
                ? 'Slug o`zgarmaydi — u havolalarda ishlatiladi.'
                : 'Bo`lim tanlansa — shu bo`limning ichki turi bo`ladi.'}
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit}>
              <div>
                <Label htmlFor="cat-uz">Nomi (uz)</Label>
                <Input
                  id="cat-uz"
                  value={form.nameUz}
                  onChange={(e) => set('nameUz', e.target.value)}
                  placeholder="Masalan: Kiyim"
                  autoComplete="off"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="cat-ru">Nomi (ru)</Label>
                  <Input
                    id="cat-ru"
                    value={form.nameRu}
                    onChange={(e) => set('nameRu', e.target.value)}
                    placeholder="Одежда"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="cat-en">Nomi (en)</Label>
                  <Input
                    id="cat-en"
                    value={form.nameEn}
                    onChange={(e) => set('nameEn', e.target.value)}
                    placeholder="Clothing"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cat-parent">Bo`lim</Label>
                <select
                  id="cat-parent"
                  value={form.parentId}
                  onChange={(e) => set('parentId', e.target.value)}
                  className="border-input bg-background mt-1 h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="">— yo`q, o`zi bo`lim —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {pickLocalized(d.name)}
                    </option>
                  ))}
                </select>
              </div>
              {editing ? null : (
                <div>
                  <Label htmlFor="cat-slug">Slug (ixtiyoriy)</Label>
                  <Input
                    id="cat-slug"
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value)}
                    placeholder="ayollar-kiyim"
                    autoComplete="off"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Bo`sh qoldirilsa o`zbekcha nomdan hosil qilinadi. Butun do`kon bo`yicha
                    takrorlanmasligi kerak: «kiyim» emas, «ayollar-kiyim».
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="cat-pos">Tartib</Label>
                  <Input
                    id="cat-pos"
                    type="number"
                    min={0}
                    max={9999}
                    value={form.position}
                    onChange={(e) => set('position', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="cat-icon">Ikonka manzili</Label>
                  <Input
                    id="cat-icon"
                    value={form.iconUrl}
                    onChange={(e) => set('iconUrl', e.target.value)}
                    placeholder="https://..."
                    autoComplete="off"
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Kichik raqam oldinda turadi. Ikonka bo`lmasa ilova o`z belgisini chizadi.
              </p>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="cat-active" className="cursor-pointer">
                  Do`konda ko`rinadi
                </Label>
                <Switch
                  id="cat-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => set('isActive', v)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={saving || form.nameUz.trim().length < 2}
                >
                  {editing ? null : <Plus className="mr-2 h-4 w-4" />}
                  {saving ? 'Saqlanmoqda...' : editing ? 'Saqlash' : 'Qo`shish'}
                </Button>
                {editing ? (
                  <Button type="button" variant="outline" onClick={reset}>
                    Bekor qilish
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
