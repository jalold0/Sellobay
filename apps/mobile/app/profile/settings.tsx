import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react-native';
import * as React from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
import { useLocale, locales, type Locale } from '../../src/store/locale';
import { usePrefs, type PrefsState } from '../../src/store/prefs';

const LOCALE_LABELS: Record<Locale, string> = { uz: 'UZ', ru: 'RU', en: 'EN' };
const SUPPORT_EMAIL = 'support@sellobay.uz';

type ThemeChoice = 'system' | 'light' | 'dark';

type NotifToggleKey = 'notifPush' | 'notifEmail' | 'notifSms' | 'notifMarketing';

const NOTIF_ROWS: Array<{ key: NotifToggleKey; labelKey: string; descKey: string }> = [
  {
    key: 'notifPush',
    labelKey: 'profile.settingsPage.notifPushLabel',
    descKey: 'profile.settingsPage.notifPushDesc',
  },
  {
    key: 'notifEmail',
    labelKey: 'profile.settingsPage.notifEmailLabel',
    descKey: 'profile.settingsPage.notifEmailDesc',
  },
  {
    key: 'notifSms',
    labelKey: 'profile.settingsPage.notifSmsLabel',
    descKey: 'profile.settingsPage.notifSmsDesc',
  },
  {
    key: 'notifMarketing',
    labelKey: 'profile.settingsPage.notifMarketingLabel',
    descKey: 'profile.settingsPage.notifMarketingDesc',
  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const { locale, setLocale } = useLocale();
  const prefs = usePrefs();
  const version = (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

  const [theme, setTheme] = React.useState<ThemeChoice>('system');
  const [biometric, setBiometric] = React.useState(false);
  const [twoFactor, setTwoFactor] = React.useState(false);

  const onToggleNotif = (key: NotifToggleKey) => {
    haptics.light();
    prefs.toggle(key as keyof Omit<PrefsState, 'toggle'>);
  };

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
    <View className="bg-paper flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="bg-muted h-10 w-10 items-center justify-center rounded-full"
        >
          <ChevronLeft size={20} color="#0A0A0C" />
        </Pressable>
        <Text className="text-foreground font-serif text-2xl leading-6">
          {t('profile.settingsPage.title')}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 22 }}
      >
        {/* Umumiy */}
        <View>
          <SectionLabel>Umumiy</SectionLabel>
          <View className="border-border rounded-[18px] border bg-white">
            <View className="border-border flex-row items-center justify-between border-b px-4 py-3.5">
              <Text className="text-foreground text-sm font-medium">Til</Text>
              <View className="flex-row gap-1.5">
                {locales.map((l) => {
                  const active = locale === l;
                  return (
                    <Pressable
                      key={l}
                      onPress={() => {
                        haptics.light();
                        setLocale(l);
                      }}
                      className={`rounded-full px-3 py-1.5 ${active ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <Text
                        className={`text-[12px] font-bold ${
                          active ? 'text-white' : 'text-muted-foreground'
                        }`}
                      >
                        {LOCALE_LABELS[l]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View className="flex-row items-center justify-between px-4 py-3.5">
              <Text className="text-foreground text-sm font-medium">Mavzu</Text>
              <View className="flex-row gap-1.5">
                {(
                  [
                    ['system', 'Tizim'],
                    ['light', 'Och'],
                    ['dark', "Qorong'i"],
                  ] as Array<[ThemeChoice, string]>
                ).map(([value, label]) => {
                  const active = theme === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => {
                        haptics.light();
                        setTheme(value);
                      }}
                      className={`rounded-full px-3 py-1.5 ${active ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <Text
                        className={`text-[12px] font-bold ${
                          active ? 'text-white' : 'text-muted-foreground'
                        }`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Bildirishnomalar */}
        <View>
          <SectionLabel>{t('profile.settingsPage.notificationsTitle')}</SectionLabel>
          <View className="border-border rounded-[18px] border bg-white">
            {NOTIF_ROWS.map((row, i) => (
              <ToggleRow
                key={row.key}
                title={t(row.labelKey)}
                subtitle={t(row.descKey)}
                value={prefs[row.key]}
                onToggle={() => onToggleNotif(row.key)}
                divider={i < NOTIF_ROWS.length - 1}
              />
            ))}
          </View>
        </View>

        {/* Xavfsizlik */}
        <View>
          <SectionLabel>Xavfsizlik</SectionLabel>
          <View className="border-border rounded-[18px] border bg-white">
            <View className="active:bg-muted border-border flex-row items-center gap-3 border-b px-4 py-3.5">
              <IconBox>
                <KeyRound size={16} color="#0A0A0C" />
              </IconBox>
              <Text className="text-foreground flex-1 text-sm font-medium">
                Parolni o'zgartirish
              </Text>
              <ChevronRight size={16} color="#9a9aa2" />
            </View>

            <View className="border-border flex-row items-center gap-3 border-b px-4 py-3.5">
              <IconBox>
                <Fingerprint size={16} color="#0A0A0C" />
              </IconBox>
              <Pressable
                className="min-w-0 flex-1"
                onPress={() => {
                  haptics.light();
                  setBiometric((v) => !v);
                }}
              >
                <Text className="text-foreground text-sm font-medium">Face ID / biometrik</Text>
              </Pressable>
              <Toggle
                value={biometric}
                onToggle={() => {
                  haptics.light();
                  setBiometric((v) => !v);
                }}
              />
            </View>

            <View className="border-border flex-row items-center gap-3 border-b px-4 py-3.5">
              <IconBox>
                <ShieldCheck size={16} color="#0A0A0C" />
              </IconBox>
              <Pressable
                className="min-w-0 flex-1"
                onPress={() => {
                  haptics.light();
                  setTwoFactor((v) => !v);
                }}
              >
                <Text className="text-foreground text-sm font-medium">Ikki bosqichli (2FA)</Text>
              </Pressable>
              <Toggle
                value={twoFactor}
                onToggle={() => {
                  haptics.light();
                  setTwoFactor((v) => !v);
                }}
              />
            </View>

            <View className="flex-row items-center gap-3 px-4 py-3.5">
              <IconBox>
                <Smartphone size={16} color="#0A0A0C" />
              </IconBox>
              <Text className="text-foreground flex-1 text-sm font-medium">Faol qurilmalar</Text>
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: '#EDF7F1' }}>
                <Text className="text-success text-[11px] font-bold">2 ta</Text>
              </View>
              <ChevronRight size={16} color="#9a9aa2" />
            </View>
          </View>
        </View>

        {/* Maxfiylik */}
        <View>
          <SectionLabel>Maxfiylik</SectionLabel>
          <View className="border-border rounded-[18px] border bg-white">
            <View className="active:bg-muted border-border flex-row items-center gap-3 border-b px-4 py-3.5">
              <IconBox>
                <Download size={16} color="#0A0A0C" />
              </IconBox>
              <Text className="text-foreground flex-1 text-sm font-medium">
                Ma'lumotlarimni yuklab olish
              </Text>
              <ChevronRight size={16} color="#9a9aa2" />
            </View>
            <Pressable
              onPress={onDeleteAccount}
              className="active:bg-muted flex-row items-center gap-3 px-4 py-3.5"
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: '#FDECEC' }}
              >
                <Trash2 size={16} color="#DC2626" />
              </View>
              <Text className="text-danger flex-1 text-sm font-semibold">
                {t('profile.settingsPage.deleteAccount')}
              </Text>
              <ChevronRight size={16} color="#DC2626" />
            </Pressable>
          </View>
        </View>

        <Text className="text-center text-[10px] text-neutral-300">
          {t('common.appName')} v{version} · 2026
        </Text>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-300">
      {children}
    </Text>
  );
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-muted h-9 w-9 items-center justify-center rounded-[12px]">{children}</View>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onToggle,
  divider,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
  divider: boolean;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className={`flex-row items-center gap-3 px-4 py-3.5 ${
        divider ? 'border-border border-b' : ''
      }`}
    >
      <View className="min-w-0 flex-1">
        <Text className="text-foreground text-sm font-medium">{title}</Text>
        <Text className="text-muted-foreground text-xs">{subtitle}</Text>
      </View>
      <Toggle value={value} onToggle={onToggle} />
    </Pressable>
  );
}

function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        width: 46,
        height: 27,
        borderRadius: 999,
        padding: 3,
        justifyContent: 'center',
        alignItems: value ? 'flex-end' : 'flex-start',
        backgroundColor: value ? '#531625' : '#E0DEDA',
      }}
    >
      <View
        style={{
          width: 21,
          height: 21,
          borderRadius: 999,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 2,
          elevation: 2,
        }}
      />
    </Pressable>
  );
}
