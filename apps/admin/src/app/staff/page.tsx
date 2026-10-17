'use client';

// /staff — panel xodimlari (faqat bosh admin, `staff.manage`; ADR 0019).
// Xodim qo'shish -> vaqtinchalik parol BIR MARTA ko'rsatiladi; xodim birinchi kirishda uni
// almashtiradi. Rollarni o'zgartirish, bloklash va parolni tiklash — shu yerda.

import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  PageHeader,
  StatusBadge,
  toast,
} from '@ecom/ui';
import { Copy, KeyRound, Loader2, MoreHorizontal, ShieldCheck, UserPlus } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import {
  createStaffUser,
  listAdminUsers,
  resetStaffPassword,
  updateStaffUser,
  type AdminStaffUser,
} from '../../lib/auth/client';
import { formatRelative, initials } from '../../lib/format';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, STAFF_ROLES, type StaffRole } from '../../lib/permissions';
import { useSession } from '../../providers/session-provider';

type Issued = { name: string; email: string | null; password: string; reason: 'created' | 'reset' };

function fullName(u: { firstName: string; lastName: string; email: string | null }) {
  return `${u.firstName} ${u.lastName}`.trim() || u.email || '—';
}

/** Rol tanlash — har birining yonida nimani ochishi yozilgan, tanlov ko'r-ko'rona bo'lmasin. */
function RolePicker({
  value,
  onChange,
  idPrefix,
}: {
  value: StaffRole[];
  onChange: (next: StaffRole[]) => void;
  idPrefix: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">Rollar</legend>
      {STAFF_ROLES.map((role) => {
        const id = `${idPrefix}-${role}`;
        const checked = value.includes(role);
        return (
          <div key={role} className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox
              id={id}
              checked={checked}
              onCheckedChange={(v) =>
                onChange(v === true ? [...value, role] : value.filter((r) => r !== role))
              }
              className="mt-0.5"
            />
            <Label htmlFor={id} className="cursor-pointer font-normal leading-snug">
              <span className="block font-medium">{ROLE_LABELS[role]}</span>
              <span className="text-muted-foreground block text-xs">{ROLE_DESCRIPTIONS[role]}</span>
            </Label>
          </div>
        );
      })}
    </fieldset>
  );
}

const EMPTY_FORM = { firstName: '', lastName: '', email: '', phone: '' };

