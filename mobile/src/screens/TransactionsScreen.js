import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import TransactionItem from '../components/TransactionItem';
import { useAuth } from '../context/AuthContext';
import { transactionsApi } from '../services/api';
import { colors, spacing } from '../utils/theme';

const FILTERS = [
  { label: 'All',      value: '' },
  { label: 'Income',   value: 'income' },
  { label: 'Expenses', value: 'expense' },
];

export default function TransactionsScreen({ navigation }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch]             = useState('');
  const [filter, setFilter]             = useState('');
  const [page, setPage]                 = useState(0);
  const [loading, setLoading]           = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [hasMore, setHasMore]           = useState(true);
  const LIMIT = 30;

  const load = useCallback(async (reset = false) => {
    if (loading && !reset) return;
    setLoading(true);
    const offset = reset ? 0 : page * LIMIT;
    try {
      const { data } = await transactionsApi.list({
        limit: LIMIT,
        offset,
        type: filter || undefined,
        search: search || undefined,
      });
      if (reset) {
        setTransactions(data);
        setPage(1);
      } else {
        setTransactions((prev) => [...prev, ...data]);
        setPage((p) => p + 1);
      }
      setHasMore(data.length === LIMIT);
    } finally {
      setLoading(false);
    }
  }, [filter, search, page, loading]);

  useEffect(() => { load(true); }, [filter, search]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => load(true));
    return unsub;
  }, [navigation, filter, search]);

  async function onRefresh() {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={colors.textLight}
          value={search}
          onChangeText={(t) => { setSearch(t); setPage(0); }}
        />
      </View>

      {/* Type filter */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.chip, filter === f.value && styles.chipActive]}
            onPress={() => { setFilter(f.value); setPage(0); }}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddTransaction', {})}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={transactions}
        keyExtractor={(t) => String(t.id)}
        renderItem={({ item, index }) => (
          <>
            <TransactionItem
              item={item}
              currency={user?.currency}
              onPress={(t) => navigation.navigate('TransactionDetail', { transaction: t })}
            />
            {index < transactions.length - 1 && <View style={styles.divider} />}
          </>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => hasMore && load()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading && !refreshing ? <ActivityIndicator style={styles.loader} color={colors.primary} /> : null}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: colors.bg },
  searchRow:     { padding: spacing.md, paddingBottom: 0 },
  searchInput:   {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filters:       { flexDirection: 'row', padding: spacing.md, gap: 8, alignItems: 'center' },
  chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:      { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  chipTextActive:{ color: '#fff' },
  addBtn:        { marginLeft: 'auto', backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
  addBtnText:    { color: '#fff', fontSize: 14, fontWeight: '600' },
  list:          { paddingBottom: 80, backgroundColor: colors.card, marginTop: 0 },
  divider:       { height: 1, backgroundColor: colors.border, marginLeft: 58 },
  loader:        { paddingVertical: spacing.lg },
  empty:         { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:     { fontSize: 40, marginBottom: spacing.sm },
  emptyText:     { fontSize: 15, color: colors.textMuted },
});
