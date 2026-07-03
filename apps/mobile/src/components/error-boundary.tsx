import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Ilova darajasidagi xato chegarasi. Render vaqtidagi kutilmagan xatolar
 * butun ilovani "oq ekran"ga tushirmasin — foydalanuvchiga tiklash tugmasi.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // TODO: production'da Sentry/analytics'ga yuborish
    if (__DEV__) console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View className="bg-background flex-1 items-center justify-center px-8">
          <Text className="text-foreground text-lg font-bold">Nimadir noto‘g‘ri ketdi</Text>
          <Text className="text-muted-foreground mt-2 text-center text-sm">
            Ilovada kutilmagan xatolik yuz berdi. Qayta urinib ko‘ring.
          </Text>
          <Pressable
            onPress={this.reset}
            className="bg-primary mt-5 rounded-full px-6 py-3 active:opacity-85"
          >
            <Text className="font-semibold text-white">Qayta urinish</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
