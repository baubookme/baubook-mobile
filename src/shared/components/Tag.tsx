import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/theme';

interface TagProps {
  label: string;
  tone?: 'default' | 'teal' | 'pink' | 'orange' | 'green' | 'red';
}

export function Tag({ label, tone = 'default' }: TagProps) {
  return (
    <View style={[styles.tag, tones[tone]]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: typography.small,
    color: colors.text,
    fontWeight: '700',
  },
});

const tones = StyleSheet.create({
  default: {
    backgroundColor: colors.surface,
  },
  teal: {
    backgroundColor: colors.tealSoft,
  },
  pink: {
    backgroundColor: colors.pinkSoft,
  },
  orange: {
    backgroundColor: colors.orangeSoft,
  },
  green: {
    backgroundColor: colors.greenSoft,
  },
  red: {
    backgroundColor: colors.redSoft,
  },
});
