import { Stack } from 'expo-router';
import { AuthProvider } from '@repo/api';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="property/[id]" options={{ headerShown: true, title: 'Property Details' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
