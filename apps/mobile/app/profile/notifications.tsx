import { Bell } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
import { usePrefs, type PrefsState } from '../../src/store/prefs';
import { Header } from '../../src/ui/header';

type ToggleKey = 'notifEmail' | 'notifSms' | 'notifPush' | 'notifMarketing';

const ROWS: Array<{ key: ToggleKey; labelKey: string; descKey: string }> = [
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

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const prefs = usePrefs();

  const onToggle = (key: ToggleKey) => {
    haptics.light();
    prefs.toggle(key as keyof Omit<PrefsState, 'toggle'>);
  };

  return (
    <View className="bg-background flex-1">
      <Header
        title={t('profile.settingsPage.notificationsTitle')}
        showBack
        fallbackHref="/(tabs)/profile"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
      >
        <View className="bg-primary/5 flex-row items-center gap-3 rounded-2xl p-4">
          <Bell size={20} color="#6d28d9" />
          <Text className="text-muted-foreground flex-1 text-xs">
            {t('profile.settingsPage.notificationsTitle')}
          </Text>
        </View>

        <View className="border-border bg-card overflow-hidden rounded-2xl border">
          {ROWS.map((row, i) => (
            <View
              key={row.key}
              className={`flex-row items-center gap-3 px-4 py-3.5 ${
                i < ROWS.length - 1 ? 'border-border border-b' : ''
              }`}
            >
              <View className="min-w-0 flex-1">
                <Text className="text-foreground text-sm font-medium">{t(row.labelKey)}</Text>
                <Text className="text-muted-foreground text-xs">{t(row.descKey)}</Text>
              </View>
              <Switch
                value={prefs[row.key]}
                onValueChange={() => onToggle(row.key)}
                trackColor={{ true: '#6d28d9', false: '#cbd5e1' }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
