import React from 'react';
import { StyleSheet, View } from 'react-native';

type ThinkingDogIconProps = {
  size?: number;
};

export function ThinkingDogIcon({ size = 76 }: ThinkingDogIconProps) {
  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <View style={styles.thoughtSmall} />
      <View style={styles.thoughtLarge} />

      <View style={styles.leftEar} />
      <View style={styles.rightEar} />

      <View style={styles.face}>
        <View style={styles.leftPatch} />
        <View style={styles.leftEye} />
        <View style={styles.rightEye} />

        <View style={styles.snout}>
          <View style={styles.nose} />
          <View style={styles.smile} />
        </View>

        <View style={styles.cheekLeft} />
        <View style={styles.cheekRight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thoughtSmall: {
    position: 'absolute',
    right: 7,
    top: 4,
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: '#f7dfb5',
    borderWidth: 1,
    borderColor: '#e7c88d',
  },
  thoughtLarge: {
    position: 'absolute',
    right: 0,
    top: -7,
    width: 17,
    height: 17,
    borderRadius: 99,
    backgroundColor: '#fff4d8',
    borderWidth: 1,
    borderColor: '#e7c88d',
  },
  leftEar: {
    position: 'absolute',
    left: 9,
    top: 19,
    width: 22,
    height: 31,
    borderRadius: 14,
    backgroundColor: '#c76d28',
    transform: [{ rotate: '-24deg' }],
    borderWidth: 2,
    borderColor: '#2d1b13',
  },
  rightEar: {
    position: 'absolute',
    right: 9,
    top: 19,
    width: 22,
    height: 31,
    borderRadius: 14,
    backgroundColor: '#8f4a22',
    transform: [{ rotate: '24deg' }],
    borderWidth: 2,
    borderColor: '#2d1b13',
  },
  face: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#f7b246',
    borderWidth: 2,
    borderColor: '#2d1b13',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  leftPatch: {
    position: 'absolute',
    left: 3,
    top: 8,
    width: 25,
    height: 32,
    borderRadius: 18,
    backgroundColor: '#fff4d8',
    transform: [{ rotate: '-18deg' }],
  },
  leftEye: {
    position: 'absolute',
    left: 18,
    top: 21,
    width: 6,
    height: 8,
    borderRadius: 5,
    backgroundColor: '#2d1b13',
  },
  rightEye: {
    position: 'absolute',
    right: 18,
    top: 21,
    width: 6,
    height: 8,
    borderRadius: 5,
    backgroundColor: '#2d1b13',
  },
  snout: {
    position: 'absolute',
    bottom: 10,
    width: 30,
    height: 20,
    borderRadius: 16,
    backgroundColor: '#fff4d8',
    alignItems: 'center',
  },
  nose: {
    marginTop: 3,
    width: 11,
    height: 8,
    borderRadius: 7,
    backgroundColor: '#2d1b13',
  },
  smile: {
    marginTop: 1,
    width: 14,
    height: 7,
    borderBottomWidth: 2,
    borderBottomColor: '#2d1b13',
    borderRadius: 10,
  },
  cheekLeft: {
    position: 'absolute',
    left: 12,
    bottom: 16,
    width: 5,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#f36d6d',
    opacity: 0.7,
  },
  cheekRight: {
    position: 'absolute',
    right: 12,
    bottom: 16,
    width: 5,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#f36d6d',
    opacity: 0.7,
  },
});
