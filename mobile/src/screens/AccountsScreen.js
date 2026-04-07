import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, FlatList, Modal, RefreshControl, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { accountsApi } from '../services/api';
import { formatCurrency } from '../utils/format';
import { colors, radius, spacing } from '../utils/theme';

const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'cash', 'investment'];
const ACCOUNT_COLORS = ['#4F46E5','#10B981','#EF4444','#F59E0B','#3B82F6','#8B5CF6','#EC4899','#14B8A6'];
const ACCOUNT_ICONS = { checking: '🏦', savings: '💰', credit: '💳', cash: '💵', investment: '📈' };

export default function AccountsScreen() {
  const { user } = useAuth();
  const [accounts, setAccounts]     = useState([]);
  const [totalBalance, setTotal]    = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ name: '', type: 'checking', balance: '', color: ACCOUNT_COLORS[0] });
  const [errors, setErrors]         = useState({});

  const load = useCallback(async () => {
    const { data } = await accountsApi.list();
    setAccounts(data.accounts);
    setTotal(data.totalBalance);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (form.balance && isNaN(parseFloat(form.balance))) e.balance = 'Must be a number';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    setSaving(true);
    try {
      await accountsApi.create({
        name: form.name.trim(),
        type: form.type,
        balance: parseFloat(form.balance || '0'),
        color: form.color,
      });
      setModal(false);
      setForm({ name: '', type: 'checking', balance: '', color: ACCOUNT_COLORS[0] });
      await load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create account');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(acc) {
    Alert.alert(
      'Delete Account',
      `Delete "${acc.name}"? All its transactions will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await accountsApi.delete(acc.id);
            await load();
          },
        },
      ],
    );
  }

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));

  return (
    <View style={styles.screen}>
      {/* Total balance header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Net Worth</Text>
        <Text style={styles.headerAmount}>{formatCurrency(totalBalance, user?.currency)}</Text>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Card style={styles.accountCard}>
            <View style={[styles.accountAccent, { backgroundColor: item.color }]} />
            <View style={styles.accountBody}>
              <View style={styles.accountRow}>
                <Text style={styles.accountIcon}>{ACCOUNT_ICONS[item.type] || '💰'}</Text>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{item.name}</Text>
                  <Text style={styles.accountType}>{item.type}</Text>
                </View>
                <Text style={[
                  styles.accountBalance,
                  { color: item.balance < 0 ? colors.danger : colors.text },
                ]}>
                  {formatCurrency(item.balance, user?.currency)}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteBtnText}>🗑</Text>
            </TouchableOpacity>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏦</Text>
            <Text style={styles.emptyText}>No accounts yet</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Account Modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Account</Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <Input label="Account Name" value={form.name} onChangeText={set('name')}
            placeholder="e.g. Chase Checking" error={errors.name} />

          <Input label="Starting Balance" value={form.balance} onChangeText={set('balance')}
            placeholder="0.00" keyboardType="decimal-pad" error={errors.balance} />

          <Text style={styles.fieldLabel}>Account Type</Text>
          <View style={styles.typeGrid}>
            {ACCOUNT_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                onPress={() => set('type')(t)}
              >
                <Text style={styles.typeChipIcon}>{ACCOUNT_ICONS[t]}</Text>
                <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Color</Text>
          <View style={styles.colorRow}>
            {ACCOUNT_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, form.color === c && styles.colorDotActive]}
                onPress={() => set('color')(c)}
              />
            ))}
          </View>

          <Button title="Add Account" onPress={handleCreate} loading={saving} size="lg" style={styles.modalBtn} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: colors.bg },
  header:           { backgroundColor: colors.primary, padding: spacing.lg, paddingTop: spacing.xl },
  headerLabel:      { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  headerAmount:     { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 4 },
  list:             { padding: spacing.md, paddingBottom: 80 },
  accountCard:      { flexDirection: 'row', padding: 0, marginBottom: spacing.sm, overflow: 'hidden' },
  accountAccent:    { width: 6 },
  accountBody:      { flex: 1, padding: spacing.md },
  accountRow:       { flexDirection: 'row', alignItems: 'center' },
  accountIcon:      { fontSize: 28, marginRight: spacing.sm },
  accountInfo:      { flex: 1 },
  accountName:      { fontSize: 16, fontWeight: '600', color: colors.text },
  accountType:      { fontSize: 12, color: colors.textMuted, textTransform: 'capitalize', marginTop: 2 },
  accountBalance:   { fontSize: 18, fontWeight: '700' },
  deleteBtn:        { padding: spacing.md, justifyContent: 'center' },
  deleteBtnText:    { fontSize: 18 },
  empty:            { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:        { fontSize: 40, marginBottom: spacing.sm },
  emptyText:        { fontSize: 15, color: colors.textMuted },
  fab:              { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText:          { fontSize: 28, color: '#fff', fontWeight: '300', marginTop: -2 },
  // Modal
  modalContainer:   { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle:       { fontSize: 20, fontWeight: '700', color: colors.text },
  modalClose:       { fontSize: 20, color: colors.textMuted },
  fieldLabel:       { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8 },
  typeGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  typeChip:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, gap: 4 },
  typeChipActive:   { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipIcon:     { fontSize: 16 },
  typeChipText:     { fontSize: 13, color: colors.textMuted, textTransform: 'capitalize' },
  typeChipTextActive:{ color: '#fff' },
  colorRow:         { flexDirection: 'row', gap: 10, marginBottom: spacing.lg },
  colorDot:         { width: 32, height: 32, borderRadius: 16 },
  colorDotActive:   { borderWidth: 3, borderColor: colors.text },
  modalBtn:         { marginTop: 'auto' },
});
