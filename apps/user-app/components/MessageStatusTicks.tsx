import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
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
  // If failed: red alert icon with TouchableOpacity calling onRetry
  if (status === 'failed') {
    return (
      <TouchableOpacity
        onPress={onRetry}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.container}
      >
        <Ionicons name="alert-circle" size={14} color="#ef4444" />
      </TouchableOpacity>
    );
  }

  // If sending: Single Gray Tick
  if (status === 'sending') {
    return (
      <View style={styles.container}>
        <Ionicons name="checkmark" size={14} color="#94a3b8" />
      </View>
    );
  }

  // If read: Double Sky Blue Ticks
  if (isRead === true || status === 'read') {
    return (
      <View style={[styles.container, styles.doubleTickContainer]}>
        <Ionicons name="checkmark" size={14} color="#0284c7" />
        <Ionicons name="checkmark" size={14} color="#0284c7" style={styles.overlappingTick} />
      </View>
    );
  }

  // Else (status === 'sent' or default): Double Gray Ticks
  return (
    <View style={[styles.container, styles.doubleTickContainer]}>
      <Ionicons name="checkmark" size={14} color="#94a3b8" />
      <Ionicons name="checkmark" size={14} color="#94a3b8" style={styles.overlappingTick} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleTickContainer: {
    width: 20,
    position: 'relative',
  },
  overlappingTick: {
    marginLeft: -8,
  },
});

export default MessageStatusTicks;
