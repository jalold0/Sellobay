import { Link } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>E-Commerce</Text>
      <Text style={styles.subtitle}>Mijoz mobil ilovasi (Expo)</Text>
      <Link href="/catalog" style={styles.link}>Katalogga o&apos;tish →</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#666' },
  link: { fontSize: 16, color: '#2563eb', marginTop: 16 },
});
