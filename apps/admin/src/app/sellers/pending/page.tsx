'use client';

import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  Skeleton,
  toast,
} from '@ecom/ui';
import { Check, Mail, Phone, Store, X } from 'lucide-react';
import * as React from 'react';

import {
  approveSeller,
  listPendingSellers,
  rejectSeller,
  type PendingSeller,
} from '@/lib/auth/client';
import { formatDate, initials } from '../../../lib/format';

export default function PendingSellersPage() {
  const [items, setItems] = React.useState<PendingSeller[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listPendingSellers();
    if (res.success) setItems(res.data.items);
    else toast({ title: res.error.message, variant: 'destructive' });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onApprove = async (s: PendingSeller) => {
    setBusyId(s.id);
    const res = await approveSeller(s.id);
    setBusyId(null);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: `${s.brandName} tasdiqlandi`,
      description: 'Sotuvchi endi mahsulot qo`shishi mumkin',
      variant: 'success',
    });
    setItems((prev) => prev.filter((p) => p.id !== s.id));
  };

  const onReject = async (s: PendingSeller) => {
    if (!confirm(`${s.brandName} arizasini rad etishni tasdiqlaysizmi?`)) return;
    setBusyId(s.id);
    const res = await rejectSeller(s.id);
    setBusyId(null);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${s.brandName} rad etildi`, variant: 'destructive' });
    setItems((prev) => prev.filter((p) => p.id !== s.id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasdiq kutilayotgan sotuvchilar"
        description="Yangi sotuvchi arizalarini ko'rib chiqing va tasdiqlang"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Yangilash
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Hech qanday ariza yo'q"
          description="Hozircha barcha sotuvchi arizalari ko'rib chiqilgan"
        />
      ) : (
        <div className="grid gap-3">
          {items.map((s) => {
            const fullName =
              [s.owner.firstName, s.owner.lastName].filter(Boolean).join(' ').trim() ||
              s.owner.email ||
              s.owner.phone ||
              'Foydalanuvchi';
            const busy = busyId === s.id;
            return (
              <Card key={s.id}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{initials(s.brandName || fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{s.brandName}</div>
                    <div className="text-muted-foreground text-xs">
                      {s.legalName} · Egasi: {fullName}
                    </div>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
                      {s.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={12} /> {s.email}
                        </span>
                      ) : null}
                      {s.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} /> {s.phone}
                        </span>
                      ) : null}
                      <span>Ariza: {formatDate(new Date(s.createdAt))}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReject(s)}
                      disabled={busy}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X size={14} className="mr-1" /> Rad etish
                    </Button>
                    <Button size="sm" onClick={() => onApprove(s)} disabled={busy}>
                      <Check size={14} className="mr-1" />
                      {busy ? 'Tasdiqlanmoqda...' : 'Tasdiqlash'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
