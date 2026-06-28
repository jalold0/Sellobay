import { Check, MapPin, Plus, Trash2, X } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoginRequired } from '../../src/components/login-required';
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  type AddressInput,
  type ApiAddress,
} from '../../src/lib/api';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
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
  const [saving, setSaving] = React.useState(false);

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

  const onSave = async () => {
    if (
      !form.recipientName.trim() ||
      !form.phone.trim() ||
      !form.city.trim() ||
      !form.street.trim()
    ) {
      toast({ title: t('profile.addressesPage.fillMain'), variant: 'warning' });
      return;
    }
    setSaving(true);
    const created = await createAddress(form);
    setSaving(false);
    if (created) {
      haptics.success();
      toast({ title: t('profile.addressesPage.added'), variant: 'success' });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setItems((prev) => (prev ? [created, ...prev] : [created]));
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
    <View className="bg-background flex-1">
      <Header
        title={t('profile.addressesPage.title')}
        showBack
        fallbackHref="/(tabs)/profile"
        right={
          isAuthenticated ? (
            <Pressable
              onPress={() => setShowForm((s) => !s)}
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
                {t('profile.addressesPage.newAddress')}
              </Text>

              {/* Tur */}
              <View className="flex-row gap-2">
                {TYPES.map((ty) => (
                  <Pressable
                    key={ty.key}
                    onPress={() => set({ type: ty.key })}
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
            items.map((a) => (
              <View key={a.id} className="border-border bg-card rounded-2xl border p-4">
                <View className="flex-row items-start justify-between">
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-foreground text-sm font-bold">
                        {a.label || t(TYPES.find((x) => x.key === a.type)?.labelKey ?? '')}
                      </Text>
                      {a.isDefault ? (
                        <View className="rounded-full bg-emerald-100 px-2 py-0.5">
                          <Text className="text-[10px] font-bold text-emerald-700">
                            {t('profile.addressesPage.defaultBadge')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="text-foreground mt-1 text-sm">{a.recipientName}</Text>
                    <Text className="text-muted-foreground text-xs">{a.phone}</Text>
                    <Text className="text-muted-foreground mt-0.5 text-xs">
                      {[a.region, a.city, a.street, a.apartment].filter(Boolean).join(', ')}
                    </Text>
                    {a.landmark ? (
                      <Text className="text-muted-foreground text-xs">
                        {t('profile.addressesPage.landmarkPrefix')} {a.landmark}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => onDelete(a)}
                    hitSlop={8}
                    className="active:bg-muted h-9 w-9 items-center justify-center rounded-full"
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </Pressable>
                </View>
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
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
