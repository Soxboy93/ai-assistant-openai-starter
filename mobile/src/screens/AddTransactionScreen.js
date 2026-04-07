import React, { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { accountsApi, categoriesApi, transactionsApi } from '../services/api';
import { today } from '../utils/format';
import { colors, radius, spacing } from '../utils/theme';

export default function AddTransactionScreen({ navigation, route }) {
  const { user } = useAuth();
  const initialType = route.params?.type || 'expense';

  const [type, setType]           = useState(initialType);
  const [amount, setAmount]       = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote]           = useState('');
  const [date, setDate]           = useState(today());
  const [accountId, setAccountId] = useState(null);
  const [categoryId, setCategoryId] = useState(null);
  const [accounts, setAccounts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState({});

  useEffect(() => {
    Promise.all([accountsApi.list(), categoriesApi.list()]).then(([acc, cat]) => {
      setAccounts(acc.data.accounts);
      if (acc.data.accounts.length > 0) setAccountId(acc.data.accounts[0].id);
      const filtered = cat.data.filter(c => c.type === type || c.type === 'both');
      setCategories(filtered);
    });
  }, []);

  useEffect(() => {
    categoriesApi.list().then(({ data }) => {
      setCategories(data.filter(c => c.type === type || c.type === 'both'));
      setCategoryId(null);
    });
  }, [type]);

  function validate() {
    const e = {};
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) e.amount = 'Enter a valid amount';
    if (!accountId)  e.account = 'Select an account';
    if (!description.trim()) e.description = 'Add a description';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await transactionsApi.create({
        type,
        amount: parseFloat(amount),
        description: description.trim(),
        note: note.trim(),
        date,
        account_id: accountId,
        category_id: categoryId || undefined,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  }

  const typeColor = type === 'income' ? colors.success : colors.danger;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Type selector */}
        <View style={styles.typeRow}>
          {['expense', 'income'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, type === t && { backgroundColor: t === 'income' ? colors.success : colors.danger }]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                {t === 'income' ? '⬆️ Income' : '⬇️ Expense'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <View style={styles.amountWrapper}>
          <Text style={[styles.currency, { color: typeColor }]}>{user?.currency || 'USD'}</Text>
          <Input
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.amountInput}
            inputStyle={[styles.amountField, { color: typeColor }]}
            error={errors.amount}
          />
        </View>

        <Input label="Description" value={description} onChangeText={setDescription}
          placeholder="What was this for?" error={errors.description} />

        <Input label="Note (optional)" value={note} onChangeText={setNote}
          placeholder="Additional details..." multiline />

        <Input label="Date" value={date} onChangeText={setDate}
          placeholder="YYYY-MM-DD" />

        {/* Account selection */}
        <Text style={styles.sectionLabel}>Account</Text>
        {errors.account && <Text style={styles.errorText}>{errors.account}</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selRow}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[styles.selChip, accountId === acc.id && { backgroundColor: acc.color, borderColor: acc.color }]}
              onPress={() => setAccountId(acc.id)}
            >
              <Text style={[styles.selChipText, accountId === acc.id && styles.selChipTextActive]}>
                {acc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category selection */}
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catItem, categoryId === cat.id && { backgroundColor: cat.color + '30', borderColor: cat.color }]}
              onPress={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Save Transaction"
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={styles.saveBtn}
          variant={type === 'income' ? 'success' : 'primary'}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:            { flex: 1, backgroundColor: colors.bg },
  content:         { padding: spacing.lg, paddingBottom: 40 },
  typeRow:         { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  typeBtn:         { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  typeText:        { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  typeTextActive:  { color: '#fff' },
  amountWrapper:   { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  currency:        { fontSize: 24, fontWeight: '700', marginRight: spacing.sm, marginTop: -6 },
  amountInput:     { flex: 1, marginBottom: 0 },
  amountField:     { fontSize: 32, fontWeight: '700', textAlign: 'right' },
  sectionLabel:    { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8 },
  errorText:       { fontSize: 12, color: colors.danger, marginBottom: 4 },
  selRow:          { flexDirection: 'row', marginBottom: spacing.md },
  selChip:         { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, marginRight: 8 },
  selChipText:     { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  selChipTextActive:{ color: '#fff' },
  categoryGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  catItem:         { width: '30%', alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  catIcon:         { fontSize: 22 },
  catName:         { fontSize: 11, color: colors.text, marginTop: 4, textAlign: 'center' },
  saveBtn:         { marginTop: spacing.sm },
});
