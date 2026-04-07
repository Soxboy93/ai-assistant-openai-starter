import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../utils/theme';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR'];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', currency: 'USD' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));

  function validate() {
    const e = {};
    if (!form.name.trim())          e.name = 'Name is required';
    if (!form.email.trim())         e.email = 'Email is required';
    if (form.password.length < 6)   e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim().toLowerCase(), form.password, form.currency);
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>💰</Text>
          <Text style={styles.appName}>PocketLedger</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Create your account</Text>

          <Input label="Full Name" value={form.name} onChangeText={set('name')}
            placeholder="Jane Smith" autoCapitalize="words" error={errors.name} />

          <Input label="Email" value={form.email} onChangeText={set('email')}
            placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" error={errors.email} />

          <Input label="Password" value={form.password} onChangeText={set('password')}
            placeholder="Min. 6 characters" secureTextEntry error={errors.password} />

          <Input label="Confirm Password" value={form.confirm} onChangeText={set('confirm')}
            placeholder="••••••••" secureTextEntry error={errors.confirm} />

          {/* Currency selector */}
          <Text style={styles.currLabel}>Currency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currRow}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.currChip, form.currency === c && styles.currChipActive]}
                onPress={() => set('currency')(c)}
              >
                <Text style={[styles.currText, form.currency === c && styles.currTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Button title="Create Account" onPress={handleRegister} loading={loading} size="lg" style={styles.btn} />
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:            { flex: 1, backgroundColor: colors.bg },
  container:       { flexGrow: 1, padding: spacing.lg, paddingTop: 60 },
  header:          { alignItems: 'center', marginBottom: spacing.lg },
  logo:            { fontSize: 48 },
  appName:         { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  form:            { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.lg },
  title:           { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  currLabel:       { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8 },
  currRow:         { flexDirection: 'row', marginBottom: spacing.md },
  currChip:        { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, marginRight: 8 },
  currChipActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  currText:        { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  currTextActive:  { color: '#fff' },
  btn:             { marginTop: spacing.md },
  link:            { alignItems: 'center' },
  linkText:        { fontSize: 15, color: colors.textMuted },
  linkBold:        { color: colors.primary, fontWeight: '600' },
});
