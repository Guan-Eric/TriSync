import * as React from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { cn } from '@/lib/cn';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';

type ButtonProps = PressableProps & {
  title: string;
  variant?: Variant;
  className?: string;
  textClassName?: string;
};

const variants: Record<Variant, { container: string; text: string }> = {
  default: {
    container: 'bg-primary active:opacity-90',
    text: 'text-primary-foreground',
  },
  secondary: {
    container: 'bg-muted active:bg-primary/15',
    text: 'text-primary',
  },
  outline: {
    container: 'border-2 border-primary/40 bg-card active:bg-primary/10',
    text: 'text-primary',
  },
  ghost: {
    container: 'active:bg-primary/10',
    text: 'text-primary',
  },
  destructive: {
    container: 'bg-destructive active:opacity-90',
    text: 'text-white',
  },
};

export function Button({
  title,
  variant = 'default',
  className,
  textClassName,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const styles = variants[variant];
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      className={cn(
        'h-12 items-center justify-center rounded-xl px-5',
        styles.container,
        disabled && 'opacity-50',
        className
      )}
      style={animatedStyle}
      onPressIn={(e) => {
        scale.value = withSpring(0.97, { damping: 16, stiffness: 320 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 14, stiffness: 280 });
        onPressOut?.(e);
      }}
      {...props}
    >
      <Text
        className={cn('text-base', styles.text, textClassName)}
        style={{ fontFamily: 'Barlow_600SemiBold' }}
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
}
