import { AlertTriangle, Check, Home, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationPicker } from '../../src/components/location-picker';
import { LoginRequired } from '../../src/components/login-required';
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
  type AddressInput,
  type ApiAddress,
} from '../../src/lib/api';
import { pickLocalized } from '../../src/lib/format';
import { isInTashkentCity } from '../../src/lib/geo';
import { haptics } from '../../src/lib/haptics';
import { usePickupPoints } from '../../src/lib/hooks';
import { useT } from '../../src/lib/useT';
import { useLocale } from '../../src/store/locale';
import { useSession } from '../../src/store/session';
import { toast } from '../../src/store/toast';
import { Button } from '../../src/ui/button';
import { EmptyState } from '../../src/ui/empty-state';
import { Header } from '../../src/ui/header';
import { Input } from '../../src/ui/input';
import { Skeleton } from '../../src/ui/skeleton';

const TYPES: Array<{ key: ApiAddress['type']; labelKey: string }> = [
  { key: 'HOME', labelKey: 'profile.addressesPage.typeHome' },
  { key: 'WORK', labelKey: 'profile.addressesPage.typeWork' },
  { key: 'PICKUP', labelKey: 'profile.addressesPage.typePickup' },
  { key: 'OTHER', labelKey: 'profile.addressesPage.typeOther' },
];

