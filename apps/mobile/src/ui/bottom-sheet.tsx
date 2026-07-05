import * as React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Balandlikni cheklash kerak bo'lsa (filter/return sheet uchun)
  maxHeightPct?: number;
}

// Pastdan chiquvchi modal (dizayn: overlay rgba(10,10,12,0.5), yuqori burchak 28px,
// grabber chiziq). Filter/return sheet uchun maxHeightPct bilan skroll qilinadi.
export function BottomSheet({ visible, onClose, children, maxHeightPct }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        <Pressable
          onPress={onClose}
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(10,10,12,0.5)' }}
        />
        <View
          className="bg-white"
          style={{
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: Math.max(insets.bottom, 20) + 4,
            maxHeight: maxHeightPct ? `${maxHeightPct}%` : undefined,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 40,
            shadowOffset: { width: 0, height: -16 },
            elevation: 24,
          }}
        >
          <View className="items-center pt-3">
            <View
              className="h-[5px] w-[38px] rounded-full"
              style={{ backgroundColor: '#E0DEDA' }}
            />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
