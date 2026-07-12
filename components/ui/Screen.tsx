import { View, type ViewProps } from 'react-native';
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

export function Screen({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn('flex-1 bg-background px-5 pt-4', className)} {...props} />;
}

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn('rounded-2xl border border-border bg-card p-4', className)}
      {...props}
    />
  );
}
