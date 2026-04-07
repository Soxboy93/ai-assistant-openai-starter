import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, radius, spacing } from '../utils/theme';

export default function Button({
  title,
  onPress,
  loading = false,
  variant = 'primary',  // 'primary' | 'outline' | 'ghost' | 'danger'
  size = 'md',          // 'sm' | 'md' | 'lg'
  style,
  disabled,
}) {
  const isDisabled = disabled || loading;

  const bgColor = {
    primary: colors.primary,
    outline: 'transparent',
    ghost:   'transparent',
    danger:  colors.danger,
    success: colors.success,
  }[variant];

  const textColor = {
    primary: '#fff',
    outline: colors.primary,
    ghost:   colors.text,
    danger:  '#fff',
    success: '#fff',
  }[variant];

  const padding = { sm: spacing.sm, md: spacing.md, lg: spacing.lg }[size];
  const fontSize = { sm: 14, md: 16, lg: 17 }[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.btn,
        { backgroundColor: bgColor, paddingVertical: padding },
        variant === 'outline' && styles.outline,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor, fontSize }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.5,
  },
});
