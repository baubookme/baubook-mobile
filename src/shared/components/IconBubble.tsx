import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { Image, StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme/theme';

interface IconBubbleProps {
  source: ImageSourcePropType;
  size?: number;
  tone?: 'plain' | 'warm' | 'teal' | 'pink' | 'danger';
  style?: StyleProp<ViewStyle>;
}

export function IconBubble({ source, size = 58, tone = 'warm', style }: IconBubbleProps) {
  return (
    <View style={[styles.bubble, tones[tone], { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Image source={source} style={{ width: size * 0.72, height: size * 0.72, resizeMode: 'contain' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});

const tones = StyleSheet.create({
  plain: {
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
