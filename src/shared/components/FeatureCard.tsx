import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { FeatureCardModel } from '../types/domain';
import { colors, radius, spacing, typography, shadows } from '../theme/theme';

interface FeatureCardProps {
  feature: FeatureCardModel;
  onPress?: () => void;
}

export function FeatureCard({ feature, onPress }: FeatureCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.iconWrap, toneStyles[feature.tint ?? 'teal']]}>
        <Image source={feature.icon} style={styles.icon} />
      </View>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>{feature.eyebrow}</Text>
        <Text style={styles.title}>{feature.title}</Text>
        <Text style={styles.description}>{feature.description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    ...shadows.soft,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
  },
});

const toneStyles = StyleSheet.create({
  teal: {
    backgroundColor: colors.tealSoft,
  },
  orange: {
    backgroundColor: colors.orangeSoft,
  },
  pink: {
    backgroundColor: colors.pinkSoft,
  },
  green: {
    backgroundColor: colors.greenSoft,
  },
  red: {
    backgroundColor: colors.redSoft,
  },
});
