import { useRouter } from 'expo-router';
import {
  BadgeCheck,
  ChevronLeft,
  DollarSign,
  ExternalLink,
  FileText,
  Store,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react-native';
import * as React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE } from '../../src/lib/api';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
import { toast } from '../../src/store/toast';
import { Button } from '../../src/ui/button';

export default function SellScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, locale } = useT();

  const benefits = [
    { icon: Users, title: t('sell.benefit.customers'), desc: t('sell.benefit.customersDesc') },
    { icon: TrendingUp, title: t('sell.benefit.growth'), desc: t('sell.benefit.growthDesc') },
    { icon: Truck, title: t('sell.benefit.logistics'), desc: t('sell.benefit.logisticsDesc') },
    {
      icon: DollarSign,
      title: t('sell.benefit.commission'),
      desc: t('sell.benefit.commissionDesc'),
    },
  ];

  const requirements = [
    t('sell.req.legal'),
    t('sell.req.stir'),
    t('sell.req.bank'),
    t('sell.req.product'),
  ];

  const steps = [
    { title: t('sell.step.apply'), desc: t('sell.step.applyDesc') },
    { title: t('sell.step.verify'), desc: t('sell.step.verifyDesc') },
    { title: t('sell.step.add'), desc: t('sell.step.addDesc') },
    { title: t('sell.step.start'), desc: t('sell.step.startDesc') },
  ];

  const openWeb = async (path: string) => {
    haptics.light();
    const url = `${API_BASE}/${locale}${path}`;
    try {
      await Linking.openURL(url);
    } catch {
      toast({ title: t('sell.openError'), variant: 'destructive' });
    }
  };

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-3 pb-1">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
        >
          <ChevronLeft size={22} color="#0A0A0C" />
        </Pressable>
        <Text className="flex-1 text-center text-base font-semibold">{t('sell.title')}</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
      >
        {/* Hero */}
        <View className="bg-primary overflow-hidden rounded-3xl p-5">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Store size={24} color="#fff" />
          </View>
          <Text className="mt-3 text-[11px] uppercase tracking-widest text-white/70">
            {t('sell.heroEyebrow')}
          </Text>
          <Text className="mt-1 text-2xl font-black text-white">{t('sell.heroTitle')}</Text>
          <Text className="mt-2 text-sm leading-5 text-white/85">{t('sell.heroSubtitle')}</Text>
        </View>

        {/* Benefits */}
        <View>
          <Text className="text-foreground mb-3 px-1 text-base font-bold">
            {t('sell.benefitsTitle')}
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <View
                  key={b.title}
                  className="border-border bg-card flex-1 basis-[45%] rounded-2xl border p-4"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                    <Icon size={18} color="#d97706" />
                  </View>
                  <Text className="text-foreground mt-2.5 text-sm font-bold">{b.title}</Text>
                  <Text className="text-muted-foreground mt-0.5 text-xs leading-4">{b.desc}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Requirements */}
        <View className="border-border bg-card rounded-2xl border p-4">
          <View className="mb-2.5 flex-row items-center gap-2">
            <FileText size={16} color="#0A0A0C" />
            <Text className="text-foreground font-semibold">{t('sell.requirementsTitle')}</Text>
          </View>
          <View className="gap-2.5">
            {requirements.map((r) => (
              <View key={r} className="flex-row items-start gap-2.5">
                <BadgeCheck size={16} color="#10b981" style={{ marginTop: 1 }} />
                <Text className="text-foreground flex-1 text-sm leading-5">{r}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Steps */}
        <View>
          <Text className="text-foreground mb-3 px-1 text-base font-bold">
            {t('sell.stepsTitle')}
          </Text>
          <View className="gap-3">
            {steps.map((s, i) => (
              <View key={s.title} className="flex-row items-start gap-3">
                <View className="bg-primary h-8 w-8 items-center justify-center rounded-full">
                  <Text className="text-sm font-black text-white">{i + 1}</Text>
                </View>
                <View className="min-w-0 flex-1 pt-0.5">
                  <Text className="text-foreground text-sm font-semibold">{s.title}</Text>
                  <Text className="text-muted-foreground text-xs leading-4">{s.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* CTAs */}
        <View className="gap-2.5 pt-1">
          <Button
            size="lg"
            fullWidth
            onPress={() => openWeb('/register?role=seller')}
            rightIcon={<ExternalLink size={16} color="#fff" />}
          >
            {t('sell.ctaApply')}
          </Button>
          <Button variant="outline" size="lg" fullWidth onPress={() => openWeb('/seller-guide')}>
            {t('sell.ctaGuide')}
          </Button>
          <Text className="text-muted-foreground mt-1 text-center text-[11px] leading-4">
            {t('sell.webNote')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
