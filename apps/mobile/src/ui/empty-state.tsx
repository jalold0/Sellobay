import { Text, View } from 'react-native';

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-6 py-12">
      {icon ? (
        <View className="bg-crimson-chip h-16 w-16 items-center justify-center rounded-full">
          {icon}
        </View>
      ) : null}
      <Text className="text-foreground text-center font-serif text-lg">{title}</Text>
      {description ? (
        <Text className="text-muted-foreground max-w-xs text-center text-sm">{description}</Text>
      ) : null}
      {action ? <View className="mt-2 w-full">{action}</View> : null}
    </View>
  );
}
