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
} from '@ecom/ui';
import { Edit3, Eye, EyeOff, FolderTree, GripVertical, Plus } from 'lucide-react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { formatNumber, pickLocalized } from '../../lib/format';
import { mockCategories } from '../../lib/mock';

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Kategoriyalar"
        description="Mahsulot daraxti — drag&drop bilan tartiblang, ko`p tilli nomlar"
        actions={
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> Yangi kategoriya
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <FolderTree className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Daraxt</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {mockCategories.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 px-6 py-3 transition hover:bg-muted/40"
                >
                  <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
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
                    </div>
                    <div className="text-xs text-muted-foreground">/{c.slug}</div>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{formatNumber(c.productCount)}</span>
                    <span className="ml-1 text-xs text-muted-foreground">mahsulot</span>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yangi kategoriya</CardTitle>
            <p className="text-xs text-muted-foreground">Tezkor qo`shish</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Nomi (uz)</Label>
              <Input placeholder="Masalan: Erkaklar kiyimi" />
            </div>
            <div>
              <Label>Nomi (ru)</Label>
              <Input placeholder="Мужская одежда" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input placeholder="erkaklar-kiyimi" />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="cursor-pointer">Faol</Label>
              <Switch defaultChecked />
            </div>
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Qo`shish
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
