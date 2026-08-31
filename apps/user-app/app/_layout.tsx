import { Stack } from 'expo-router';
import { AuthProvider } from '@repo/api';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="property/[id]" options={{ headerShown: true, title: 'Property Details' }} />
      </Stack>
    </AuthProvider>
  );
}
