import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/cn';
import type { Discipline } from '@/lib/types';
import { Animated, cardEntering, screenEntering } from '@/lib/motion';
import { Text } from './Text';

const disciplineStyles: Record<Discipline, string> = {
  swim: 'bg-swim/25 text-swim',
  bike: 'bg-bike/25 text-bike',
  run: 'bg-run/25 text-run',
  brick: 'bg-brick/25 text-brick',
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
  /** Fade/slide content in on mount. Default true. */
  animate?: boolean;
};

export function Screen({
  className,
  safeTop = true,
  safeBottom = false,
  animate = true,
  style,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padStyle = {
    paddingTop: safeTop ? Math.max(insets.top, 8) + 8 : 16,
    paddingBottom: safeBottom ? Math.max(insets.bottom, 8) : 0,
  };

  if (!animate) {
    return (
      <View
        className={cn('flex-1 bg-background px-5', className)}
        style={[padStyle, style]}
        {...props}
      />
    );
  }

  return (
    <Animated.View
      entering={screenEntering}
      className={cn('flex-1 bg-background px-5', className)}
      style={[padStyle, style]}
      {...props}
    />
  );
}

type CardProps = ViewProps & {
  className?: string;
  /** Stagger delay in ms for list enter animations. */
  enterDelay?: number;
  /** Disable enter animation. Default false (animates). */
  animate?: boolean;
};

export function Card({ className, enterDelay = 0, animate = true, style, ...props }: CardProps) {
  const shared = cn(
    'rounded-2xl border border-border bg-card p-4 shadow-sm shadow-primary/10',
    className
  );

  if (!animate) {
    return <View className={shared} style={style} {...props} />;
  }

  return (
    <Animated.View
      entering={cardEntering(enterDelay)}
      className={shared}
      style={style}
      {...props}
    />
  );
}
