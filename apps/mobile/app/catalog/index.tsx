import { FlatList, Text, View, StyleSheet } from 'react-native';

const ITEMS = Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: `Mahsulot #${i + 1}` }));

export default function CatalogScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Katalog</Text>
      <FlatList
        data={ITEMS}
        keyExtractor={(it) => it.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.thumb} />
            <Text>{item.name}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 48 },
  title: { fontSize: 24, fontWeight: 'bold', paddingHorizontal: 16 },
  card: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f3f4f6' },
  thumb: { aspectRatio: 1, backgroundColor: '#e5e7eb', borderRadius: 6, marginBottom: 8 },
});
