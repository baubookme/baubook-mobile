import type { ImageSourcePropType } from 'react-native';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, shadows } from '../theme/theme';

export type CartoonTone = 'teal' | 'orange' | 'red' | 'green' | 'pink' | 'neutral';

interface CartoonTabIconProps {
  icon: ImageSourcePropType;
  label: string;
  selected: boolean;
  tone?: CartoonTone;
  isLogo?: boolean;
}

export function CartoonTabIcon({
  icon,
  label,
  selected,
  tone = 'neutral',
  isLogo = false,
}: CartoonTabIconProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.shell,
        toneStyles[tone],
        selected && styles.shellSelected,
        isLogo && styles.logoShell,
      ]}
    >
      <View style={[styles.highlight, selected && styles.highlightSelected]} />
      <View style={[styles.cheek, styles.cheekLeft]} />
      <View style={[styles.cheek, styles.cheekRight]} />
      <Image
        source={icon}
        accessibilityLabel={label}
        style={[
          styles.icon,
          isLogo && styles.logoIcon,
          selected && styles.iconSelected,
        ]}
      />
      <Text style={[styles.spark, selected && styles.sparkSelected]}>*</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: 42,
    height: 42,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(45, 35, 35, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    transform: [{ rotate: '-2deg' }],
  },
  logoShell: {
    width: 48,
    height: 48,
    borderRadius: 20,
    transform: [{ rotate: '2deg' }],
  },
  shellSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    ...shadows.soft,
    transform: [{ translateY: -5 }, { scale: 1.05 }, { rotate: '-1deg' }],
  },
  highlight: {
    position: 'absolute',
    left: 7,
    top: 5,
    width: 18,
    height: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    transform: [{ rotate: '-18deg' }],
  },
  highlightSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  cheek: {
    position: 'absolute',
    bottom: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 79, 123, 0.16)',
  },
  cheekLeft: {
    left: 6,
  },
  cheekRight: {
    right: 6,
  },
  icon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
    zIndex: 2,
  },
  logoIcon: {
    width: 44,
    height: 44,
  },
  iconSelected: {
    transform: [{ scale: 1.08 }],
  },
  spark: {
    position: 'absolute',
    right: 4,
    top: 1,
    color: 'rgba(45, 35, 35, 0.25)',
    fontSize: 13,
    fontWeight: '900',
    zIndex: 3,
  },
  sparkSelected: {
    color: colors.secondary,
    fontSize: 15,
  },
});

const toneStyles = StyleSheet.create({
  teal: {
    backgroundColor: colors.tealSoft,
  },
  orange: {
    backgroundColor: colors.orangeSoft,
  },
  red: {
    backgroundColor: colors.redSoft,
  },
  green: {
    backgroundColor: colors.greenSoft,
  },
  pink: {
    backgroundColor: colors.pinkSoft,
  },
  neutral: {
    backgroundColor: colors.surfaceWarm,
  },
});
