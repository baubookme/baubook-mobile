import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

export type BauBookIconName =
  | 'home'
  | 'map'
  | 'walk'
  | 'safety'
  | 'dog'
  | 'partnership'
  | 'tip'
  | 'feedback'
  | 'profile'
  | 'diary'
  | 'close'
  | 'food'
  | 'vet'
  | 'medicine'
  | 'grooming'
  | 'note'
  | string;

export type BauBookIconProps = {
  name?: BauBookIconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

const ICONS: Record<string, string> = {
  home: '⌂',
  map: '⌖',
  walk: '♢',
  safety: '!',
  dog: '◕',
  partnership: '♧',
  tip: '✦',
  feedback: '✎',
  profile: '◎',
  diary: '▣',
  close: '×',
  food: '◔',
  vet: '+',
  medicine: '◆',
  grooming: '✂',
  note: '≡'
};

export function BauBookIcon({ name = 'dog', size = 20, color = '#7a5a36', style }: BauBookIconProps) {
  const glyph = ICONS[name] || ICONS.dog;

  return (
    <Text style={[styles.icon, { color, fontSize: size, lineHeight: Math.round(size * 1.15) }, style]}>
      {glyph}
    </Text>
  );
}

export default BauBookIcon;

const styles = StyleSheet.create({
  icon: {
    fontWeight: '900',
    textAlign: 'center'
  }
});
