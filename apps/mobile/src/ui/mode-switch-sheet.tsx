import { Check, Globe, MoreHorizontal, Store } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { type ShopMode, useMode } from '../store/mode';

import { BottomSheet } from './bottom-sheet';
import { Gradient } from './gradient';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ModeSwitchSheet({ visible, onClose }: Props) {
  const mode = useMode((s) => s.mode);
  const setMode = useMode((s) => s.setMode);

  const pick = (m: ShopMode) => {
    haptics.success();
    setMode(m);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="px-[18px] pt-4">
        <Text className="text-foreground font-serif text-xl">Qaysi olamga kirasiz?</Text>
        <Text className="text-muted-foreground mt-1 text-xs leading-5">
          Xarid rejimini tanlang — istalgan vaqtda almashtirasiz.
        </Text>

        <View className="mt-[18px] gap-[11px]">
          {/* LOKAL */}
          <Pressable
            onPress={() => pick('local')}
            className="flex-row items-center gap-3 rounded-2xl border-[1.5px] p-[14px]"
            style={{
              borderColor: mode === 'local' ? '#531625' : '#EAEAEC',
              backgroundColor: mode === 'local' ? '#FDF3F5' : '#fff',
            }}
          >
            <Gradient
              colors={['#531625', '#762237']}
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Store size={22} color="#E5C77A" />
            </Gradient>
            <View className="flex-1">
              <Text className="text-foreground font-serif text-[17px]">Sellobay Lokal</Text>
              <Text className="text-muted-foreground mt-1 text-xs">
                O'zbekiston sotuvchilari · uygacha yetkazish
              </Text>
            </View>
            {mode === 'local' ? (
              <View className="bg-primary h-6 w-6 items-center justify-center rounded-full">
                <Check size={14} color="#fff" strokeWidth={2.5} />
              </View>
            ) : null}
          </Pressable>

          {/* GLOBAL */}
          <Pressable
            onPress={() => pick('global')}
            className="flex-row items-center gap-3 rounded-2xl border-[1.5px] p-[14px]"
            style={{
              borderColor: mode === 'global' ? '#531625' : '#EAEAEC',
              backgroundColor: mode === 'global' ? '#FDF3F5' : '#fff',
            }}
          >
            <Gradient
              colors={['#16161A', '#0A0A0C']}
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Globe size={24} color="#E5C77A" />
            </Gradient>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-foreground font-serif text-[17px]">Sellobay Global</Text>
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: '#FDF3F5' }}>
                  <Text className="text-primary text-[9px] font-extrabold">Yangi</Text>
                </View>
              </View>
              <Text className="text-muted-foreground mt-1 text-xs">
                Xitoy · Turkiya · Koreya · so'mda narx
              </Text>
            </View>
            {mode === 'global' ? (
              <View className="bg-primary h-6 w-6 items-center justify-center rounded-full">
                <Check size={14} color="#fff" strokeWidth={2.5} />
              </View>
            ) : null}
          </Pressable>

          {/* COMING SOON */}
          <View
            className="flex-row items-center gap-3 rounded-2xl border-[1.5px] border-dashed p-[14px] opacity-75"
            style={{ borderColor: '#DAD8D4' }}
          >
            <View
              className="h-11 w-11 items-center justify-center rounded-[13px]"
              style={{ backgroundColor: '#F1F1F3' }}
            >
              <MoreHorizontal size={22} color="#9a9aa2" />
            </View>
            <View className="flex-1">
              <Text className="text-muted-foreground text-sm font-bold">
                Food · Travel · B2B ulgurji
              </Text>
              <Text className="text-[11px] text-neutral-300">
                Kelajakda kengaytiriladigan olamlar
              </Text>
            </View>
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: '#F1F1F3' }}>
              <Text className="text-[10px] font-bold text-neutral-300">Tez orada</Text>
            </View>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
