import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
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
  isRead = false,
  color = 'rgba(255, 255, 255, 0.95)',
  onRetry,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 120,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [status, isRead, deliveredAt]);

  // If failed: red alert circle with TouchableOpacity calling onRetry
  if (status === 'failed') {
    return (
      <TouchableOpacity
        onPress={onRetry}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.container}
        testID="message-status-failed"
      >
        <Ionicons name="alert-circle" size={15} color="#f87171" />
      </TouchableOpacity>
    );
  }

  // If sending: Clock icon (high-contrast crisp white)
  if (status === 'sending') {
    return (
      <View style={styles.container} testID="message-status-sending">
        <Ionicons name="time-outline" size={13} color={color} />
      </View>
    );
  }

  // If read: Blue Double Ticks with pop animation
  if (isRead) {
    return (
      <Animated.View
        style={[
          styles.container,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        ]}
        testID="message-status-read"
      >
        <Ionicons name="checkmark-done" size={16} color="#38bdf8" />
      </Animated.View>
    );
  }

  // If delivered: Double Ticks
  if (deliveredAt || status === 'delivered') {
    return (
      <Animated.View
        style={[
          styles.container,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        ]}
        testID="message-status-delivered"
      >
        <Ionicons name="checkmark-done" size={16} color={color} />
      </Animated.View>
    );
  }

  // Else (status === 'sent' or default): Single Tick
  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}
      testID="message-status-sent"
    >
      <Ionicons name="checkmark" size={15} color={color} />
    </Animated.View>
  );
};

export default MessageStatusTicks;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
});

