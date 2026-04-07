import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { transactionsApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import { colors, spacing } from '../utils/theme';

export default function TransactionDetailScreen({ route, navigation }) {
  const { transaction: tx } = route.params;
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const isIncome = tx.type === 'income';
  const amountColor = isIncome ? colors.success : colors.danger;

  async function handleDelete() {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This will reverse the balance change.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await transactionsApi.delete(tx.id);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to delete');
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Amount hero */}
      <View style={[styles.hero, { backgroundColor: isIncome ? colors.success : colors.danger }]}>
        <Text style={styles.heroLabel}>{isIncome ? 'Income' : 'Expense'}</Text>
        <Text style={styles.heroAmount}>{isIncome ? '+' : '-'}{formatCurrency(tx.amount, user?.currency)}</Text>
        <Text style={styles.heroDate}>{formatDate(tx.date)}</Text>
      </View>

      {/* Details */}
      <Card style={styles.detailCard}>
        <DetailRow label="Description" value={tx.description || '—'} />
        {tx.note ? <DetailRow label="Note" value={tx.note} /> : null}
        <DetailRow label="Account" value={tx.account_name} />
        <DetailRow label="Category"
          value={tx.category_name ? `${tx.category_icon} ${tx.category_name}` : '—'} />
        <DetailRow label="Date" value={formatDate(tx.date)} />
        <DetailRow label="Type" value={tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} />
      </Card>

      <Button
        title="Delete Transaction"
        variant="danger"
        onPress={handleDelete}
        loading={deleting}
        style={styles.deleteBtn}
      />
    </ScrollView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.bg },
  content:      { paddingBottom: 60 },
  hero:         { padding: spacing.xl, alignItems: 'center' },
  heroLabel:    { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  heroAmount:   { fontSize: 40, fontWeight: '800', color: '#fff', marginTop: 4 },
  heroDate:     { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  detailCard:   { margin: spacing.md },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel:     { fontSize: 15, color: colors.textMuted },
  rowValue:     { fontSize: 15, color: colors.text, fontWeight: '500', flex: 1, textAlign: 'right', marginLeft: spacing.sm },
  deleteBtn:    { marginHorizontal: spacing.md },
});