export default function StaffPage() {
  const { session } = useSession();
  const [items, setItems] = React.useState<AdminStaffUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await listAdminUsers();
    if (res.success) {
      setItems(res.data.items);
      setLoadError(null);
    } else {
      setLoadError(res.error.message);
    }
    setLoading(false);
  }, []);
  React.useEffect(() => {
    void load();
  }, [load]);

  // ── Yangi xodim ──
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [formRoles, setFormRoles] = React.useState<StaffRole[]>([]);
  const [creating, setCreating] = React.useState(false);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formRoles.length === 0) {
      toast({ title: 'Kamida bitta rol tanlang', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const res = await createStaffUser({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      roles: formRoles,
    });
    setCreating(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    setCreateOpen(false);
    setForm(EMPTY_FORM);
    setFormRoles([]);
    setIssued({
      name: fullName(res.data.staff),
      email: res.data.staff.email,
      password: res.data.tempPassword,
      reason: 'created',
    });
    void load();
  };

  // ── Vaqtinchalik parol (yaratilganda / tiklanganda) — faqat shu oynada ko'rinadi ──
  const [issued, setIssued] = React.useState<Issued | null>(null);
  const copyPassword = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.password);
      toast({ title: 'Parol nusxalandi', variant: 'success' });
    } catch {
      toast({ title: "Nusxalab bo'lmadi — parolni qo'lda yozib oling", variant: 'warning' });
    }
  };

  // ── Rollarni o'zgartirish ──
  const [editing, setEditing] = React.useState<AdminStaffUser | null>(null);
  const [editRoles, setEditRoles] = React.useState<StaffRole[]>([]);
  const [savingRoles, setSavingRoles] = React.useState(false);
  const openEdit = (u: AdminStaffUser) => {
    setEditing(u);
    setEditRoles(
      u.roles.filter((r): r is StaffRole => (STAFF_ROLES as readonly string[]).includes(r)),
    );
  };
  const onSaveRoles = async () => {
    if (!editing) return;
    if (editRoles.length === 0) {
      toast({
        title: 'Kamida bitta rol qolishi kerak. Kirishni yopish uchun «Bloklash»ni tanlang.',
        variant: 'destructive',
      });
      return;
    }
    setSavingRoles(true);
    const res = await updateStaffUser(editing.id, { roles: editRoles });
    setSavingRoles(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Rollar saqlandi', variant: 'success' });
    setEditing(null);
    void load();
  };

  // ── Bloklash / faollashtirish, parolni tiklash ──
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const onToggleBlock = async (u: AdminStaffUser) => {
    const next = u.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    if (
      next === 'BLOCKED' &&
      !window.confirm(
        `${fullName(u)} panelga kira olmaydi va barcha qurilmalardan chiqariladi. Bloklaysizmi?`,
      )
    ) {
      return;
    }
    setBusyId(u.id);
    const res = await updateStaffUser(u.id, { status: next });
    setBusyId(null);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: next === 'BLOCKED' ? 'Xodim bloklandi' : 'Xodim faollashtirildi',
      variant: 'success',
    });
    void load();
  };
  const onResetPassword = async (u: AdminStaffUser) => {
    if (
      !window.confirm(
        `${fullName(u)} uchun yangi vaqtinchalik parol yaratilsinmi? Eski parol ishlamay qoladi.`,
      )
    ) {
      return;
    }
    setBusyId(u.id);
    const res = await resetStaffPassword(u.id);
    setBusyId(null);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    setIssued({
      name: fullName(u),
      email: u.email,
      password: res.data.tempPassword,
      reason: 'reset',
    });
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Xodimlar"
        description="Panelga kim kira oladi va qaysi bo'limlarni ko'radi"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Xodim qo&apos;shish
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-muted-foreground p-10 text-center text-sm">Yuklanmoqda…</div>
          ) : loadError ? (
            <div className="space-y-3 p-10 text-center text-sm">
              <p>{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => void load()}>
                Qayta yuklash
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((u) => {
                const self = u.id === session?.userId;
                return (
                  <li
                    key={u.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm md:px-6"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-[10px]">
                        {initials(`${u.firstName} ${u.lastName}`.trim()) || '—'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {fullName(u)}
                        {self && (
                          <span className="text-muted-foreground ml-2 text-xs font-normal">
                            (siz)
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        {u.email ?? u.phone ?? '—'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <StatusBadge
                          key={r}
                          tone={r === 'SUPER_ADMIN' ? 'info' : 'muted'}
                          dot={false}
                        >
                          {ROLE_LABELS[r as StaffRole] ?? r}
                        </StatusBadge>
                      ))}
                    </div>
                    <div className="w-40 text-xs">
                      {u.status === 'BLOCKED' ? (
                        <StatusBadge tone="danger">Bloklangan</StatusBadge>
                      ) : u.mustChangePassword ? (
                        <span className="text-amber-700 dark:text-amber-400">
                          Hali kirmagan (vaqtinchalik parol)
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {u.lastLoginAt
                            ? `Kirgan: ${formatRelative(u.lastLoginAt)}`
                            : 'Hali kirmagan'}
                        </span>
                      )}
                    </div>
                    {self ? (
                      <span className="w-8" aria-hidden />
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${fullName(u)} — amallar`}
                            disabled={busyId === u.id}
                          >
                            {busyId === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(u)}>
                            <ShieldCheck className="mr-2 h-4 w-4" /> Rollarni o&apos;zgartirish
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => void onResetPassword(u)}>
                            <KeyRound className="mr-2 h-4 w-4" /> Parolni tiklash
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => void onToggleBlock(u)}
                            className={
                              u.status === 'BLOCKED'
                                ? undefined
                                : 'text-destructive focus:text-destructive'
                            }
                          >
                            {u.status === 'BLOCKED' ? 'Faollashtirish' : 'Bloklash'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rollar nimani ochadi</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {STAFF_ROLES.map((r) => (
              <div key={r}>
                <dt className="font-medium">{ROLE_LABELS[r]}</dt>
                <dd className="text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground mt-4 text-xs">
            Bir xodimga bir nechta rol berish mumkin — ruxsatlar qo&apos;shiladi.
          </p>
        </CardContent>
      </Card>

      {/* Yangi xodim */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yangi xodim</DialogTitle>
            <DialogDescription>
              Xodim email va vaqtinchalik parol bilan kiradi, so&apos;ng o&apos;z parolini
              qo&apos;yadi.
            </DialogDescription>
          </DialogHeader>
          <form id="create-staff" onSubmit={onCreate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="s-first">Ism</Label>
                <Input
                  id="s-first"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="s-last">Familiya</Label>
                <Input
                  id="s-last"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="s-email">Email (kirish uchun)</Label>
              <Input
                id="s-email"
                type="email"
                required
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="s-phone">Telefon (ixtiyoriy)</Label>
              <Input
                id="s-phone"
                placeholder="+998XXXXXXXXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <RolePicker value={formRoles} onChange={setFormRoles} idPrefix="new" />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" form="create-staff" disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Xodimni qo&apos;shish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollarni o'zgartirish */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? fullName(editing) : ''} — rollar</DialogTitle>
            <DialogDescription>O&apos;zgarish darhol kuchga kiradi.</DialogDescription>
          </DialogHeader>
          <RolePicker value={editRoles} onChange={setEditRoles} idPrefix="edit" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Bekor qilish
            </Button>
            <Button onClick={() => void onSaveRoles()} disabled={savingRoles}>
              {savingRoles ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Rollarni saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vaqtinchalik parol — bir marta */}
      <Dialog open={!!issued} onOpenChange={(o) => !o && setIssued(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {issued?.reason === 'created' ? "Xodim qo'shildi" : 'Yangi vaqtinchalik parol'}
            </DialogTitle>
            <DialogDescription>
              Parolni xodimga shaxsan yoki xavfsiz kanal orqali bering. U faqat hozir ko&apos;rinadi
              — oyna yopilgach qayta ko&apos;rib bo&apos;lmaydi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Kirish</div>
              <div className="font-medium">{issued?.email}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Vaqtinchalik parol</div>
              <div className="flex items-center gap-2">
                <code className="bg-muted flex-1 select-all rounded-md px-3 py-2 font-mono text-base tracking-wider">
                  {issued?.password}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => void copyPassword()}
                  aria-label="Parolni nusxalash"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Birinchi kirishda xodimdan o&apos;z parolini qo&apos;yish so&apos;raladi.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIssued(null)}>Parolni berdim, yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
