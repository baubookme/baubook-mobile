import type { ImageSourcePropType } from 'react-native';
import { Image, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/theme';

interface AppButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ImageSourcePropType;
  disabled?: boolean;
  size?: 'regular' | 'compact';
}

export function AppButton({ label, onPress, variant = 'primary', icon, disabled = false, size = 'regular' }: AppButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, buttonSizes[size], variants[variant], disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      {icon ? <Image source={icon} style={styles.icon} /> : null}
      <Text style={[styles.label, labelSizes[size], labelVariants[variant], disabled && styles.disabledLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    flexShrink: 1,
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
  disabled: {
    opacity: 0.52,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '800',
    textAlign: 'center',
  },
  disabledLabel: {
    opacity: 0.9,
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});


const buttonSizes = StyleSheet.create({
  regular: {},
  compact: {
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    gap: 4,
  },
});

const labelSizes = StyleSheet.create({
  regular: {},
  compact: {
    fontSize: typography.small,
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
