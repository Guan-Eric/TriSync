import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { cn } from '@/lib/cn';

type Props = TextProps & {
  className?: string;
  variant?: 'body' | 'title' | 'display' | 'caption' | 'label';
};

const map = {
  body: 'text-base text-foreground',
  title: 'text-2xl text-foreground',
  display: 'text-5xl text-foreground',
  caption: 'text-sm text-muted-foreground',
  label: 'text-xs uppercase tracking-widest text-muted-foreground',
};

const fontStyle: Record<NonNullable<Props['variant']>, TextStyle> = {
  body: { fontFamily: 'Barlow_400Regular' },
  title: { fontFamily: 'Barlow_700Bold' },
  display: { fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  caption: { fontFamily: 'Barlow_400Regular' },
  label: { fontFamily: 'Barlow_600SemiBold', letterSpacing: 1.5 },
};

export function Text({ className, variant = 'body', style, ...props }: Props) {
  return (
    <RNText
      className={cn(map[variant], className)}
      style={[fontStyle[variant], style]}
      {...props}
    />
  );
}
