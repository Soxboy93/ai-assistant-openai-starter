import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../utils/theme';
import { formatCurrency, formatShortDate } from '../utils/format';

export default function TransactionItem({ item, currency = 'USD', onPress }) {
  const isIncome = item.type === 'income';
  const amountColor = isIncome ? colors.success : colors.danger;
  const amountPrefix = isIncome ? '+' : '-';

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress?.(item)} activeOpacity={0.7}>
      <View style={[styles.iconBg, { backgroundColor: item.category_color || colors.primary + '20' }]}>
        <Text style={styles.icon}>{item.category_icon || '📦'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {item.description || item.category_name || 'Transaction'}
        </Text>
        <Text style={styles.sub}>
          {item.account_name} · {formatShortDate(item.date)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {amountPrefix}{formatCurrency(item.amount, currency)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  iconBg: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '500', color: colors.text },
  sub:   { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  amount:{ fontSize: 15, fontWeight: '600' },
});
