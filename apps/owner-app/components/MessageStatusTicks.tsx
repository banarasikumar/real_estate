import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface MessageStatusTicksProps {
  status?: 'sending' | 'sent' | 'read' | 'failed';
  isRead?: boolean;
  onRetry?: () => void;
}

export const MessageStatusTicks: React.FC<MessageStatusTicksProps> = ({
  status,
  isRead,
  onRetry,
}) => {
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

  if (status === 'sending') {
    return (
      <View style={styles.container} testID="message-status-sending">
        <Ionicons name="checkmark" size={14} color="#94a3b8" />
      </View>
    );
  }

  const isDoubleBlue = isRead === true || status === 'read';
  const tickColor = isDoubleBlue ? '#0284c7' : '#94a3b8';

  return (
    <View style={styles.container} testID={isDoubleBlue ? 'message-status-read' : 'message-status-sent'}>
      <Ionicons name="checkmark" size={14} color={tickColor} />
      <Ionicons name="checkmark" size={14} color={tickColor} style={styles.overlappingTick} />
    </View>
  );
};

export default MessageStatusTicks;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  overlappingTick: {
    marginLeft: -8,
  },
});
