import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Linking,
  SafeAreaView,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, supabase, signInWithEmail, signUpWithEmail } from '@repo/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
            Alert.alert('Signed Out', 'You have been successfully logged out.');
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
          }
        },
      },
    ]);
  };

  const handleSwitchToOwnerApp = async () => {
    Alert.alert(
      'Switch to Owner Portal',
      'Are you a property owner or real estate broker? Open the Owner App to create and manage listings, review inquiries, and monitor property analytics.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Owner App',
          onPress: () => {
            // Attempt deep link or notify
            Linking.openURL('exp://127.0.0.1:8081').catch(() => {
              Alert.alert(
                'Owner App',
                'To launch the Owner App, start the owner-app package in your development environment (apps/owner-app).'
              );
            });
          },
        },
      ]
    );
  };

  const handleAuthSubmit = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }
    setAuthLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUpWithEmail(emailInput.trim(), passwordInput.trim());
        if (error) throw error;
        Alert.alert('Success', 'Account created! Please check your email to confirm registration.');
      } else {
        const { error } = await signInWithEmail(emailInput.trim(), passwordInput.trim());
        if (error) throw error;
        Alert.alert('Welcome Back!', 'You have successfully signed in.');
      }
      setAuthModalVisible(false);
      setEmailInput('');
      setPasswordInput('');
    } catch (err: any) {
      Alert.alert('Authentication Failed', err?.message || 'An error occurred during authentication.');
    } finally {
      setAuthLoading(false);
    }
  };

  const displayName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Guest Explorer');
  const displayEmail = user?.email || 'Sign in to sync your saved homes & enquiries';
  const initial = (displayName[0] || 'U').toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Header Profile Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
            {user && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={12} color="#ffffff" />
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {displayEmail}
            </Text>
            {user ? (
              <View style={styles.memberPill}>
                <Ionicons name="shield-checkmark" size={12} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.memberPillText}>Verified Buyer / Renter</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.signInPill}
                onPress={() => {
                  setIsSignUp(false);
                  setAuthModalVisible(true);
                }}
              >
                <Text style={styles.signInPillText}>Log In or Sign Up</Text>
                <Ionicons name="arrow-forward" size={12} color="#ffffff" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Switch to Owner App Banner Card */}
        <View style={styles.ownerBannerCard}>
          <View style={styles.ownerBannerContent}>
            <View style={styles.ownerIconCircle}>
              <Ionicons name="business" size={22} color="#e11d48" />
            </View>
            <View style={styles.ownerTextCol}>
              <Text style={styles.ownerBannerTitle}>Listing a Property?</Text>
              <Text style={styles.ownerBannerSubtitle}>
                Switch to the Owner App to publish homes, manage leads & track views.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.switchOwnerButton}
            onPress={handleSwitchToOwnerApp}
            activeOpacity={0.8}
          >
            <Text style={styles.switchOwnerButtonText}>Switch to Owner Portal</Text>
            <Ionicons name="swap-horizontal" size={16} color="#e11d48" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* Section: Activity & Features */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Activity</Text>
          <View style={styles.menuGroup}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(tabs)/saved')}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#fff1f2' }]}>
                <Ionicons name="heart" size={18} color="#e11d48" />
              </View>
              <Text style={styles.menuItemLabel}>Saved Homes</Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(tabs)/enquiries')}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="home" size={18} color="#2563eb" />
              </View>
              <Text style={styles.menuItemLabel}>My Submitted Enquiries</Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(tabs)/messages')}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="chatbubbles" size={18} color="#16a34a" />
              </View>
              <Text style={styles.menuItemLabel}>Messages with Agents</Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Preferences & Notifications</Text>
          <View style={styles.menuGroup}>
            <View style={styles.menuItem}>
              <View style={[styles.menuIconBox, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="notifications" size={18} color="#d97706" />
              </View>
              <Text style={styles.menuItemLabel}>Push Notifications</Text>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: '#cbd5e1', true: '#fecdd3' }}
                thumbColor={pushNotifications ? '#e11d48' : '#f8fafc'}
              />
            </View>

            <View style={styles.menuDivider} />

            <View style={styles.menuItem}>
              <View style={[styles.menuIconBox, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons name="pricetag" size={18} color="#9333ea" />
              </View>
              <Text style={styles.menuItemLabel}>Price Drop & New Listing Alerts</Text>
              <Switch
                value={priceAlerts}
                onValueChange={setPriceAlerts}
                trackColor={{ false: '#cbd5e1', true: '#fecdd3' }}
                thumbColor={priceAlerts ? '#e11d48' : '#f8fafc'}
              />
            </View>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert('Currency & Region', 'Current: USD ($) - United States')}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="globe-outline" size={18} color="#475569" />
              </View>
              <Text style={styles.menuItemLabel}>Currency & Region</Text>
              <Text style={styles.menuValueLabel}>USD ($)</Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Support & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Support & Legal</Text>
          <View style={styles.menuGroup}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert('Help Center', 'Our 24/7 support team is available at support@realestate.com')}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="help-circle-outline" size={18} color="#475569" />
              </View>
              <Text style={styles.menuItemLabel}>Help Center & FAQ</Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert('Privacy Policy', 'Your privacy and data are fully protected with bank-grade encryption.')}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="shield-outline" size={18} color="#475569" />
              </View>
              <Text style={styles.menuItemLabel}>Privacy Policy & Terms</Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Auth Action Button (Sign In / Sign Out) */}
        <View style={styles.authSection}>
          {user ? (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#e11d48" style={{ marginRight: 8 }} />
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginFullButton}
              onPress={() => {
                setIsSignUp(false);
                setAuthModalVisible(true);
              }}
            >
              <Ionicons name="log-in-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.loginFullButtonText}>Log In to Your Account</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.versionText}>Real Estate App v1.0.0 (Expo MVP)</Text>
      </ScrollView>

      {/* Auth Modal (Login / Sign Up) */}
      <Modal
        visible={authModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAuthModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isSignUp ? 'Create an Account' : 'Welcome Back'}</Text>
            <TouchableOpacity onPress={() => setAuthModalVisible(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalSubtitle}>
              {isSignUp
                ? 'Sign up to track enquiries, save favorite homes, and message premier agents.'
                : 'Sign in to access your saved properties and active conversation threads.'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder="name@example.com"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
                value={emailInput}
                onChangeText={setEmailInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={passwordInput}
                onChangeText={setPasswordInput}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, authLoading && { opacity: 0.7 }]}
              onPress={handleAuthSubmit}
              disabled={authLoading}
            >
              <Text style={styles.submitButtonText}>
                {authLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleAuthMode}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.toggleAuthText}>
                {isSignUp
                  ? 'Already have an account? Log In'
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10b981',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  memberPillText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
  },
  signInPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  signInPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  ownerBannerCard: {
    backgroundColor: '#fff1f2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecdd3',
    marginBottom: 20,
  },
  ownerBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ownerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ownerTextCol: {
    flex: 1,
  },
  ownerBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9f1239',
    marginBottom: 2,
  },
  ownerBannerSubtitle: {
    fontSize: 12,
    color: '#881337',
    lineHeight: 17,
  },
  switchOwnerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  switchOwnerButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e11d48',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  menuValueLabel: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 6,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 62,
  },
  authSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e11d48',
  },
  loginFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e11d48',
    paddingVertical: 14,
    borderRadius: 12,
  },
  loginFullButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  submitButton: {
    backgroundColor: '#e11d48',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  toggleAuthMode: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleAuthText: {
    color: '#e11d48',
    fontSize: 14,
    fontWeight: '600',
  },
});
