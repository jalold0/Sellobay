import { ChevronDown, Mail, MessageCircle, Phone, HelpCircle } from 'lucide-react-native';
import * as React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '../src/lib/haptics';
import { useLocale, type Locale } from '../src/store/locale';
import { Header } from '../src/ui/header';

// Aloqa kanallari
const SUPPORT_PHONE = '+998712007070';
const SUPPORT_TELEGRAM = 'https://t.me/sellobay_support';
const SUPPORT_EMAIL = 'support@sellobay.uz';

interface Faq {
  q: string;
  a: string;
}

const CONTENT: Record<Locale, { title: string; subtitle: string; faqTitle: string; faqs: Faq[] }> =
  {
    uz: {
      title: 'Yordam markazi',
      subtitle: '24/7 qoʻllab-quvvatlash xizmati',
      faqTitle: 'Tez-tez soʻraladigan savollar',
      faqs: [
        {
          q: 'Buyurtmamni qanday kuzataman?',
          a: 'Profil → Buyurtmalarim boʻlimidan har bir buyurtma holatini real vaqtda koʻrishingiz mumkin.',
        },
        {
          q: 'Yetkazib berish qancha vaqt oladi?',
          a: 'Toshkent boʻylab 1–2 kun, viloyatlarga 2–5 kun. Express yetkazib berish bir kun ichida.',
        },
        {
          q: 'Toʻlovni qanday amalga oshiraman?',
          a: 'Click, Payme, Uzcard/Humo yoki yetkazib berishda naqd pul orqali toʻlashingiz mumkin.',
        },
        {
          q: 'Mahsulotni qaytarish mumkinmi?',
          a: 'Ha, mahsulotni olganingizdan keyin 14 kun ichida qaytarishingiz mumkin (ochilmagan holatda).',
        },
        {
          q: 'Sello Coins nima?',
          a: 'Har xaridda coin toʻplaysiz va keyingi xaridlarda chegirma sifatida ishlatasiz. 1 coin = 1 soʻm.',
        },
      ],
    },
    ru: {
      title: 'Центр помощи',
      subtitle: 'Поддержка 24/7',
      faqTitle: 'Часто задаваемые вопросы',
      faqs: [
        {
          q: 'Как отследить заказ?',
          a: 'В разделе Профиль → Мои заказы вы видите статус каждого заказа в реальном времени.',
        },
        {
          q: 'Сколько занимает доставка?',
          a: 'По Ташкенту 1–2 дня, по регионам 2–5 дней. Express — в течение дня.',
        },
        { q: 'Как оплатить заказ?', a: 'Click, Payme, Uzcard/Humo или наличными при доставке.' },
        {
          q: 'Можно ли вернуть товар?',
          a: 'Да, в течение 14 дней после получения (в неоткрытом виде).',
        },
        {
          q: 'Что такое Sello Coins?',
          a: 'Вы копите коины с каждой покупки и используете их как скидку. 1 коин = 1 сум.',
        },
      ],
    },
    en: {
      title: 'Help Center',
      subtitle: '24/7 customer support',
      faqTitle: 'Frequently asked questions',
      faqs: [
        {
          q: 'How do I track my order?',
          a: 'Go to Profile → My Orders to see each order status in real time.',
        },
        {
          q: 'How long does delivery take?',
          a: '1–2 days in Tashkent, 2–5 days to regions. Express delivers within a day.',
        },
        { q: 'How do I pay?', a: 'Click, Payme, Uzcard/Humo, or cash on delivery.' },
        { q: 'Can I return a product?', a: 'Yes, within 14 days of receipt (unopened).' },
        {
          q: 'What are Sello Coins?',
          a: 'You earn coins on every purchase and redeem them as a discount. 1 coin = 1 som.',
        },
      ],
    },
  };

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const locale = useLocale((s) => s.locale);
  const c = CONTENT[locale] ?? CONTENT.uz;
  const [open, setOpen] = React.useState<number | null>(0);

  const openLink = (url: string) => {
    haptics.light();
    void Linking.openURL(url).catch(() => {});
  };

  return (
    <View className="bg-background flex-1">
      <Header title={c.title} showBack fallbackHref="/(tabs)/profile" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
      >
        {/* Hero */}
        <View className="bg-primary items-center gap-1 rounded-3xl p-6">
          <HelpCircle size={36} color="#fff" />
          <Text className="text-lg font-bold text-white">{c.title}</Text>
          <Text className="text-xs text-white/80">{c.subtitle}</Text>
        </View>

        {/* Aloqa kanallari */}
        <View className="flex-row gap-2">
          <ContactCard
            icon={<MessageCircle size={20} color="#229ED9" />}
            label="Telegram"
            onPress={() => openLink(SUPPORT_TELEGRAM)}
          />
          <ContactCard
            icon={<Phone size={20} color="#10b981" />}
            label="Telefon"
            onPress={() => openLink(`tel:${SUPPORT_PHONE}`)}
          />
          <ContactCard
            icon={<Mail size={20} color="#6d28d9" />}
            label="Email"
            onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`)}
          />
        </View>

        {/* FAQ */}
        <Text className="text-foreground px-1 text-sm font-bold">{c.faqTitle}</Text>
        <View className="border-border bg-card overflow-hidden rounded-2xl border">
          {c.faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <View key={i} className={i < c.faqs.length - 1 ? 'border-border border-b' : ''}>
                <Pressable
                  onPress={() => setOpen(isOpen ? null : i)}
                  className="active:bg-muted flex-row items-center gap-3 px-4 py-3.5"
                >
                  <Text className="text-foreground flex-1 text-sm font-medium">{f.q}</Text>
                  <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
                    <ChevronDown size={16} color="#94a3b8" />
                  </View>
                </Pressable>
                {isOpen ? (
                  <Text className="text-muted-foreground px-4 pb-4 text-sm leading-5">{f.a}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function ContactCard({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="border-border bg-card active:bg-muted flex-1 items-center gap-1.5 rounded-2xl border py-4"
    >
      {icon}
      <Text className="text-foreground text-xs font-semibold">{label}</Text>
    </Pressable>
  );
}
