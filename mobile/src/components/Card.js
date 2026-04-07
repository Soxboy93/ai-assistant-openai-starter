import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../utils/theme';

export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.md,
  },
});
