import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import { AuthProvider } from '@repo/api';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationProvider } from '../context/NotificationContext';
import { InAppNotificationBanner } from '../components/InAppNotificationBanner';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="property/[id]" options={{ headerShown: true, title: 'Property Details' }} />
            </Stack>
            <InAppNotificationBanner />
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

