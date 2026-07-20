import { Pressable, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import type { AthleteSession } from '@/lib/types';
import { logLabel } from '@/lib/plans';
import { Card, DisciplineBadge } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

export function SessionRow({
  session,
  locked,
  onPress,
  index = 0,
}: {
  session: AthleteSession;
  locked?: boolean;
  onPress?: () => void;
  /** Used to stagger enter animation in lists. */
  index?: number;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card className={locked ? 'opacity-50' : undefined} enterDelay={Math.min(index, 8) * 55}>
        <View className="mb-2 flex-row items-center justify-between">
          <DisciplineBadge discipline={session.discipline} />
          <Text variant="caption">
            {format(parseISO(session.scheduledDate), 'EEE MMM d')} · {session.durationMinutes} min
          </Text>
        </View>
        <Text className="mb-1 text-lg font-semibold">
          {locked ? 'Pro session' : session.title}
        </Text>
        <Text variant="caption" numberOfLines={2}>
          {locked
            ? 'Unlock the full plan to see this session.'
            : session.whyItMatters}
        </Text>
        {session.logStatus ? (
          <Text className="mt-2 text-sm text-primary">{logLabel(session.logStatus)}</Text>
        ) : null}
        {session.simplified ? (
          <Text className="mt-1 text-xs font-medium text-accent">Catch-up simplified</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}
