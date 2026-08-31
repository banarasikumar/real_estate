import { View, Text, StyleSheet } from 'react-native';

export default function PropertiesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Properties</Text>
      <Text>View and edit your properties</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 }
});
