import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/cn';
import type { Discipline } from '@/lib/types';
import { Text } from './Text';

const disciplineStyles: Record<Discipline, string> = {
  swim: 'bg-swim/15 text-swim',
  bike: 'bg-bike/15 text-bike',
  run: 'bg-run/15 text-run',
  brick: 'bg-brick/15 text-brick',
  rest: 'bg-muted text-muted-foreground',
};

export function DisciplineBadge({ discipline }: { discipline: Discipline }) {
  return (
    <View className={cn('self-start rounded-md px-2 py-1', disciplineStyles[discipline])}>
      <Text className={cn('text-xs font-semibold uppercase', disciplineStyles[discipline])}>
        {discipline}
      </Text>
    </View>
  );
}

type ScreenProps = ViewProps & {
  className?: string;
  /** When false, skip top safe-area inset. Default true. */
  safeTop?: boolean;
  /** Include bottom home-indicator inset. Default false (tab bar screens). */
  safeBottom?: boolean;
};

export function Screen({
  className,
  safeTop = true,
  safeBottom = false,
  style,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={cn('flex-1 bg-background px-5', className)}
      style={[
        {
          paddingTop: safeTop ? Math.max(insets.top, 8) + 8 : 16,
          paddingBottom: safeBottom ? Math.max(insets.bottom, 8) : 0,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn('rounded-2xl border border-border bg-card p-4', className)}
      {...props}
    />
  );
}
