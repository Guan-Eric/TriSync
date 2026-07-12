import { Modal, View } from 'react-native';
import { Button } from './ui/Button';
import { Text } from './ui/Text';
import { Card } from './ui/Screen';

export function CatchUpSheet({
  visible,
  missedCount,
  onApply,
  onDismiss,
}: {
  visible: boolean;
  missedCount: number;
  onApply: () => void;
  onDismiss: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <Card className="rounded-b-none rounded-t-3xl p-6">
          <Text variant="label" className="mb-2">
            Adaptive catch-up
          </Text>
          <Text variant="title" className="mb-2">
            Rough week. Let&apos;s rebalance.
          </Text>
          <Text variant="caption" className="mb-6">
            You missed {missedCount} sessions this week. We&apos;ll simplify the next few workouts
            so you stay consistent — not behind. This is not a full re-plan.
          </Text>
          <Button title="Simplify next sessions" onPress={onApply} className="mb-3" />
          <Button title="Not now" variant="ghost" onPress={onDismiss} />
        </Card>
      </View>
    </Modal>
  );
}
