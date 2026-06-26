import { useRouter } from 'expo-router';
import { ArrowLeft, Lock, Mail, Phone, ShieldCheck, X } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loginWithPassword, sendOtp, verifyOtp, type AuthUser } from '../../src/lib/api';
import { useT } from '../../src/lib/useT';
import { useSession } from '../../src/store/session';
import { toast } from '../../src/store/toast';
import { Button } from '../../src/ui/button';
import { cn } from '../../src/ui/cn';
import { Input } from '../../src/ui/input';

type Tab = 'phone' | 'email';
type PhoneStage = 'phone' | 'code';
type AuthHandler = (user: AuthUser, access: string, refresh: string) => Promise<void>;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const signIn = useSession((s) => s.signIn);
  const [tab, setTab] = React.useState<Tab>('phone');

  const handleAuth: AuthHandler = async (user, access, refresh) => {
    await signIn(
      {
        id: user.id,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        phone: user.phone ?? undefined,
        email: user.email ?? undefined,
      },
      access,
      refresh,
    );
    router.replace('/(tabs)');
  };

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-3 py-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
        >
          <X size={20} color="#0A0A0C" />
        </Pressable>
        <Text className="text-base font-semibold">{t('auth.loginTitle')}</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center pt-6">
          <View className="bg-primary h-16 w-16 items-center justify-center rounded-2xl">
            <Text className="text-2xl font-black text-white">E</Text>
          </View>
          <Text className="mt-4 text-2xl font-bold">{t('auth.loginWelcome')}</Text>
          <Text className="text-muted-foreground mt-1 text-sm">{t('auth.haveAccount')}</Text>
        </View>

        {/* Tabs */}
        <View className="bg-muted mt-6 flex-row rounded-full p-1">
          <TabButton
            active={tab === 'phone'}
            onPress={() => setTab('phone')}
            icon={<Phone size={14} color={tab === 'phone' ? '#0A0A0C' : '#6B6B73'} />}
          >
            {t('auth.tabPhone')}
          </TabButton>
          <TabButton
            active={tab === 'email'}
            onPress={() => setTab('email')}
            icon={<Mail size={14} color={tab === 'email' ? '#0A0A0C' : '#6B6B73'} />}
          >
            {t('auth.tabEmail')}
          </TabButton>
        </View>

        <View className="mt-4">
          {tab === 'phone' ? <PhoneForm onAuth={handleAuth} /> : <EmailForm onAuth={handleAuth} />}
        </View>

        {/* Divider */}
        <View className="my-6 flex-row items-center gap-3">
          <View className="bg-border h-px flex-1" />
          <Text className="text-muted-foreground text-xs">{t('auth.or')}</Text>
          <View className="bg-border h-px flex-1" />
        </View>

        {/* OAuth */}
        <View className="gap-2">
          {[
            { label: t('auth.loginWithGoogle'), emoji: '🔵' },
            { label: t('auth.loginWithTelegram'), emoji: '💬' },
            { label: t('auth.loginWithApple'), emoji: '' },
          ].map((p) => (
            <Pressable
              key={p.label}
              onPress={() =>
                toast({ title: t('auth.oauthSoon').replace('{provider}', p.label), duration: 2000 })
              }
              className="border-border bg-card active:bg-muted flex-row items-center gap-3 rounded-2xl border px-4 py-3"
            >
              <Text className="text-lg">{p.emoji}</Text>
              <Text className="text-foreground text-sm font-medium">{p.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-muted-foreground mt-6 text-center text-[11px]">
          {t('auth.termsAgree')} <Text className="text-primary">{t('auth.termsLink')}</Text>{' '}
          {t('auth.and')} <Text className="text-primary">{t('auth.privacyLink')}</Text>
          {t('auth.termsSuffix')}
        </Text>
      </ScrollView>
    </View>
  );
}

function TabButton({
  children,
  active,
  onPress,
  icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2.5',
        active ? 'bg-card' : 'bg-transparent',
      )}
    >
      {icon}
      <Text
        className={cn(
          'text-sm font-semibold',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {children}
      </Text>
    </Pressable>
  );
}

function PhoneForm({ onAuth }: { onAuth: AuthHandler }) {
  const { t } = useT();
  const [stage, setStage] = React.useState<PhoneStage>('phone');
  const [phone, setPhone] = React.useState('+998 ');
  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 12) {
      toast({ title: 'Telefon to`liq kiritilmagan', variant: 'warning' });
      return;
    }
    setLoading(true);
    const res = await sendOtp(phone.trim());
    setLoading(false);
    if (!res.success) {
      toast({ title: res.error?.message ?? t('auth.sendCode'), variant: 'destructive' });
      return;
    }
    setStage('code');
    setResendIn(60);
    toast({ title: t('auth.codeSent'), description: phone, variant: 'success' });
  };

  const verify = async () => {
    if (code.length < 4) {
      toast({ title: 'Kodni to`liq kiriting', variant: 'warning' });
      return;
    }
    setLoading(true);
    const res = await verifyOtp(phone.trim(), code);
    setLoading(false);
    if (!res.success || !res.user || !res.tokens) {
      toast({ title: res.error?.message ?? 'Kod noto`g`ri', variant: 'destructive' });
      return;
    }
    await onAuth(res.user, res.tokens.access, res.tokens.refresh);
  };

  if (stage === 'phone') {
    return (
      <View className="gap-3">
        <Input
          label={t('auth.phone')}
          value={phone}
          onChangeText={setPhone}
          placeholder={t('auth.phonePlaceholder')}
          keyboardType="phone-pad"
          autoComplete="tel"
          leftIcon={<Phone size={16} color="#6B6B73" />}
          hint={t('auth.phoneHint')}
        />
        <Button fullWidth size="lg" loading={loading} onPress={sendCode}>
          {t('auth.sendCode')}
        </Button>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Pressable
        onPress={() => setStage('phone')}
        className="flex-row items-center gap-1 self-start"
        hitSlop={4}
      >
        <ArrowLeft size={12} color="#6B6B73" />
        <Text className="text-muted-foreground text-xs">{t('auth.changePhone')}</Text>
      </Pressable>
      <Input
        label={t('auth.codeLabel')}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        placeholder="------"
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        hint={t('auth.codeSentTo').replace('{phone}', phone)}
      />
      <Button fullWidth size="lg" loading={loading} onPress={verify}>
        {t('auth.verify')}
      </Button>
      <Pressable
        onPress={() => {
          if (resendIn === 0) {
            setResendIn(60);
            toast({ title: t('auth.codeResent'), variant: 'success' });
          }
        }}
        disabled={resendIn > 0}
        hitSlop={6}
      >
        <Text className="text-muted-foreground text-center text-xs">
          {resendIn > 0
            ? t('auth.resendIn').replace('{seconds}', String(resendIn))
            : t('auth.resend')}
        </Text>
      </Pressable>
    </View>
  );
}

function EmailForm({ onAuth }: { onAuth: AuthHandler }) {
  const { t } = useT();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const submit = async () => {
    if (!email.includes('@') || password.length < 6) {
      toast({ title: 'Email va parolni to`g`ri kiriting', variant: 'warning' });
      return;
    }
    setLoading(true);
    const res = await loginWithPassword(email.trim(), password);
    setLoading(false);
    if (!res.success || !res.user || !res.tokens) {
      toast({ title: res.error?.message ?? 'Kirish amalga oshmadi', variant: 'destructive' });
      return;
    }
    await onAuth(res.user, res.tokens.access, res.tokens.refresh);
  };

  return (
    <View className="gap-3">
      <Input
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        leftIcon={<Mail size={16} color="#6B6B73" />}
      />
      <Input
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        autoComplete="current-password"
        leftIcon={<Lock size={16} color="#6B6B73" />}
      />
      <Button fullWidth size="lg" loading={loading} onPress={submit}>
        {t('auth.loginSubmit')}
      </Button>
      <View className="bg-muted flex-row items-center gap-2 rounded-md p-2.5">
        <ShieldCheck size={14} color="#10b981" />
        <Text className="text-muted-foreground flex-1 text-[11px]">{t('auth.passwordSecure')}</Text>
      </View>
    </View>
  );
}
