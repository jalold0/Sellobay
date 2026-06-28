import * as React from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoginRequired } from '../../src/components/login-required';
import { fetchMe, updateMe, type UpdateMeInput } from '../../src/lib/api';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
import { useSession } from '../../src/store/session';
import { toast } from '../../src/store/toast';
import { Button } from '../../src/ui/button';
import { Header } from '../../src/ui/header';
import { Input } from '../../src/ui/input';
import { Skeleton } from '../../src/ui/skeleton';

type Gender = 'MALE' | 'FEMALE' | 'UNSPECIFIED';

const GENDERS: Array<{ key: Gender; labelKey: string }> = [
  { key: 'MALE', labelKey: 'profile.gender.male' },
  { key: 'FEMALE', labelKey: 'profile.gender.female' },
  { key: 'UNSPECIFIED', labelKey: 'profile.gender.other' },
];

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { isAuthenticated, updateUser } = useSession();

  const [form, setForm] = React.useState<UpdateMeInput>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((me) => {
        if (!active || !me) return;
        setForm({
          firstName: me.firstName ?? '',
          lastName: me.lastName ?? '',
          email: me.email ?? '',
          phone: me.phone ?? '',
          gender: me.gender ?? 'UNSPECIFIED',
          birthDate: me.birthDate ?? '',
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const set = (patch: Partial<UpdateMeInput>) => setForm((f) => ({ ...f, ...patch }));

  const onSave = async () => {
    setSaving(true);
    // Bo'sh string'larni null'ga (backend optional/nullable kutadi)
    const payload: UpdateMeInput = {
      firstName: form.firstName?.trim() || null,
      lastName: form.lastName?.trim() || null,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      gender: form.gender,
      birthDate: form.birthDate?.trim() || null,
    };
    const res = await updateMe(payload);
    setSaving(false);
    if (res.success && res.user) {
      haptics.success();
      updateUser({
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        email: res.user.email,
        phone: res.user.phone,
      });
      toast({ title: t('profile.saved'), variant: 'success' });
    } else {
      toast({
        title: res.error?.message ?? t('profile.addressesPage.error'),
        variant: 'destructive',
      });
    }
  };

  return (
    <View className="bg-background flex-1">
      <Header title={t('profile.title')} showBack fallbackHref="/(tabs)/profile" />

      {!isAuthenticated ? (
        <LoginRequired />
      ) : loading ? (
        <View className="gap-3 p-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}
        >
          <Input
            label={t('auth.firstName')}
            value={form.firstName ?? ''}
            onChangeText={(v) => set({ firstName: v })}
          />
          <Input
            label={t('auth.lastName')}
            value={form.lastName ?? ''}
            onChangeText={(v) => set({ lastName: v })}
          />
          <Input
            label={t('auth.email')}
            value={form.email ?? ''}
            onChangeText={(v) => set({ email: v })}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder={t('auth.emailPlaceholder')}
          />
          <Input
            label={t('auth.phone')}
            value={form.phone ?? ''}
            onChangeText={(v) => set({ phone: v })}
            keyboardType="phone-pad"
            placeholder={t('auth.phonePlaceholder')}
          />

          {/* Jins */}
          <View className="gap-1.5">
            <Text className="text-muted-foreground text-xs font-medium">
              {t('profile.gender.title')}
            </Text>
            <View className="flex-row gap-2">
              {GENDERS.map((g) => (
                <Pressable
                  key={g.key}
                  onPress={() => set({ gender: g.key })}
                  className={`flex-1 items-center rounded-xl border py-2.5 ${
                    form.gender === g.key ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      form.gender === g.key ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {t(g.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Input
            label={t('profile.birthday')}
            value={form.birthDate ?? ''}
            onChangeText={(v) => set({ birthDate: v })}
            placeholder="2000-01-31"
            keyboardType="numbers-and-punctuation"
          />

          <Button onPress={onSave} loading={saving} fullWidth>
            {t('profile.saveChanges')}
          </Button>
        </ScrollView>
      )}
    </View>
  );
}
