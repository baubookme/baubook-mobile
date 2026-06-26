import { useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from './AppCard';
import {
  MAX_PAGE_VISIBILITY_RADIUS_KM,
  MIN_PAGE_VISIBILITY_RADIUS_KM,
  usePageVisibilitySettings,
} from '../hooks/usePageVisibilitySettings';
import { colors, radius, spacing, typography } from '../theme/theme';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function PageVisibilityRadiusControl() {
  const pageVisibility = usePageVisibilitySettings();
  const [trackWidth, setTrackWidth] = useState(1);

  const radiusKm = pageVisibility.radiusKm;
  const progress =
    ((radiusKm - MIN_PAGE_VISIBILITY_RADIUS_KM) /
      (MAX_PAGE_VISIBILITY_RADIUS_KM - MIN_PAGE_VISIBILITY_RADIUS_KM)) *
    100;
  const progressOffset = `${progress}%` as `${number}%`;

  const updateRadiusFromPress = (event: GestureResponderEvent) => {
    const locationX = event.nativeEvent.locationX;
    const ratio = clamp(locationX / Math.max(trackWidth, 1), 0, 1);
    const nextRadius =
      MIN_PAGE_VISIBILITY_RADIUS_KM +
      Math.round(ratio * (MAX_PAGE_VISIBILITY_RADIUS_KM - MIN_PAGE_VISIBILITY_RADIUS_KM));

    void pageVisibility.setRadiusKm(nextRadius);
  };

  const decreaseDisabled = radiusKm <= MIN_PAGE_VISIBILITY_RADIUS_KM;
  const increaseDisabled = radiusKm >= MAX_PAGE_VISIBILITY_RADIUS_KM;

  return (
    <AppCard elevated={false} tone="teal" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Raggio di ricerca per segnalazioni, servizi e passeggiate 📌</Text>

        </View>
        <View style={styles.radiusBadge}>
          <Text style={styles.radiusBadgeText}>{pageVisibility.radiusLabel}</Text>
        </View>
      </View>

      <View style={styles.sliderRow}>
        <RadiusStepButton
          kind="minus"
          accessibilityLabel="Riduci raggio d'azione"
          disabled={decreaseDisabled}
          onPress={() => void pageVisibility.setRadiusKm(radiusKm - 1)}
        />
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel={`Raggio visibile ${radiusKm} chilometri`}
          onPress={updateRadiusFromPress}
          onLayout={(event) => setTrackWidth(Math.max(event.nativeEvent.layout.width, 1))}
          style={styles.track}
        >
          <View style={styles.trackRail}>
            <View style={[styles.trackFill, { width: progressOffset }]} />
          </View>
          <View style={[styles.trackKnob, { left: progressOffset }]} />
        </Pressable>
        <RadiusStepButton
          kind="plus"
          accessibilityLabel="Aumenta raggio d'azione"
          disabled={increaseDisabled}
          onPress={() => void pageVisibility.setRadiusKm(radiusKm + 1)}
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.helperText} numberOfLines={2}>
          {pageVisibility.hasLocation
            ? `${pageVisibility.locationLabel}.`
            : 'Rileva una posizione per filtrare una distanza in ciò che vedi.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Rileva posizione per il filtro pagina"
          onPress={() => void pageVisibility.detectAndSaveLocation()}
          disabled={pageVisibility.detecting}
          style={({ pressed }) => [
            styles.detectButton,
            pageVisibility.detecting && styles.disabled,
            pressed && !pageVisibility.detecting && styles.pressed,
          ]}
        >
          <Text style={styles.detectButtonText}>{pageVisibility.detecting ? 'Rilevo...' : 'Rileva posizione'}</Text>
        </Pressable>
      </View>

      {pageVisibility.message ? <Text style={styles.statusText}>{pageVisibility.message}</Text> : null}
    </AppCard>
  );
}

interface RadiusStepButtonProps {
  kind: 'minus' | 'plus';
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}

function RadiusStepButton({ kind, accessibilityLabel, disabled, onPress }: RadiusStepButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={styles.stepIcon}>
        <View style={styles.stepIconLine} />
        {kind === 'plus' ? <View style={[styles.stepIconLine, styles.stepIconLineVertical]} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  radiusBadge: {
    minWidth: 58,
    minHeight: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  radiusBadgeText: {
    color: colors.primaryDark,
    fontSize: typography.body,
    fontWeight: '900',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconLine: {
    position: 'absolute',
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryDark,
  },
  stepIconLineVertical: {
    width: 4,
    height: 18,
  },
  track: {
    flex: 1,
    height: 34,
    justifyContent: 'center',
  },
  trackRail: {
    height: 10,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  trackKnob: {
    position: 'absolute',
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  helperText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '800',
  },
  detectButton: {
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    flexShrink: 0,
  },
  detectButtonText: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.46,
  },
  statusText: {
    color: colors.primaryDark,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '900',
  },
});
