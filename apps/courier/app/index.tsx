import { Link } from 'expo-router';
import { Text, View, StyleSheet, FlatList } from 'react-native';

const DELIVERIES = [
  { id: '1', orderNumber: 'ORD-2026-00001234', status: 'ASSIGNED', address: "Toshkent, Yunusobod" },
  { id: '2', orderNumber: 'ORD-2026-00001235', status: 'IN_TRANSIT', address: "Toshkent, Chilonzor" },
];

export default function DeliveriesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bugungi yetkazib berishlar</Text>
      <FlatList
        data={DELIVERIES}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ gap: 12, padding: 16 }}
        renderItem={({ item }) => (
          <Link href={`/delivery/${item.id}`} style={styles.card}>
            <View>
              <Text style={styles.no}>{item.orderNumber}</Text>
              <Text style={styles.status}>{item.status}</Text>
              <Text>{item.address}</Text>
            </View>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', padding: 16 },
  card: { padding: 16, borderRadius: 8, backgroundColor: '#f3f4f6' },
  no: { fontWeight: 'bold', marginBottom: 4 },
  status: { color: '#2563eb', marginBottom: 4 },
});
