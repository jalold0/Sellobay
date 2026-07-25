// Buyurtmani tahrirlash modali (bottom sheet) — manzil maydonlari va
// yetkazish usulini o'zgartiradi; saqlashda updateOrder chaqiradi.
import { Check, X } from 'lucide-react-native';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { updateOrder, type OrderDetail, type UpdateOrderInput } from '../../lib/api';
import { haptics } from '../../lib/haptics';
import { toast } from '../../store/toast';
import { Button } from '../../ui/button';
import { cn } from '../../ui/cn';
import { Input } from '../../ui/input';

import { DELIVERY_OPTIONS } from './order-detail-i18n';

export function OrderEditModal({
  order,
  tr,
  onClose,
  onSaved,
}: {
  order: OrderDetail;
  tr: Record<string, string>;
  onClose: () => void;
  onSaved: (o: OrderDetail) => void;
}) {
  const insets = useSafeAreaInsets();
  const a = order.shippingAddress;
  const [form, setForm] = React.useState({
    recipientName: a?.recipientName ?? '',
    phone: a?.phone ?? '',
    city: a?.city ?? '',
    street: a?.street ?? '',
    apartment: a?.apartment ?? '',
  });
  const [method, setMethod] = React.useState<UpdateOrderInput['deliveryMethod']>(
    order.deliveryMethod as UpdateOrderInput['deliveryMethod'],
  );
  const [saving, setSaving] = React.useState(false);

  const onSave = async () => {
    setSaving(true);
    const res = await updateOrder(order.id, {
      recipientName: form.recipientName.trim() || undefined,
      phone: form.phone.trim() || undefined,
      city: form.city.trim() || undefined,
      street: form.street.trim() || undefined,
      apartment: form.apartment.trim() || null,
      deliveryMethod: method,
    });
    setSaving(false);
    if (!res.success || !res.order) {
      haptics.error();
      toast({ title: res.error?.message ?? tr.saved, variant: 'destructive' });
      return;
    }
    onSaved(res.order);
  };

  return (
    <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} style={{ elevation: 10 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable
          className="bg-background gap-3 rounded-t-3xl p-5"
          style={{ paddingBottom: insets.bottom + 20 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-foreground text-lg font-bold">{tr.editTitle}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color="#6B6B73" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
            <View className="gap-3">
              <Input
                label={tr.name}
                value={form.recipientName}
                onChangeText={(v) => setForm({ ...form, recipientName: v })}
              />
              <Input
                label={tr.phone}
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
                keyboardType="phone-pad"
              />
              <Input
                label={tr.city}
                value={form.city}
                onChangeText={(v) => setForm({ ...form, city: v })}
              />
              <Input
                label={tr.street}
                value={form.street}
                onChangeText={(v) => setForm({ ...form, street: v })}
              />
              <Input
                label={tr.apt}
                value={form.apartment}
                onChangeText={(v) => setForm({ ...form, apartment: v })}
              />

              <Text className="text-muted-foreground text-xs font-medium">{tr.delivery}</Text>
              <View className="gap-2">
                {DELIVERY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      haptics.select();
                      setMethod(opt.id);
                    }}
                    className={cn(
                      'flex-row items-center justify-between rounded-xl border-2 p-3',
                      method === opt.id ? 'border-primary bg-primary/5' : 'border-border',
                    )}
                  >
                    <Text className="text-foreground text-sm font-medium">{tr[opt.key]}</Text>
                    {method === opt.id ? <Check size={16} color="#531625" /> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          <Button fullWidth size="lg" loading={saving} onPress={onSave}>
            {tr.save}
          </Button>
        </Pressable>
      </KeyboardAvoidingView>
    </Pressable>
  );
}
