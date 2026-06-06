import type { ImageSourcePropType } from 'react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/theme';

interface AppButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ImageSourcePropType;
}

export function AppButton({ label, onPress, variant = 'primary', icon }: AppButtonProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, variants[variant], pressed && styles.pressed]}>
      {icon ? <Image source={icon} style={styles.icon} /> : null}
      <Text style={[styles.label, labelVariants[variant]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.88,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '800',
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});

const variants = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  ghost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.danger,
  },
});

const labelVariants = StyleSheet.create({
  primary: {
    color: '#FFFFFF',
  },
  secondary: {
    color: colors.ink,
  },
  ghost: {
    color: colors.primaryDark,
  },
  danger: {
    color: '#FFFFFF',
  },
});
