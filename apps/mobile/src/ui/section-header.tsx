import { Link } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

interface Props {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function SectionHeader({ title, description, actionLabel, actionHref }: Props) {
  return (
    <View className="flex-row items-end justify-between px-4">
      <View className="flex-1">
        <Text className="text-foreground text-lg font-bold">{title}</Text>
        {description ? <Text className="text-muted-foreground text-xs">{description}</Text> : null}
      </View>
      {actionLabel && actionHref ? (
        <Link href={actionHref as never} asChild>
          <Pressable className="flex-row items-center gap-0.5">
            <Text className="text-primary text-xs">{actionLabel}</Text>
            <ChevronRight size={12} color="#0A0A0C" />
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}
