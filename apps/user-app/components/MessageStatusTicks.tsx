import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface MessageStatusTicksProps {
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  deliveredAt?: string | null;
  isRead?: boolean;
  color?: string;
  onRetry?: () => void;
}

export const MessageStatusTicks: React.FC<MessageStatusTicksProps> = ({
  status,
  deliveredAt,
  color = 'rgba(255, 255, 255, 0.95)',
  onRetry,
}) => {
  // If failed: red alert icon with TouchableOpacity calling onRetry
  if (status === 'failed') {
    return (
      <TouchableOpacity
        onPress={onRetry}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.container}
        testID="message-status-failed"
      >
        <Ionicons name="alert-circle" size={15} color="#fca5a5" />
      </TouchableOpacity>
    );
  }

  // If sending: Clock icon (high-contrast crisp white)
  if (status === 'sending') {
    return (
      <View style={styles.container} testID="message-status-sending">
        <Ionicons name="time-outline" size={14} color={color} />
      </View>
    );
  }

  // If delivered: Double High-Contrast Ticks
  if (deliveredAt || status === 'delivered') {
    return (
      <View style={styles.container} testID="message-status-delivered">
        <Ionicons name="checkmark-done" size={16} color={color} />
      </View>
    );
  }

  // Else (status === 'sent' or default): Single High-Contrast Tick
  return (
    <View style={styles.container} testID="message-status-sent">
      <Ionicons name="checkmark" size={15} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
});

export default MessageStatusTicks;
