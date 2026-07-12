import * as React from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';
import { cn } from '@/lib/cn';

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
    container: 'bg-muted active:opacity-90',
    text: 'text-foreground',
  },
  outline: {
    container: 'border border-border bg-card active:bg-muted',
    text: 'text-foreground',
  },
  ghost: {
    container: 'active:bg-muted',
    text: 'text-foreground',
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
  ...props
}: ButtonProps) {
  const styles = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={cn(
        'h-12 items-center justify-center rounded-xl px-5',
        styles.container,
        disabled && 'opacity-50',
        className
      )}
      {...props}
    >
      <Text
        className={cn('text-base', styles.text, textClassName)}
        style={{ fontFamily: 'Barlow_600SemiBold' }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