const EMPTY_FORM: AddressInput = {
  type: 'HOME',
  label: '',
  recipientName: '',
  phone: '',
  region: 'Toshkent',
  city: '',
  street: '',
  apartment: '',
  landmark: '',
  latitude: null,
  longitude: null,
  pickupPointId: null,
  isDefault: false,
};

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { isAuthenticated } = useSession();

  const [items, setItems] = React.useState<ApiAddress[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState<AddressInput>(EMPTY_FORM);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [showMap, setShowMap] = React.useState(false);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (a: ApiAddress) => {
    haptics.light();
    setEditingId(a.id);
    setForm({
      type: a.type,
      label: a.label ?? '',
      recipientName: a.recipientName,
      phone: a.phone,
      region: a.region,
      city: a.city,
      street: a.street,
      apartment: a.apartment ?? '',
      landmark: a.landmark ?? '',
      latitude: a.latitude != null ? Number(a.latitude) : null,
      longitude: a.longitude != null ? Number(a.longitude) : null,
      pickupPointId: a.pickupPointId ?? null,
      isDefault: a.isDefault,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const load = React.useCallback(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchAddresses()
      .then((data) => setItems(data ?? []))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  React.useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<AddressInput>) => setForm((f) => ({ ...f, ...patch }));

  // Aqlli forma: PICKUP → punkt tanlash; uy manzili → Toshkent bbox tekshiruvi
  const locale = useLocale((s) => s.locale);
  const { data: pickupPoints = [] } = usePickupPoints();
  const isPickup = form.type === 'PICKUP';
  const homeOutsideTashkent =
    !isPickup &&
    form.latitude != null &&
    form.longitude != null &&
    !isInTashkentCity(form.latitude, form.longitude);

  const onSave = async () => {
    if (isPickup) {
      if (!form.pickupPointId || !form.recipientName.trim() || !form.phone.trim()) {
        toast({ title: t('profile.addressesPage.fillMain'), variant: 'warning' });
        return;
      }
    } else {
      if (
        !form.recipientName.trim() ||
        !form.phone.trim() ||
        !form.city.trim() ||
        !form.street.trim()
      ) {
        toast({ title: t('profile.addressesPage.fillMain'), variant: 'warning' });
        return;
      }
      if (homeOutsideTashkent) {
        toast({
          title: 'Uygacha yetkazish faqat Toshkent shahar uchun. Olib ketish punktini tanlang.',
          variant: 'warning',
        });
        return;
      }
    }
    setSaving(true);
    if (editingId) {
      const updated = await updateAddress(editingId, form);
      setSaving(false);
      if (updated) {
        haptics.success();
        toast({ title: t('profile.addressesPage.saved'), variant: 'success' });
        // isDefault yoqilgan bo'lsa, qolganlaridan olib tashlaymiz
        setItems(
          (prev) =>
            prev?.map((x) =>
              x.id === updated.id ? updated : updated.isDefault ? { ...x, isDefault: false } : x,
            ) ?? null,
        );
        closeForm();
      } else {
        toast({ title: t('profile.addressesPage.notSaved'), variant: 'destructive' });
      }
      return;
    }
    const created = await createAddress(form);
    setSaving(false);
    if (created) {
      haptics.success();
      toast({ title: t('profile.addressesPage.added'), variant: 'success' });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setItems((prev) => {
        const list = prev ?? [];
        // yangi default bo'lsa, eskilaridan olib tashlaymiz
        const normalized = created.isDefault ? list.map((x) => ({ ...x, isDefault: false })) : list;
        return [created, ...normalized];
      });
    } else {
      toast({ title: t('profile.addressesPage.notSaved'), variant: 'destructive' });
    }
  };

  const onDelete = (a: ApiAddress) => {
    Alert.alert(
      t('profile.addressesPage.title'),
      t('profile.addressesPage.deleteConfirm').replace('{label}', a.label || a.city),
      [
        { text: t('profile.addressesPage.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteAddress(a.id);
            if (ok) {
              haptics.success();
              toast({ title: t('profile.addressesPage.deleted'), variant: 'success' });
              setItems((prev) => prev?.filter((x) => x.id !== a.id) ?? null);
            } else {
              toast({ title: t('profile.addressesPage.error'), variant: 'destructive' });
            }
          },
        },
      ],
    );
  };

  const onMakeDefault = async (a: ApiAddress) => {
    const ok = await setDefaultAddress(a.id);
    if (ok) {
      haptics.light();
      toast({ title: t('profile.addressesPage.defaultUpdated'), variant: 'success' });
      setItems((prev) => prev?.map((x) => ({ ...x, isDefault: x.id === a.id })) ?? null);
    } else {
      toast({ title: t('profile.addressesPage.error'), variant: 'destructive' });
    }
  };

  return (
    <View className="bg-paper flex-1">
      <Header
        title={t('profile.addressesPage.title')}
        showBack
        fallbackHref="/(tabs)/profile"
        right={
          isAuthenticated ? (
            <Pressable
              onPress={() => (showForm ? closeForm() : openNew())}
              hitSlop={8}
              className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
            >
              {showForm ? <X size={20} color="#0A0A0C" /> : <Plus size={20} color="#0A0A0C" />}
            </Pressable>
          ) : undefined
        }
      />

      {!isAuthenticated ? (
        <LoginRequired />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}
        >
          {/* Yangi manzil formasi */}
          {showForm ? (
            <View className="border-border bg-card gap-3 rounded-2xl border p-4">
              <Text className="text-foreground font-semibold">
                {t(
                  editingId
                    ? 'profile.addressesPage.editAddress'
                    : 'profile.addressesPage.newAddress',
                )}
              </Text>

              {/* Tur */}
              <View className="flex-row gap-2">
                {TYPES.map((ty) => (
                  <Pressable
                    key={ty.key}
                    onPress={() =>
                      set(
                        ty.key === 'PICKUP'
                          ? { type: ty.key }
                          : { type: ty.key, pickupPointId: null },
                      )
                    }
                    className={`flex-1 items-center rounded-xl border py-2 ${
                      form.type === ty.key ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        form.type === ty.key ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {t(ty.labelKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Uy manzili: xaritadan tanlash + Toshkent ogohlantirishi */}
              {!isPickup ? (
                <>
                  <Pressable
                    onPress={() => {
                      haptics.light();
                      setShowMap(true);
                    }}
                    className="border-primary bg-primary/5 flex-row items-center gap-2 rounded-xl border border-dashed p-3 active:opacity-80"
                  >
                    <MapPin size={18} color="#531625" />
                    <View className="flex-1">
                      <Text className="text-primary text-sm font-semibold">
                        {t('profile.addressesPage.pickOnMap')}
                      </Text>
                      {form.latitude != null ? (
                        <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                          {[form.city, form.street].filter(Boolean).join(', ') ||
                            t('profile.addressesPage.locationPicked')}
                        </Text>
                      ) : null}
                    </View>
                    <Text className="text-primary text-lg">›</Text>
                  </Pressable>

                  {homeOutsideTashkent ? (
                    <View className="gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
                      <View className="flex-row items-start gap-2">
                        <AlertTriangle size={16} color="#d97706" style={{ marginTop: 1 }} />
                        <Text className="flex-1 text-xs leading-4 text-amber-800">
                          Uygacha yetkazish faqat Toshkent shahar uchun. Viloyat uchun olib ketish
                          punktini tanlang.
                        </Text>
                      </View>
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => {
                          haptics.light();
                          set({ type: 'PICKUP' });
                        }}
                      >
                        Olib ketish punktiga o&apos;tish
                      </Button>
                    </View>
                  ) : null}
                </>
              ) : (
                /* Viloyat: topshirish punktini tanlash */
                <View className="gap-2">
                  <Text className="text-muted-foreground text-xs font-medium">
                    Topshirish punktini tanlang
                  </Text>
                  {pickupPoints.length === 0 ? (
                    <View className="bg-muted rounded-lg p-3">
                      <Text className="text-muted-foreground text-xs">Punktlar yuklanmoqda...</Text>
                    </View>
                  ) : (
                    pickupPoints.map((p) => {
                      const sel = form.pickupPointId === p.id;
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => {
                            haptics.select();
                            set({
                              pickupPointId: p.id,
                              label: pickLocalized(p.name, locale),
                              region: p.region,
                              city: p.city,
                              street: p.street,
                              latitude: p.latitude,
                              longitude: p.longitude,
                            });
                          }}
                          className={`rounded-2xl border-2 p-3 ${
                            sel ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                        >
                          <View className="flex-row items-start gap-2">
                            <MapPin
                              size={16}
                              color={sel ? '#531625' : '#94a3b8'}
                              style={{ marginTop: 2 }}
                            />
                            <View className="min-w-0 flex-1">
                              <View className="flex-row items-center gap-2">
                                <Text className="text-foreground flex-1 text-sm font-semibold">
                                  {pickLocalized(p.name, locale)}
                                </Text>
                                <View className="bg-muted rounded-full px-2 py-0.5">
                                  <Text className="text-muted-foreground text-[10px] font-bold">
                                    {p.provider}
                                  </Text>
                                </View>
                              </View>
                              <Text className="text-muted-foreground text-xs">
                                {[p.region, p.city, p.street].filter(Boolean).join(', ')}
                              </Text>
                              {p.workingHours ? (
                                <Text className="text-muted-foreground text-[11px]">
                                  {p.workingHours}
                                </Text>
                              ) : null}
                            </View>
                            {sel ? <Check size={18} color="#531625" /> : null}
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              )}

              <Input
                label={t('profile.addressesPage.recipient')}
                value={form.recipientName}
                onChangeText={(v) => set({ recipientName: v })}
              />
              <Input
                label={t('profile.addressesPage.phone')}
                value={form.phone}
                onChangeText={(v) => set({ phone: v })}
                keyboardType="phone-pad"
                placeholder="+998 90 123 45 67"
              />
              {!isPickup ? (
                <>
                  <Input
                    label={t('profile.addressesPage.city')}
                    value={form.city}
                    onChangeText={(v) => set({ city: v })}
                  />
                  <Input
                    label={t('profile.addressesPage.street')}
                    value={form.street}
                    onChangeText={(v) => set({ street: v })}
                    placeholder={t('profile.addressesPage.streetPlaceholder')}
                  />
                  <Input
                    label={t('profile.addressesPage.apartment')}
                    value={form.apartment ?? ''}
                    onChangeText={(v) => set({ apartment: v })}
                  />
                  <Input
                    label={t('profile.addressesPage.landmark')}
                    value={form.landmark ?? ''}
                    onChangeText={(v) => set({ landmark: v })}
                    placeholder={t('profile.addressesPage.landmarkPlaceholder')}
                  />
                </>
              ) : null}

              <Pressable
                onPress={() => set({ isDefault: !form.isDefault })}
                className="flex-row items-center gap-2 py-1"
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded border ${
                    form.isDefault ? 'border-primary bg-primary' : 'border-border'
                  }`}
                >
                  {form.isDefault ? <Check size={13} color="#fff" /> : null}
                </View>
                <Text className="text-foreground text-sm">
                  {t('profile.addressesPage.makeDefaultCheck')}
                </Text>
              </Pressable>

              <Button onPress={onSave} loading={saving} fullWidth>
                {saving ? t('profile.addressesPage.saving') : t('profile.addressesPage.save')}
              </Button>
            </View>
          ) : null}

          {/* Ro'yxat */}
          {loading ? (
            <View className="gap-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </View>
          ) : !items || items.length === 0 ? (
            !showForm ? (
              <EmptyState
                icon={<MapPin size={26} color="#94a3b8" />}
                title={t('profile.addressesPage.emptyTitle')}
                description={t('profile.addressesPage.emptyDesc')}
                action={
                  <Button onPress={() => setShowForm(true)} fullWidth>
                    {t('profile.addressesPage.addAddress')}
                  </Button>
                }
              />
            ) : null
          ) : (
            <>
              {items.map((a) => (
                <View key={a.id} className="border-border rounded-[18px] border bg-white p-[15px]">
                  <View className="flex-row items-center gap-3">
                    <View
                      className="h-10 w-10 items-center justify-center rounded-[12px]"
                      style={{ backgroundColor: '#FBF2F4' }}
                    >
                      {a.type === 'HOME' ? (
                        <Home size={20} color="#531625" />
                      ) : (
                        <MapPin size={20} color="#531625" />
                      )}
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-foreground text-sm font-bold">
                        {a.label || t(TYPES.find((x) => x.key === a.type)?.labelKey ?? '')}
                      </Text>
                      {a.isDefault ? (
                        <View
                          className="rounded-full px-2 py-0.5"
                          style={{ backgroundColor: '#FDF3F5' }}
                        >
                          <Text className="text-primary text-[10px] font-bold">
                            {t('profile.addressesPage.defaultBadge')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View className="flex-1" />
                    <Pressable
                      onPress={() => openEdit(a)}
                      hitSlop={8}
                      className="bg-muted h-8 w-8 items-center justify-center rounded-full active:opacity-70"
                    >
                      <Pencil size={15} color="#0A0A0C" />
                    </Pressable>
                    <Pressable
                      onPress={() => onDelete(a)}
                      hitSlop={8}
                      className="bg-muted ml-2 h-8 w-8 items-center justify-center rounded-full active:opacity-70"
                    >
                      <Trash2 size={15} color="#ef4444" />
                    </Pressable>
                  </View>

                  <Text className="mt-2.5 text-[13px] leading-5" style={{ color: '#3a3a40' }}>
                    {a.recipientName} ·{' '}
                    {[a.region, a.city, a.street, a.apartment].filter(Boolean).join(', ')}
                  </Text>
                  {a.landmark ? (
                    <Text className="mt-1 text-[12px]" style={{ color: '#3a3a40' }}>
                      {t('profile.addressesPage.landmarkPrefix')} {a.landmark}
                    </Text>
                  ) : null}
                  <Text className="mt-1 text-[12px] text-neutral-300">{a.phone}</Text>

                  {!a.isDefault ? (
                    <Pressable
                      onPress={() => onMakeDefault(a)}
                      className="border-border active:bg-muted mt-3 items-center rounded-xl border py-2"
                    >
                      <Text className="text-foreground text-xs font-semibold">
                        {t('profile.addressesPage.makeDefault')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}

              {!showForm ? (
                <Pressable
                  onPress={openNew}
                  className="flex-row items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed p-[15px] active:opacity-70"
                  style={{ borderColor: '#DAD2CC' }}
                >
                  <Plus size={18} color="#531625" />
                  <Text className="text-primary font-semibold">
                    {t('profile.addressesPage.addAddress')}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </ScrollView>
      )}

      {showMap ? (
        <LocationPicker
          initial={
            form.latitude != null && form.longitude != null
              ? { lat: form.latitude, lng: form.longitude }
              : undefined
          }
          onClose={() => setShowMap(false)}
          onConfirm={(loc) => {
            set({
              latitude: loc.lat,
              longitude: loc.lng,
              region: loc.region ?? form.region,
              city: loc.city ?? form.city,
              street: loc.street ?? form.street,
            });
            setShowMap(false);
          }}
        />
      ) : null}
    </View>
  );
}
