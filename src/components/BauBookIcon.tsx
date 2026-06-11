import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
  | 'note';

export type BauBookIconProps = {
  name: BauBookIconName;
  size?: number;
  tone?: "warm" | "green" | "blue" | "danger" | "neutral";
};

const iconMap: Record<BauBookIconName, string> = {
  home: '⌂',
  map: '⌖',
  walk: '⌁',
  safety: '!',
  dog: '◡',
  partnership: '✦',
  tip: 'i',
  feedback: '✎',
  profile: '●',
  diary: '▤',
  close: '×',
  food: '◒',
  vet: '+',
  medicine: '•',
  grooming: '✂',
  note: '…'
};

export function BauBookIcon({ name, size = 22, tone = "warm" }: BauBookIconProps) {
  return (
    <View
      style={[
        styles.shell,
        styles[tone],
        { width: size + 14, height: size + 14, borderRadius: (size + 14) / 2 }
      ]}
    >
      <Text style={[styles.glyph, { fontSize: Math.max(12, size - 5), lineHeight: Math.max(14, size - 3) }]}>{iconMap[name]}</Text>
    </View>
  );
}

export default BauBookIcon;

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  glyph: {
    fontWeight: '900'
  },
  warm: {
    backgroundColor: '#fff4dd',
    borderColor: '#ecd3a2'
  },
  green: {
    backgroundColor: '#e2f3e6',
    borderColor: '#c7e6ce'
  },
  blue: {
    backgroundColor: '#e7f0ff',
    borderColor: '#cbdcff'
  },
  danger: {
    backgroundColor: '#ffe9e6',
    borderColor: '#ffc7bd'
  },
  neutral: {
    backgroundColor: '#f1ede8',
    borderColor: '#ded6cc'
  }
});
