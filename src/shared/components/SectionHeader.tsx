import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme/theme';

interface SectionHeaderProps {
  eyebrow?: string;
  title?: string;
  description?: string;
}

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: colors.ink,
    fontSize: typography.h1,
    lineHeight: 32,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
