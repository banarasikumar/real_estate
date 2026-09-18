import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import { AuthProvider } from '@repo/api';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationProvider } from '../context/NotificationContext';
import { InAppNotificationBanner } from '../components/InAppNotificationBanner';

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="edit-property/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="complex/[id]" options={{ headerShown: false }} />
          </Stack>
          <InAppNotificationBanner />
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
