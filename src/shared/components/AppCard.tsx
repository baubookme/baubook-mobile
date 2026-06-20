import { Children } from "react";
import type { PropsWithChildren, ReactNode } from "react";
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing, shadows } from '../theme/theme';

interface AppCardProps extends PropsWithChildren {
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'warm' | 'teal' | 'pink' | 'danger';
}


function stripWhitespaceTextChildren(children: ReactNode) {
  return Children.toArray(children).filter(
    (child) => typeof child !== "string" || child.trim().length > 0,
  );
}
export function AppCard({ children, elevated = true, style, tone = 'default' }: AppCardProps) {
  const cardChildren = stripWhitespaceTextChildren(children);
  return <View style={[styles.card, toneStyles[tone], elevated && shadows.card, style]}>{cardChildren}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
});

const toneStyles = StyleSheet.create({
  default: {
    backgroundColor: colors.surface,
  },
  warm: {
    backgroundColor: colors.surfaceWarm,
  },
  teal: {
    backgroundColor: colors.tealSoft,
  },
  pink: {
    backgroundColor: colors.pinkSoft,
  },
  danger: {
    backgroundColor: colors.redSoft,
  },
});
