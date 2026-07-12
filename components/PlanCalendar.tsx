import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, type LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { FullWindowOverlay } from 'react-native-screens';
import { addDays, format, formatISO, parseISO } from 'date-fns';
import { router } from 'expo-router';
import type { AthleteSession } from '@/lib/types';
import { Card } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

type DayRect = { dateKey: string; x: number; y: number; width: number; height: number };

type PlanCalendarProps = {
  sessions: AthleteSession[];
  isPro: boolean;
  onReschedule: (sessionId: string, scheduledDate: string) => Promise<void>;
  onDraggingChange?: (dragging: boolean) => void;
};

const GHOST_WIDTH = 168;
const GHOST_HEIGHT = 52;

function DragOverlay({ children }: { children: ReactNode }) {
  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{children}</FullWindowOverlay>;
  }
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {children}
    </View>
  );
}

function sessionChipLabel(session: AthleteSession, locked: boolean) {
  if (locked) return 'Pro session';
  if (session.discipline === 'rest') return 'Rest';
  return session.title;
}

/** Enrollment start = earliest (scheduledDate - (weekNumber-1)*7). Matches materializeSessions. */
function inferPlanStartDate(sessions: AthleteSession[]) {
  const candidates = sessions.map((s) =>
    formatISO(addDays(parseISO(s.scheduledDate), -(s.weekNumber - 1) * 7), {
      representation: 'date',
    })
  );
  return candidates.sort()[0];
}

