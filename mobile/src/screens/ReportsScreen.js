import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Dimensions, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { reportsApi } from '../services/api';
import { formatCurrency, monthLabel, monthStart, today } from '../utils/format';
import { colors, spacing } from '../utils/theme';

const SCREEN_W = Dimensions.get('window').width;
const BAR_MAX_HEIGHT = 120;

export default function ReportsScreen() {
  const { user } = useAuth();
  const cur = user?.currency || 'USD';

  const [tab, setTab]             = useState('overview'); // overview | categories | monthly
  const [summary, setSummary]     = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [monthly, setMonthly]     = useState([]);
  const [budgets, setBudgets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const from = monthStart();
    const to   = today();
    const year = new Date().getFullYear();
    try {
      const [sumRes, catRes, monRes, budRes] = await Promise.all([
        reportsApi.summary({ from, to }),
        reportsApi.byCategory({ from, to, type: 'expense' }),
        reportsApi.monthly({ year }),
        reportsApi.budgets(),
      ]);
      setSummary(sumRes.data);
      setByCategory(catRes.data);
      setMonthly(monRes.data);
      setBudgets(budRes.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const maxMonthlyVal = Math.max(...monthly.map(m => Math.max(m.income, m.expenses)), 1);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Tab bar */}
      <View style={styles.tabs}>
        {[['overview','Overview'],['categories','Categories'],['monthly','Monthly']].map(([v, l]) => (
          <TouchableOpacity key={v} style={[styles.tab, tab === v && styles.tabActive]} onPress={() => setTab(v)}>
            <Text style={[styles.tabText, tab === v && styles.tabTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && summary && (
        <>
          {/* KPI row */}
          <View style={styles.kpiRow}>
            {[
              { label: 'Income',   value: formatCurrency(summary.total_income,   cur), color: colors.success },
              { label: 'Expenses', value: formatCurrency(summary.total_expenses, cur), color: colors.danger  },
              { label: 'Net',      value: formatCurrency(summary.net_savings,    cur), color: summary.net_savings >= 0 ? colors.success : colors.danger },
            ].map((k) => (
              <Card key={k.label} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
              </Card>
            ))}
          </View>

          {/* Savings rate */}
          <Card style={styles.savingsCard}>
            <Text style={styles.sectionTitle}>Savings Rate This Month</Text>
            <View style={styles.savingsRow}>
              <Text style={styles.savingsRate}>{summary.savings_rate}%</Text>
              <View style={styles.savingsBar}>
                <View style={[styles.savingsFill, {
                  width: `${Math.min(Math.max(summary.savings_rate, 0), 100)}%`,
                  backgroundColor: summary.savings_rate >= 20 ? colors.success : summary.savings_rate >= 10 ? colors.warning : colors.danger,
                }]} />
              </View>
            </View>
            <Text style={styles.savingsTip}>
              {summary.savings_rate >= 20 ? '🎉 Excellent savings! Keep it up!'
                : summary.savings_rate >= 10 ? '👍 Good progress. Aim for 20%.'
                : '💡 Try to reduce expenses to improve savings.'}
            </Text>
          </Card>

          {/* Budgets */}
          {budgets.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Budget Tracker</Text>
              {budgets.map((b) => (
                <Card key={b.id} style={styles.budgetCard}>
                  <View style={styles.budgetHeader}>
                    <Text style={styles.budgetIcon}>{b.category_icon}</Text>
                    <Text style={styles.budgetName}>{b.category_name}</Text>
                    <Text style={styles.budgetAmount}>{formatCurrency(b.spent, cur)} / {formatCurrency(b.amount, cur)}</Text>
                  </View>
                  <View style={styles.budgetBar}>
                    <View style={[styles.budgetFill, {
                      width: `${Math.min(b.percentage, 100)}%`,
                      backgroundColor: b.percentage > 100 ? colors.danger : b.percentage > 80 ? colors.warning : colors.success,
                    }]} />
                  </View>
                  <Text style={[styles.budgetRemaining, { color: b.remaining < 0 ? colors.danger : colors.textMuted }]}>
                    {b.remaining >= 0 ? `${formatCurrency(b.remaining, cur)} remaining` : `${formatCurrency(-b.remaining, cur)} over budget`}
                  </Text>
                </Card>
              ))}
            </>
          )}
        </>
      )}

      {/* ── CATEGORIES ── */}
      {tab === 'categories' && (
        <>
          <Text style={styles.sectionTitle}>Expenses by Category (This Month)</Text>
          {byCategory.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyIcon}>📊</Text><Text style={styles.emptyText}>No expense data yet</Text></View>
          ) : byCategory.map((cat) => (
            <Card key={cat.category_id} style={styles.catCard}>
              <View style={styles.catRow}>
                <View style={[styles.catIconBg, { backgroundColor: cat.color + '20' }]}>
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                </View>
                <View style={styles.catInfo}>
                  <View style={styles.catNameRow}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Text style={styles.catAmount}>{formatCurrency(cat.total, cur)}</Text>
                  </View>
                  <View style={styles.catBar}>
                    <View style={[styles.catFill, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
                  </View>
                  <Text style={styles.catPct}>{cat.percentage}% · {cat.count} transactions</Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* ── MONTHLY ── */}
      {tab === 'monthly' && (
        <>
          <Text style={styles.sectionTitle}>Income vs Expenses — {new Date().getFullYear()}</Text>
          <Card style={styles.chartCard}>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.success }]} /><Text style={styles.legendText}>Income</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.danger }]} /><Text style={styles.legendText}>Expenses</Text></View>
            </View>
            <View style={styles.barChart}>
              {monthly.map((m) => (
                <View key={m.month} style={styles.barGroup}>
                  <View style={styles.bars}>
                    <View style={[styles.bar, { height: (m.income / maxMonthlyVal) * BAR_MAX_HEIGHT, backgroundColor: colors.success }]} />
                    <View style={[styles.bar, { height: (m.expenses / maxMonthlyVal) * BAR_MAX_HEIGHT, backgroundColor: colors.danger }]} />
                  </View>
                  <Text style={styles.barLabel}>{monthLabel(m.month)}</Text>
                </View>
              ))}
            </View>
          </Card>

          {monthly.map((m) => m.income > 0 || m.expenses > 0 ? (
            <Card key={m.month} style={styles.monthRow}>
              <Text style={styles.monthLabel}>{monthLabel(m.month)}</Text>
              <View style={styles.monthValues}>
                <Text style={[styles.monthVal, { color: colors.success }]}>+{formatCurrency(m.income, cur)}</Text>
                <Text style={[styles.monthVal, { color: colors.danger }]}>-{formatCurrency(m.expenses, cur)}</Text>
                <Text style={[styles.monthNet, { color: m.net >= 0 ? colors.success : colors.danger }]}>
                  {m.net >= 0 ? '+' : ''}{formatCurrency(m.net, cur)}
                </Text>
              </View>
            </Card>
          ) : null)}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.bg },
  content:      { padding: spacing.md, paddingBottom: 60 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs:         { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 4, marginBottom: spacing.md },
  tab:          { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive:    { backgroundColor: colors.primary },
  tabText:      { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  tabTextActive:{ color: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  kpiRow:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  kpiCard:      { flex: 1, padding: spacing.sm },
  kpiLabel:     { fontSize: 12, color: colors.textMuted },
  kpiValue:     { fontSize: 14, fontWeight: '700', marginTop: 2 },
  savingsCard:  { marginBottom: spacing.sm },
  savingsRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  savingsRate:  { fontSize: 28, fontWeight: '800', color: colors.text, width: 72 },
  savingsBar:   { flex: 1, height: 10, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' },
  savingsFill:  { height: '100%', borderRadius: 999 },
  savingsTip:   { fontSize: 13, color: colors.textMuted },
  budgetCard:   { marginBottom: spacing.sm },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  budgetIcon:   { fontSize: 20, marginRight: spacing.xs },
  budgetName:   { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text },
  budgetAmount: { fontSize: 13, color: colors.textMuted },
  budgetBar:    { height: 8, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden', marginBottom: 4 },
  budgetFill:   { height: '100%', borderRadius: 999 },
  budgetRemaining:{ fontSize: 12 },
  catCard:      { marginBottom: spacing.xs },
  catRow:       { flexDirection: 'row', alignItems: 'center' },
  catIconBg:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  catIcon:      { fontSize: 20 },
  catInfo:      { flex: 1 },
  catNameRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName:      { fontSize: 15, fontWeight: '500', color: colors.text },
  catAmount:    { fontSize: 15, fontWeight: '600', color: colors.text },
  catBar:       { height: 6, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden', marginBottom: 2 },
  catFill:      { height: '100%', borderRadius: 999 },
  catPct:       { fontSize: 11, color: colors.textMuted },
  chartCard:    { marginBottom: spacing.md },
  chartLegend:  { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:    { width: 10, height: 10, borderRadius: 5 },
  legendText:   { fontSize: 13, color: colors.textMuted },
  barChart:     { flexDirection: 'row', alignItems: 'flex-end', height: BAR_MAX_HEIGHT + 24 },
  barGroup:     { flex: 1, alignItems: 'center' },
  bars:         { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar:          { width: 8, borderRadius: 4, minHeight: 2 },
  barLabel:     { fontSize: 9, color: colors.textMuted, marginTop: 4 },
  monthRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  monthLabel:   { fontSize: 14, fontWeight: '600', color: colors.text, width: 36 },
  monthValues:  { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  monthVal:     { fontSize: 13, fontWeight: '500' },
  monthNet:     { fontSize: 13, fontWeight: '700' },
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 40, marginBottom: spacing.sm },
  emptyText:    { fontSize: 15, color: colors.textMuted },
});
