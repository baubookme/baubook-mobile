import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type BauBookEmptyStateProps = {
  icon?: string;
  title: string;
  body: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function BauBookEmptyState({ icon = '🐾', title, body, actionLabel, onActionPress }: BauBookEmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          disabled={!onActionPress}
          onPress={onActionPress}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed, !onActionPress && styles.actionDisabled]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderColor: 'rgba(94, 110, 76, 0.14)',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(242, 210, 126, 0.32)',
    borderRadius: 999,
    height: 52,
    justifyContent: 'center',
    marginBottom: 12,
    width: 52,
  },
  icon: {
    fontSize: 25,
  },
  title: {
    color: '#263222',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    textAlign: 'center',
  },
  body: {
    color: '#64705e',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  action: {
    backgroundColor: '#2f5f3c',
    borderRadius: 999,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  actionPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});