export function PlanCalendar({
  sessions,
  isPro,
  onReschedule,
  onDraggingChange,
}: PlanCalendarProps) {
  const dayViews = useRef<Map<string, View>>(new Map());
  const dayRects = useRef<Map<string, DayRect>>(new Map());
  const draggingIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragVisible = useSharedValue(0);

  const weeks = useMemo(() => {
    if (!sessions.length) return [];
    const planStart = inferPlanStartDate(sessions);
    const byWeek = new Map<number, AthleteSession[]>();
    for (const s of sessions) {
      const list = byWeek.get(s.weekNumber) ?? [];
      list.push(s);
      byWeek.set(s.weekNumber, list);
    }
    return Array.from(byWeek.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([weekNumber, weekSessions]) => {
        const weekStart = addDays(parseISO(planStart), (weekNumber - 1) * 7);
        const days = Array.from({ length: 7 }, (_, i) => {
          const date = addDays(weekStart, i);
          const key = formatISO(date, { representation: 'date' });
          return {
            key,
            date,
            sessions: weekSessions
              .filter((s) => s.scheduledDate === key)
              .sort((a, b) => a.discipline.localeCompare(b.discipline)),
          };
        });
        return { weekNumber, days };
      });
  }, [sessions]);

  const weekNumberByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const week of weeks) {
      for (const day of week.days) map.set(day.key, week.weekNumber);
    }
    return map;
  }, [weeks]);

  const draggingSession = draggingId
    ? sessions.find((s) => s.id === draggingId) ?? null
    : null;

  const hitTestDate = useCallback((pageX: number, pageY: number) => {
    return new Promise<string | null>((resolve) => {
      const entries = Array.from(dayViews.current.entries());
      if (!entries.length) {
        resolve(null);
        return;
      }
      let pending = entries.length;
      let found: string | null = null;
      for (const [dateKey, view] of entries) {
        view.measureInWindow((x, y, width, height) => {
          dayRects.current.set(dateKey, { dateKey, x, y, width, height });
          if (
            pageX >= x &&
            pageX <= x + width &&
            pageY >= y &&
            pageY <= y + height
          ) {
            found = dateKey;
          }
          pending -= 1;
          if (pending === 0) resolve(found);
        });
      }
    });
  }, []);

  const startDrag = useCallback(
    (session: AthleteSession, absX: number, absY: number) => {
      if (session.logStatus != null) {
        Alert.alert('Already logged', 'Logged sessions stay on their date as history.');
        return;
      }
      if (!isPro && session.weekNumber > 1) {
        Alert.alert('Pro plan', 'Unlock Pro to rearrange sessions beyond week 1.');
        return;
      }

      dragX.value = absX - GHOST_WIDTH / 2;
      dragY.value = absY - GHOST_HEIGHT / 2;
      dragVisible.value = withTiming(1, { duration: 80 });
      draggingIdRef.current = session.id;
      setDraggingId(session.id);
      onDraggingChange?.(true);
    },
    [isPro, onDraggingChange, dragX, dragY, dragVisible]
  );

  const moveDrag = useCallback(
    (pageX: number, pageY: number) => {
      void hitTestDate(pageX, pageY).then(setHoverDate);
    },
    [hitTestDate]
  );

  const endDrag = useCallback(
    async (pageX: number, pageY: number) => {
      const sessionId = draggingIdRef.current;
      draggingIdRef.current = null;
      setDraggingId(null);
      setHoverDate(null);
      dragVisible.value = withTiming(0, { duration: 100 });
      onDraggingChange?.(false);

      if (!sessionId || pageX < 0) return;
      const target = await hitTestDate(pageX, pageY);
      if (!target) return;

      const session = sessions.find((s) => s.id === sessionId);
      if (!session || session.scheduledDate === target) return;
      if (session.logStatus != null) return;

      if (!isPro) {
        const targetWeek = weekNumberByDate.get(target) ?? 99;
        if (targetWeek > 1) {
          Alert.alert('Pro plan', 'Free preview keeps rearranging inside week 1.');
          return;
        }
      }

      try {
        setBusy(true);
        await onReschedule(sessionId, target);
      } catch (e: unknown) {
        Alert.alert('Could not move', e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setBusy(false);
      }
    },
    [
      hitTestDate,
      sessions,
      isPro,
      weekNumberByDate,
      onReschedule,
      onDraggingChange,
      dragVisible,
    ]
  );

  const ghostStyle = useAnimatedStyle(() => ({
    opacity: dragVisible.value,
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      { scale: 1.04 },
    ],
  }));

  if (!weeks.length) {
    return (
      <Card>
        <Text variant="caption">No sessions on the calendar yet.</Text>
      </Card>
    );
  }

  return (
    <View className="gap-4">
      <Text variant="caption">
        Long-press a session, then drag it onto another day. Logged sessions stay put.
      </Text>

      {weeks.map(({ weekNumber, days }) => {
        const weekLocked = !isPro && weekNumber > 1;
        return (
          <Card key={weekNumber} className={weekLocked ? 'opacity-70' : undefined}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-semibold">Week {weekNumber}</Text>
              {weekLocked ? (
                <Button title="Unlock" variant="ghost" onPress={() => router.push('/paywall')} />
              ) : null}
            </View>

            <View className="gap-2">
              {days.map((day) => {
                const isHover = hoverDate === day.key;
                return (
                  <View
                    key={day.key}
                    ref={(node) => {
                      if (node) dayViews.current.set(day.key, node);
                      else dayViews.current.delete(day.key);
                    }}
                    onLayout={(e: LayoutChangeEvent) => {
                      e.target.measureInWindow((x, y, width, height) => {
                        dayRects.current.set(day.key, {
                          dateKey: day.key,
                          x,
                          y,
                          width,
                          height,
                        });
                      });
                    }}
                    className={`rounded-xl border px-3 py-2 ${
                      isHover ? 'border-primary bg-primary/10' : 'border-border bg-background'
                    }`}
                    style={{ minHeight: 56 }}
                  >
                    <Text variant="label" className="mb-1">
                      {format(day.date, 'EEE MMM d')}
                    </Text>
                    {day.sessions.length === 0 ? (
                      <Text variant="caption">—</Text>
                    ) : (
                      <View className="gap-1.5">
                        {day.sessions.map((session) => {
                          const locked = !isPro && session.weekNumber > 1;
                          const isDragging = draggingId === session.id;
                          return (
                            <DraggableChip
                              key={session.id}
                              session={session}
                              locked={locked}
                              hidden={isDragging}
                              disabled={busy || session.logStatus != null || locked}
                              dragX={dragX}
                              dragY={dragY}
                              dragVisible={dragVisible}
                              onTap={() => router.push(`/log/${session.id}`)}
                              onDragStart={(x, y) => startDrag(session, x, y)}
                              onDragMove={moveDrag}
                              onDragEnd={endDrag}
                            />
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </Card>
        );
      })}

      <DragOverlay>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.ghost, ghostStyle]}>
            {draggingSession ? (
              <View className="rounded-lg border-2 border-primary bg-card px-2 py-2 shadow-lg">
                <Text className="text-sm font-semibold" numberOfLines={1}>
                  {sessionChipLabel(
                    draggingSession,
                    !isPro && draggingSession.weekNumber > 1
                  )}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {draggingSession.discipline}
                  {draggingSession.durationMinutes
                    ? ` · ${draggingSession.durationMinutes} min`
                    : ''}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        </View>
      </DragOverlay>
    </View>
  );
}

function DraggableChip({
  session,
  locked,
  hidden,
  disabled,
  dragX,
  dragY,
  dragVisible,
  onTap,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  session: AthleteSession;
  locked: boolean;
  hidden: boolean;
  disabled: boolean;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  dragVisible: SharedValue<number>;
  onTap: () => void;
  onDragStart: (pageX: number, pageY: number) => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: (pageX: number, pageY: number) => void;
}) {
  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .enabled(!disabled)
    .onStart((e) => {
      dragX.value = e.absoluteX - GHOST_WIDTH / 2;
      dragY.value = e.absoluteY - GHOST_HEIGHT / 2;
      dragVisible.value = 1;
      runOnJS(onDragStart)(e.absoluteX, e.absoluteY);
    })
    .onUpdate((e) => {
      dragX.value = e.absoluteX - GHOST_WIDTH / 2;
      dragY.value = e.absoluteY - GHOST_HEIGHT / 2;
      runOnJS(onDragMove)(e.absoluteX, e.absoluteY);
    })
    .onEnd((e) => {
      runOnJS(onDragEnd)(e.absoluteX, e.absoluteY);
    })
    .onFinalize((_e, success) => {
      if (!success) {
        runOnJS(onDragEnd)(-1, -1);
      }
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onTap)();
  });

  const composed = disabled ? tap : Gesture.Exclusive(pan, tap);

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={{ opacity: hidden ? 0.25 : 1 }}>
        <View
          className={`rounded-lg border px-2 py-2 ${
            session.logStatus ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
          }`}
        >
          <Text className="text-sm font-semibold" numberOfLines={1}>
            {sessionChipLabel(session, locked)}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {session.discipline}
            {session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}
            {session.logStatus ? ' · logged' : ''}
            {!disabled && !session.logStatus ? ' · hold to move' : ''}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: GHOST_WIDTH,
  },
});
