import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import Card from '../components/Card';
import TransactionItem from '../components/TransactionItem';
import { useAuth } from '../context/AuthContext';
import { accountsApi, reportsApi, transactionsApi } from '../services/api';
import { formatCurrency, monthStart, today } from '../utils/format';
import { colors, spacing } from '../utils/theme';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [accounts, setAccounts]     = useState([]);
  const [summary, setSummary]       = useState(null);
  const [recent, setRecent]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [accRes, sumRes, txRes] = await Promise.all([
        accountsApi.list(),
        reportsApi.summary({ from: monthStart(), to: today() }),
        transactionsApi.list({ limit: 5 }),
      ]);
      setAccounts(accRes.data.accounts);
      setSummary(sumRes.data);
      setRecent(txRes.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Reload on tab focus
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const cur = user?.currency || 'USD';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Greeting */}
      <Text style={styles.greeting}>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</Text>

      {/* Total Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>{formatCurrency(summary?.total_balance ?? 0, cur)}</Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Income</Text>
            <Text style={[styles.balanceItemValue, { color: colors.success }]}>
              +{formatCurrency(summary?.total_income ?? 0, cur)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Expenses</Text>
            <Text style={[styles.balanceItemValue, { color: colors.danger }]}>
              -{formatCurrency(summary?.total_expenses ?? 0, cur)}
            </Text>
          </View>
        </View>
      </View>

      {/* Accounts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Accounts</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Accounts')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsRow}>
        {accounts.map((acc) => (
          <View key={acc.id} style={[styles.accountCard, { backgroundColor: acc.color }]}>
            <Text style={styles.accountIcon}>{accountIcon(acc.type)}</Text>
            <Text style={styles.accountName}>{acc.name}</Text>
            <Text style={styles.accountBalance}>{formatCurrency(acc.balance, cur)}</Text>
            <Text style={styles.accountType}>{acc.type}</Text>
          </View>
        ))}
        <TouchableOpacity
          style={styles.addAccountCard}
          onPress={() => navigation.navigate('Accounts')}
        >
          <Text style={styles.addAccountPlus}>+</Text>
          <Text style={styles.addAccountText}>Add Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Savings rate */}
      {summary && (
        <Card style={styles.savingsCard}>
          <View style={styles.savingsRow}>
            <View>
              <Text style={styles.savingsLabel}>Savings Rate</Text>
              <Text style={styles.savingsRate}>{summary.savings_rate}%</Text>
            </View>
            <View style={styles.savingsBar}>
              <View style={[styles.savingsFill, { width: `${Math.min(summary.savings_rate, 100)}%` }]} />
            </View>
          </View>
        </Card>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {[
          { label: 'Add Income',  icon: '⬆️', type: 'income' },
          { label: 'Add Expense', icon: '⬇️', type: 'expense' },
          { label: 'Reports',     icon: '📊', screen: 'Reports' },
          { label: 'AI Chat',     icon: '🤖', screen: 'Assistant' },
        ].map((a) => (
          <TouchableOpacity
            key={a.label}
            style={styles.qaBtn}
            onPress={() => {
              if (a.screen) navigation.navigate(a.screen);
              else navigation.navigate('AddTransaction', { type: a.type });
            }}
          >
            <Text style={styles.qaIcon}>{a.icon}</Text>
            <Text style={styles.qaLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Transactions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.txCard}>
        {recent.length === 0 ? (
          <View style={styles.emptyTx}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No transactions yet.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddTransaction', {})}>
              <Text style={styles.emptyLink}>Add your first one →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recent.map((tx, i) => (
            <React.Fragment key={tx.id}>
              <TransactionItem item={tx} currency={cur}
                onPress={(t) => navigation.navigate('TransactionDetail', { transaction: t })} />
              {i < recent.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function accountIcon(type) {
  return { checking: '🏦', savings: '💰', credit: '💳', cash: '💵', investment: '📈' }[type] || '💰';
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.bg },
  content:      { padding: spacing.lg, paddingBottom: 40 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  greeting:     { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },

  // Balance card
  balanceCard:  { backgroundColor: colors.primary, borderRadius: 20, padding: spacing.lg, marginBottom: spacing.lg },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  balanceAmount:{ fontSize: 36, fontWeight: '800', color: '#fff' },
  balanceRow:   { flexDirection: 'row', marginTop: spacing.md },
  balanceItem:  { flex: 1, alignItems: 'center' },
  balanceDivider:{ width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  balanceItemLabel:{ fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  balanceItemValue:{ fontSize: 16, fontWeight: '600', color: '#fff', marginTop: 2 },

  // Sections
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  seeAll:       { fontSize: 14, color: colors.primary, fontWeight: '500' },

  // Account cards
  accountsRow:  { marginBottom: spacing.lg },
  accountCard:  { width: 150, borderRadius: 16, padding: spacing.md, marginRight: spacing.sm },
  accountIcon:  { fontSize: 28, marginBottom: spacing.xs },
  accountName:  { fontSize: 14, fontWeight: '600', color: '#fff' },
  accountBalance:{ fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 4 },
  accountType:  { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, textTransform: 'capitalize' },
  addAccountCard:{ width: 100, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  addAccountPlus:{ fontSize: 28, color: colors.textMuted },
  addAccountText:{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4 },

  // Savings
  savingsCard:  { marginBottom: spacing.lg },
  savingsRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  savingsLabel: { fontSize: 13, color: colors.textMuted },
  savingsRate:  { fontSize: 24, fontWeight: '700', color: colors.success },
  savingsBar:   { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' },
  savingsFill:  { height: '100%', backgroundColor: colors.success, borderRadius: 999 },

  // Quick actions
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  qaBtn:        { flex: 1, alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: spacing.sm, marginHorizontal: 4, elevation: 2 },
  qaIcon:       { fontSize: 22, marginBottom: 4 },
  qaLabel:      { fontSize: 11, color: colors.text, fontWeight: '500', textAlign: 'center' },

  // Transactions
  txCard:       { padding: 0, overflow: 'hidden', marginBottom: spacing.lg },
  divider:      { height: 1, backgroundColor: colors.border, marginLeft: 58 },
  emptyTx:      { alignItems: 'center', padding: spacing.xl },
  emptyIcon:    { fontSize: 36, marginBottom: spacing.sm },
  emptyText:    { fontSize: 15, color: colors.textMuted },
  emptyLink:    { fontSize: 15, color: colors.primary, fontWeight: '600', marginTop: spacing.sm },
});
