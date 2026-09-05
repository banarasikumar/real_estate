import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface MessageStatusTicksProps {
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  deliveredAt?: string | null;
  isRead?: boolean;
  onRetry?: () => void;
}

export const MessageStatusTicks: React.FC<MessageStatusTicksProps> = ({
  status,
  deliveredAt,
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
        <Ionicons name="alert-circle" size={14} color="#ef4444" />
      </TouchableOpacity>
    );
  }

  // If sending: Clock icon
  if (status === 'sending') {
    return (
      <View style={styles.container} testID="message-status-sending">
        <Ionicons name="time-outline" size={13} color="#94a3b8" />
      </View>
    );
  }

  // If delivered: Double Gray Ticks
  if (deliveredAt || status === 'delivered') {
    return (
      <View style={styles.container} testID="message-status-delivered">
        <Ionicons name="checkmark-done" size={15} color="#94a3b8" />
      </View>
    );
  }

  // Else (status === 'sent' or default): Single Gray Tick
  return (
    <View style={styles.container} testID="message-status-sent">
      <Ionicons name="checkmark" size={14} color="#94a3b8" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MessageStatusTicks;
