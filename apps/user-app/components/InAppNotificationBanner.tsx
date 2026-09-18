import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotification, BannerParams } from '../context/NotificationContext';

export type { BannerParams };

export interface InAppNotificationBannerProps {
  bannerData?: BannerParams | null;
  visible?: boolean;
  onDismiss?: () => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = (props) => {
  const context = useNotification();
  const insets = useSafeAreaInsets();

  const bannerData = props.bannerData !== undefined ? props.bannerData : context.bannerData;
  const isVisible = props.visible !== undefined ? props.visible : context.bannerVisible;
  const handleDismiss = props.onDismiss || context.dismissBanner;

  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible && bannerData) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -150,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, bannerData, translateY, opacity]);

  if (!bannerData && !isVisible) {
    return null;
  }

  const handleTap = () => {
    if (bannerData?.onPress) {
      bannerData.onPress();
    }
    handleDismiss();
  };

  const senderInitial = (bannerData?.title || 'O').charAt(0).toUpperCase();
  const themeColor = bannerData?.iconColor || '#e11d48';

  return (
    <Animated.View
      pointerEvents={isVisible ? 'box-none' : 'none'}
      style={[
        styles.overlay,
        {
          top: insets.top + (Platform.OS === 'ios' ? 6 : 10),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.92}
        onPress={handleTap}
      >
        {/* Left Accent Stripe */}
        <View style={[styles.accentStripe, { backgroundColor: themeColor }]} />

        {/* Avatar, Squircle Icon, or Initials */}
        <View style={styles.avatarContainer}>
          {bannerData?.senderAvatar ? (
            <Image source={{ uri: bannerData.senderAvatar }} style={styles.avatar} />
          ) : bannerData?.iconName ? (
            <View
              style={[
                styles.iconSquircle,
                bannerData.iconBg ? { backgroundColor: bannerData.iconBg } : null,
                bannerData.iconColor ? { borderColor: `${bannerData.iconColor}33` } : null,
              ]}
            >
              <Ionicons
                name={bannerData.iconName as any}
                size={22}
                color={themeColor}
              />
            </View>
          ) : (
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>{senderInitial}</Text>
            </View>
          )}
        </View>

        {/* Content Details */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {bannerData?.title || 'New Message'}
            </Text>
            <View
              style={[
                styles.badge,
                bannerData?.iconBg ? { backgroundColor: bannerData.iconBg } : null,
                bannerData?.iconColor ? { borderColor: `${bannerData.iconColor}33` } : null,
              ]}
            >
              <Text style={[styles.badgeText, { color: themeColor }]}>
                {bannerData?.badgeText || (bannerData?.iconName ? 'Notice' : 'Reply')}
              </Text>
            </View>
          </View>

          {bannerData?.propertyTitle ? (
            <View style={styles.propertyRow}>
              <Ionicons
                name="business-outline"
                size={11}
                color={themeColor}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.propertyTitle, { color: themeColor }]} numberOfLines={1}>
                {bannerData.propertyTitle}
              </Text>
            </View>
          ) : null}

          <Text style={styles.body} numberOfLines={1}>
            {bannerData?.body}
          </Text>
        </View>

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color="#94a3b8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ffe4e6',
    overflow: 'hidden',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#e11d48',
  },
  avatarContainer: {
    marginLeft: 6,
    marginRight: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f1f5f9',
  },
  initialsCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  iconSquircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  initialsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e11d48',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  titleRow: {
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
    marginRight: 6,
  },
  badge: {
    backgroundColor: '#fff1f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e11d48',
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  propertyTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e11d48',
    flex: 1,
  },
  body: {
    fontSize: 13,
    color: '#475569',
  },
  closeButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
});

export default InAppNotificationBanner;
