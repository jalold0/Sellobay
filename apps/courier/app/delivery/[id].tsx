import { useLocalSearchParams } from 'expo-router';
import { Button, Text, View, StyleSheet } from 'react-native';

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yetkazib berish #{id}</Text>
      <Text>Buyurtma haqida ma&apos;lumot, manzil, telefon, mahsulotlar...</Text>
      <View style={styles.actions}>
        <Button title="Olib chiqdim" onPress={() => {}} />
        <Button title="Yetkazib berdim" onPress={() => {}} />
        <Button title="Foto dalil" color="#2563eb" onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: 'bold' },
  actions: { gap: 12, marginTop: 20 },
});
