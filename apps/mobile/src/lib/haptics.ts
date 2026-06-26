// Sellobay mobil — haptik javob (premium "his"). Web'da no-op.
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS !== 'web';

export const haptics = {
  /** Yengil tap — savatga qo'shish, toggle */
  light: () => {
    if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  /** O'rta — muhim tugma */
  medium: () => {
    if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  /** Tanlash — chip/segment/tab almashish */
  select: () => {
    if (enabled) void Haptics.selectionAsync();
  },
  /** Muvaffaqiyat — buyurtma, qo'shildi */
  success: () => {
    if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  /** Ogohlantirish — validatsiya xatosi */
  warning: () => {
    if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
  /** Xato */
  error: () => {
    if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
};
