import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BauBookIcon from '../../../components/BauBookIcon';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';

type TodayTab = 'map' | 'alerts' | 'dog' | 'walks';
type DogDiaryCategory = 'walk' | 'food' | 'vet' | 'medicine' | 'grooming' | 'note';
type DogDiaryEvent = { id: string; category: DogDiaryCategory; note: string; createdAt: string };

type HomeTodayCommandCenterProps = {
  dogName?: string;
  placesCount: number;
  activeAlertsCount: number;
  onNavigate: (tab: TodayTab) => void;
};

const DOG_DIARY_STORAGE_KEY = 'baubook.dogDiary.events.v1';

const CATEGORY_LABELS: Record<DogDiaryCategory, string> = {
  walk: 'Passeggiata',
  food: 'Pappa',
  vet: 'Veterinario',
  medicine: 'Farmaco',
  grooming: 'Toelettatura',
  note: 'Nota',
};

function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'data non disponibile';
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfEventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfEventDay) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'oggi';
  if (diffDays === 1) return 'ieri';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} giorni fa`;

  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

function isHealthEvent(event: DogDiaryEvent): boolean {
  return event.category === 'vet' || event.category === 'medicine';
}

export function HomeTodayCommandCenter({ dogName, placesCount, activeAlertsCount, onNavigate }: HomeTodayCommandCenterProps) {
  const [events, setEvents] = useState<DogDiaryEvent[]>([]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(DOG_DIARY_STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) {
          return;
        }
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setEvents(parsed.filter((item): item is DogDiaryEvent => typeof item === 'object' && item !== null));
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const insight = useMemo(() => {
    const lastEvent = events[0];
    const lastWalk = events.find((event) => event.category === 'walk');
    const lastHealth = events.find(isHealthEvent);
    const dogLabel = dogName?.trim() || 'il tuo cane';

    let recommendation = 'Apri la mappa e scegli un luogo dog-friendly vicino a te.';
    let targetTab: TodayTab = 'map';

    if (activeAlertsCount > 0) {
      recommendation = 'Controlla gli alert safety prima di uscire.';
      targetTab = 'alerts';
    } else if (!lastWalk) {
      recommendation = 'Registra la prima passeggiata nel Dog Diary.';
      targetTab = 'walks';
    } else if (!lastHealth) {
      recommendation = 'Aggiungi una nota salute o veterinario quando hai un aggiornamento.';
      targetTab = 'dog';
    }

    return { dogLabel, lastEvent, lastWalk, lastHealth, recommendation, targetTab };
  }, [activeAlertsCount, dogName, events]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBubble}>
          <BauBookIcon name="dog" size={25} color={colors.primaryDark} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Oggi con {insight.dogLabel}</Text>
          <Text style={styles.title}>Care Command Center</Text>
          <Text style={styles.subtitle}>Diario, safety e mappa in un unico colpo d'occhio.</Text>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryValue}>{placesCount}</Text>
          <Text style={styles.summaryLabel}>luoghi utili</Text>
        </View>
        <View style={[styles.summaryPill, activeAlertsCount > 0 ? styles.summaryDanger : styles.summarySafe]}>
          <Text style={styles.summaryValue}>{activeAlertsCount}</Text>
          <Text style={styles.summaryLabel}>alert attivi</Text>
        </View>
      </View>

      <View style={styles.insightBox}>
        <Text style={styles.insightTitle}>Prossima azione consigliata</Text>
        <Text style={styles.insightText}>{insight.recommendation}</Text>
      </View>

      <View style={styles.timelineBox}>
        <Text style={styles.timelineTitle}>Ultimi segnali</Text>
        <Text style={styles.timelineText}>
          Ultimo evento: {insight.lastEvent ? `${CATEGORY_LABELS[insight.lastEvent.category]} · ${formatDay(insight.lastEvent.createdAt)}` : 'nessun evento registrato'}
        </Text>
        <Text style={styles.timelineText}>
          Ultima passeggiata: {insight.lastWalk ? formatDay(insight.lastWalk.createdAt) : 'non ancora registrata'}
        </Text>
        <Text style={styles.timelineText}>
          Salute: {insight.lastHealth ? `${CATEGORY_LABELS[insight.lastHealth.category]} · ${formatDay(insight.lastHealth.createdAt)}` : 'nessuna nota salute recente'}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => onNavigate(insight.targetTab)}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>Apri azione</Text>
        </Pressable>
        <Pressable onPress={() => onNavigate('map')} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
          <Text style={styles.secondaryButtonText}>Apri mappa</Text>
        </Pressable>
        <Pressable onPress={() => onNavigate('dog')} style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]}>
          <Text style={styles.ghostButtonText}>Profilo 🐾</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default HomeTodayCommandCenter;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fffaf3',
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: typography.h2,
    lineHeight: 25,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryPill: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  summarySafe: {
    backgroundColor: colors.greenSoft,
  },
  summaryDanger: {
    backgroundColor: colors.redSoft,
  },
  summaryValue: {
    color: colors.ink,
    fontSize: typography.h1,
    fontWeight: '900',
  },
  summaryLabel: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  insightBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  insightTitle: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  insightText: {
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '800',
  },
  timelineBox: {
    gap: 4,
  },
  timelineTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  timelineText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  primaryButton: {
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButton: {
    borderRadius: radius.pill,
    backgroundColor: colors.greenSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ghostButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.small,
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  ghostButtonText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
