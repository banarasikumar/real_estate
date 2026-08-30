import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Manage Listings</Text>
      <Text style={{ marginTop: 8 }}>Welcome to the Owner Mobile App</Text>
    </View>
  );
}
