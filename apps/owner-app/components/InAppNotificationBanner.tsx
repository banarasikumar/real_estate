import React, { useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotification, InAppBannerData } from '../context/NotificationContext';

export interface InAppNotificationBannerProps {
  title?: string;
  body?: string;
  propertyTitle?: string;
  avatarUrl?: string;
  onPress?: () => void;
  onDismiss?: () => void;
  visible?: boolean;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({
  title: propTitle,
  body: propBody,
  propertyTitle: propPropertyTitle,
  avatarUrl: propAvatarUrl,
  onPress: propOnPress,
  onDismiss: propOnDismiss,
  visible: propVisible,
}) => {
  const insets = useSafeAreaInsets();
  const { currentBanner, dismissBanner } = useNotification();

  // Determine active banner data (from props if explicitly passed, otherwise from context)
  const isControlled = propVisible !== undefined;
  const isVisible = isControlled ? propVisible : Boolean(currentBanner);

  const bannerData: InAppBannerData | null = isControlled
    ? {
        id: 'prop-banner',
        title: propTitle || '',
        body: propBody || '',
        propertyTitle: propPropertyTitle,
        avatarUrl: propAvatarUrl,
        onPress: propOnPress,
      }
    : currentBanner;

  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (propOnDismiss) {
        propOnDismiss();
      } else {
        dismissBanner();
      }
    });
  }, [dismissBanner, propOnDismiss, translateY, opacity]);

  const handlePress = useCallback(() => {
    dismiss();
    if (propOnPress) {
      propOnPress();
    } else if (bannerData?.onPress) {
      bannerData.onPress();
    }
  }, [bannerData, dismiss, propOnPress]);

  // Swipe up to dismiss PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Detect upwards drag
        return gestureState.dy < -5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -20 || gestureState.vy < -0.5) {
          dismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 15,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (isVisible && bannerData) {
      translateY.setValue(-150);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 16,
          stiffness: 140,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 4 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        dismiss();
      }, 4000);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [isVisible, bannerData?.id, dismiss, opacity, translateY]);

  if (!isVisible || !bannerData) {
    return null;
  }

  const initial = bannerData.title ? bannerData.title.trim().charAt(0).toUpperCase() : 'L';
  const topOffset = Math.max(insets.top, 12) + 6;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: topOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.92}
        testID="in-app-notification-banner"
      >
        {/* Avatar or Initial Icon */}
        <View style={styles.avatarContainer}>
          {bannerData.avatarUrl ? (
            <Image source={{ uri: bannerData.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.initialBadge}>
              <Text style={styles.initialText}>{initial}</Text>
            </View>
          )}
        </View>

        {/* Content Details */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {bannerData.title || 'New Message'}
            </Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>NOW</Text>
            </View>
          </View>

          {bannerData.propertyTitle ? (
            <Text style={styles.propertyTitle} numberOfLines={1}>
              {bannerData.propertyTitle}
            </Text>
          ) : null}

          <Text style={styles.body} numberOfLines={2}>
            {bannerData.body}
          </Text>
        </View>

        {/* Dismiss / Chevron hint */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color="#94a3b8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default InAppNotificationBanner;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  initialBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    color: '#059669',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    marginLeft: 6,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  propertyTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    marginLeft: 2,
  },
});
