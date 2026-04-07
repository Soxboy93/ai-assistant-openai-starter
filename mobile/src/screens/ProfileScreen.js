import React, { useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../utils/theme';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR'];

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ name: user?.name || '', currency: user?.currency || 'USD' });

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile(form);
      setEditing(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name || '?')[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Profile form */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Text style={styles.editBtn}>{editing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {editing ? (
          <>
            <Input label="Full Name" value={form.name} onChangeText={set('name')} />

            <Text style={styles.fieldLabel}>Currency</Text>
            <View style={styles.currRow}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.currChip, form.currency === c && styles.currChipActive]}
                  onPress={() => set('currency')(c)}
                >
                  <Text style={[styles.currText, form.currency === c && styles.currTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title="Save Changes" onPress={handleSave} loading={saving} />
          </>
        ) : (
          <>
            <Row label="Name"     value={user?.name} />
            <Row label="Email"    value={user?.email} />
            <Row label="Currency" value={user?.currency} />
            <Row label="Member since" value={user?.created_at?.split('T')[0]} />
          </>
        )}
      </Card>

      {/* App info */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Row label="App"     value="PocketLedger" />
        <Row label="Version" value="1.0.0" />
      </Card>

      {/* Logout */}
      <Button title="Sign Out" onPress={handleLogout} variant="danger" style={styles.logoutBtn} />
    </ScrollView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.bg },
  content:      { padding: spacing.lg, paddingBottom: 60 },
  avatarSection:{ alignItems: 'center', marginBottom: spacing.lg },
  avatar:       { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarText:   { fontSize: 32, color: '#fff', fontWeight: '700' },
  name:         { fontSize: 22, fontWeight: '700', color: colors.text },
  email:        { fontSize: 15, color: colors.textMuted, marginTop: 4 },
  section:      { marginBottom: spacing.md },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  editBtn:      { fontSize: 15, color: colors.primary, fontWeight: '600' },
  fieldLabel:   { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8 },
  currRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  currChip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border },
  currChipActive:{ backgroundColor: colors.primary, borderColor: colors.primary },
  currText:     { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  currTextActive:{ color: '#fff' },
  row:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel:     { fontSize: 15, color: colors.textMuted },
  rowValue:     { fontSize: 15, color: colors.text, fontWeight: '500' },
  logoutBtn:    { marginTop: spacing.sm },
});
