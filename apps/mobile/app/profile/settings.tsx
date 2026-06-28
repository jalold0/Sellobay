import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import { Bell, ChevronRight, Globe, Trash2, Vibrate } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
import { useLocale, locales, type Locale } from '../../src/store/locale';
import { usePrefs } from '../../src/store/prefs';
import { Header } from '../../src/ui/header';

const LOCALE_LABELS: Record<Locale, string> = { uz: "O'zbek", ru: 'Русский', en: 'English' };
const SUPPORT_EMAIL = 'support@sellobay.uz';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const { locale, setLocale } = useLocale();
  const prefs = usePrefs();
  const version = (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

  const onDeleteAccount = () => {
    Alert.alert(t('profile.settingsPage.deleteAccount'), t('profile.settingsPage.dangerDesc'), [
      { text: t('profile.addressesPage.cancel'), style: 'cancel' },
      {
        text: t('profile.settingsPage.deleteAccount'),
        style: 'destructive',
        onPress: () => {
          void Linking.openURL(
            `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Account deletion request')}`,
          ).catch(() => {});
        },
      },
    ]);
  };

  return (
    <View className="bg-background flex-1">
      <Header title={t('profile.settingsPage.title')} showBack fallbackHref="/(tabs)/profile" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
      >
        {/* Til */}
        <View>
          <SectionLabel>{t('nav.settings')}</SectionLabel>
          <View className="border-border bg-card overflow-hidden rounded-2xl border">
            <View className="flex-row items-center gap-3 px-4 py-3.5">
              <IconCircle>
                <Globe size={16} color="#0A0A0C" />
              </IconCircle>
              <Text className="text-foreground flex-1 text-sm font-medium">
                {LOCALE_LABELS[locale]}
              </Text>
              <View className="flex-row gap-1">
                {locales.map((l) => (
                  <Pressable
                    key={l}
                    onPress={() => {
                      haptics.light();
                      setLocale(l);
                    }}
                    className={`rounded-full px-2.5 py-1 ${locale === l ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        locale === l ? 'text-white' : 'text-muted-foreground'
                      }`}
                    >
                      {l.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Bildirishnomalar + haptik */}
        <View>
          <SectionLabel>{t('profile.settingsPage.notificationsTitle')}</SectionLabel>
          <View className="border-border bg-card overflow-hidden rounded-2xl border">
            <Pressable
              onPress={() => router.push('/profile/notifications' as Href)}
              className="active:bg-muted border-border flex-row items-center gap-3 border-b px-4 py-3.5"
            >
              <IconCircle>
                <Bell size={16} color="#0A0A0C" />
              </IconCircle>
              <Text className="text-foreground flex-1 text-sm font-medium">
                {t('profile.settingsPage.notificationsTitle')}
              </Text>
              <ChevronRight size={14} color="#94a3b8" />
            </Pressable>
            <View className="flex-row items-center gap-3 px-4 py-3.5">
              <IconCircle>
                <Vibrate size={16} color="#0A0A0C" />
              </IconCircle>
              <Text className="text-foreground flex-1 text-sm font-medium">Haptik javob</Text>
              <Switch
                value={prefs.haptics}
                onValueChange={() => {
                  haptics.light();
                  prefs.toggle('haptics');
                }}
                trackColor={{ true: '#6d28d9', false: '#cbd5e1' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Xavfli zona */}
        <View>
          <SectionLabel>{t('profile.settingsPage.dangerTitle')}</SectionLabel>
          <Pressable
            onPress={onDeleteAccount}
            className="active:bg-muted flex-row items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-rose-100">
              <Trash2 size={16} color="#ef4444" />
            </View>
            <Text className="text-danger flex-1 text-sm font-semibold">
              {t('profile.settingsPage.deleteAccount')}
            </Text>
            <ChevronRight size={14} color="#ef4444" />
          </Pressable>
        </View>

        <Text className="text-muted-foreground text-center text-[10px]">
          {t('common.appName')} · v{version}
        </Text>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-muted-foreground mb-2 px-2 text-[10px] font-bold uppercase tracking-widest">
      {children}
    </Text>
  );
}

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-muted h-9 w-9 items-center justify-center rounded-full">{children}</View>
  );
}
