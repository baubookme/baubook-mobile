import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { baubookImages } from '../../shared/assets/images';
import type { SafetyAlertModel } from '../../shared/api/safety';
import { useAuthAccount } from '../../shared/auth/AuthProvider';
import { AppButton } from '../../shared/components/AppButton';
import { Screen } from '../../shared/components/Screen';
import { useSafetyBoard } from '../../shared/hooks/useSafetyBoard';
import { usePageVisibilitySettings } from '../../shared/hooks/usePageVisibilitySettings';
import { useSupabasePlaces } from '../../shared/hooks/useSupabasePublicData';
import { colors, radius, shadows, spacing, typography } from '../../shared/theme/theme';
import type { TabKey } from '../../shared/types/domain';

import HomeDogDiaryLite from './components/HomeDogDiaryLite';

interface HomeScreenProps {
  onNavigate: (tab: TabKey) => void;
}

type ActionTone = 'teal' | 'orange' | 'red' | 'green';

type QuickActionImage = 'walk' | 'map' | 'help' | 'profile';

interface QuickAction {
  title: string;
  image: QuickActionImage;
  tab: TabKey;
  tone: ActionTone;
}

const quickActions: QuickAction[] = [
  {
    title: 'Passeggio',
    image: 'walk',
    tab: 'walks',
    tone: 'teal',
  },
  {
    title: 'Aiuto',
    image: 'help',
    tab: 'alerts',
    tone: 'red',
  },
  {
    title: 'Mappa',
    image: 'map',
    tab: 'map',
    tone: 'orange',
  },
  {
    title: 'Io sono',
    image: 'profile',
    tab: 'dog',
    tone: 'green',
  },
];

function newestAlert(alerts: SafetyAlertModel[]): SafetyAlertModel | null {
  if (!alerts.length) {
    return null;
  }

  return [...alerts].sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime())[0];
}

function formatMetricAlertDate(alert: SafetyAlertModel | null): string {
  if (!alert) {
    return 'Nessun alert inserito';
  }

  const date = new Date(alert.createdAtIso);
  if (Number.isNaN(date.getTime())) {
    return 'Ultimo alert inserito: ora non disponibile';
  }

  const day = date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  return `Ultimo alert inserito: ${day}, ${time}`;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const auth = useAuthAccount();
  const placesState = useSupabasePlaces();
  const safetyBoard = useSafetyBoard(auth.profile?.id);
  const pageVisibility = usePageVisibilitySettings();

  const activeAlerts = useMemo(
    () => safetyBoard.alerts.filter((alert) => alert.status === 'active'),
    [safetyBoard.alerts],
  );

  const dangerAlerts = useMemo(
    () => activeAlerts.filter((alert) => alert.type === 'danger'),
    [activeAlerts],
  );

  const lostAlerts = useMemo(
    () => activeAlerts.filter((alert) => alert.type === 'lost_dog'),
    [activeAlerts],
  );

  const latestDangerAlert = useMemo(() => newestAlert(dangerAlerts), [dangerAlerts]);
  const latestLostAlert = useMemo(() => newestAlert(lostAlerts), [lostAlerts]);

  const pageVisibilitySummary = pageVisibility.hasLocation
    ? `Puoi aggiornare posizione e raggio in \"Setup\".`
    : `Raggio attuale di ricerca: ${pageVisibility.radiusLabel}. Puoi aggiornare posizione e raggio in \"Setup\".`;


  const lostCount = lostAlerts.length;
  const dangerCount = dangerAlerts.length;
  const visiblePlacesCount = placesState.places.length;

  const setupItems = useMemo(
    () => [
      {
        label: 'Account',
        value: auth.isSignedIn ? 'attivo' : 'da fare',
        ok: auth.isSignedIn,
      },
      {
        label: 'Attore protagonista 🐾',
        value: auth.dogs.length ? auth.dogs[0].name : 'da creare',
        ok: auth.dogs.length > 0,
      },
      {
        label: 'Luoghi',
        value: placesState.places.length ? 'disponibili' : 'nessuno',
        ok: placesState.places.length > 0,
      },
    ],
    [auth.dogs, auth.isSignedIn, placesState.places],
  );

  const topAlerts = activeAlerts.slice(0, 3);

  return (
    <Screen>
      <View style={styles.heroCard}>

        <HomeDogDiaryLite onNavigate={onNavigate} />

                      </View>

      <View style={styles.pageVisibilitySummaryCard}>
        <Text style={styles.pageVisibilitySummaryEyebrow}>Raggio di ricarca BauBook : {pageVisibility.radiusLabel}</Text>
        <Text style={styles.pageVisibilitySummaryText}>{pageVisibilitySummary}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.kicker}>Azioni rapide</Text>
          </View>
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <QuickActionCard key={action.title} action={action} onPress={() => onNavigate(action.tab)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.kicker}>Safety radar</Text>
            <Text style={styles.sectionTitle}>Segnalazioni attive</Text>
          </View>
          <Pressable
            onPress={safetyBoard.reload}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
          >
            <Text style={styles.refreshButtonText}>Aggiorna</Text>
          </Pressable>
        </View>

        <View style={styles.radarCard}>
          <View style={styles.radarStatusRow}>
            <StatusDot ok={safetyBoard.source === 'supabase'} />
            <Text style={styles.radarStatusText}>
              {safetyBoard.status === 'loading'
                ? 'Carico safety board...'
                : safetyBoard.source === 'supabase'
                  ? safetyBoard.message
                  : `${safetyBoard.message}`}
            </Text>
          </View>

          {safetyBoard.errorMessage ? (
            <Text style={styles.errorText}>{safetyBoard.errorMessage}</Text>
          ) : null}

          {topAlerts.length ? (
            <View style={styles.alertList}>
              {topAlerts.map((alert) => (
                <RadarAlertRow key={alert.id} alert={alert} onPress={() => onNavigate('alerts')} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyRadar}>
              <Text style={styles.emptyTitle}>Nessun alert attivo vicino a te</Text>
              <Text style={styles.emptyText}>
                Se viene creato un pericolo o uno smarrimento, lo vedrai qui subito dalla Home.
              </Text>
              <AppButton label="Apri Aiuto" onPress={() => onNavigate('alerts')} variant="ghost" />
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.kicker}>Profilo</Text>
            <Text style={styles.sectionTitle}>Stato profilo</Text>
          </View>
          <AppButton label="Setup" onPress={() => onNavigate('profile')} variant="ghost" />
        </View>

        <View style={styles.setupCard}>
          {setupItems.map((item) => (
            <View key={item.label} style={styles.setupRow}>
              <StatusDot ok={item.ok} />
              <Text style={styles.setupLabel}>{item.label}</Text>
              <Text style={[styles.setupValue, item.ok && styles.setupValueOk]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.versionFooter}>BauBook v0.7.4</Text>
    </Screen>
  );
}

function MetricPill({
  detail,
  label,
  onPress,
  tone,
  value,
}: {
  detail: string;
  label: string;
  onPress?: () => void;
  tone: ActionTone;
  value: string;
}) {
  const content = (
    <>
      <Text style={styles.metricDetail} numberOfLines={1}>{detail}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Apri bacheca sicurezza ${label}`}
        onPress={onPress}
        style={({ pressed }) => [styles.metricPill, toneStyles[tone], pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.metricPill, toneStyles[tone]]}>{content}</View>;
}

function MetricScoutWidePill({
  detail,
  label,
  onPress,
  source,
  value,
}: {
  detail: string;
  label: string;
  onPress: () => void;
  source: ImageSourcePropType;
  value: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Apri bacheca sicurezza Smarrimenti"
      onPress={onPress}
      style={({ pressed }) => [styles.metricScoutWidePill, pressed && styles.pressed]}
    >
      <Image source={source} style={styles.metricScoutImage} resizeMode="contain" />
      <View style={styles.metricScoutContent}>
        <Text style={styles.metricScoutDetail} numberOfLines={1}>{detail}</Text>
        <View style={styles.metricScoutBody}>
          <Text style={styles.metricValue}>{value}</Text>
          <Text style={styles.metricLabel}>{label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function QuickActionCard({ action, onPress }: { action: QuickAction; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Apri ${action.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
    >
      <Image source={baubookImages.quickActions[action.image]} style={styles.quickCardImage} resizeMode="contain" />
    </Pressable>
  );
}

function RadarAlertRow({ alert, onPress }: { alert: SafetyAlertModel; onPress: () => void }) {
  const danger = alert.type === 'danger';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.alertRow, pressed && styles.pressed]}>
      <View style={[styles.alertBadge, danger ? styles.alertBadgeDanger : styles.alertBadgeLost]}>
        <Image
          source={danger ? alert.icon : baubookImages.safetyCircles.lostHelp}
          style={styles.alertBadgeImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.alertRowCopy}>
        <Text style={styles.alertRowTitle}>{alert.title}</Text>
        <Text style={styles.alertRowMeta}>
          {alert.placeName} · {alert.ttlLabel} · {alert.radiusLabel}
        </Text>
        <Text style={styles.alertRowText} numberOfLines={2}>
          {alert.description}
        </Text>
      </View>
    </Pressable>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return <View style={[styles.statusDot, ok ? styles.statusDotOk : styles.statusDotWarn]} />;
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadows.card,
  },
  heroHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  heroDogImage: {
    width: 119,
    height: 119,
    resizeMode: 'contain',
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  kicker: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: Math.round(typography.h1 * 0.8),
    lineHeight: Math.round(31 * 0.8),
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  metricPill: {
    width: '48%',
    minHeight: 104,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  metricScoutWidePill: {
    position: 'relative',
    width: '100%',
    minHeight: 132,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.orangeSoft,
  },
  metricScoutImage: {
    position: 'absolute',
    right: 10,
    bottom: -4,
    width: '36%',
    height: 90,
    opacity: 0.62,
    zIndex: 0,
  },
  metricScoutContent: {
    position: 'relative',
    zIndex: 2,
    flex: 1,
    minHeight: 132,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  metricScoutDetail: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    lineHeight: 16,
    fontWeight: '900',
    paddingRight: spacing.xs,
  },
  metricScoutBody: {
    alignSelf: 'flex-start',
  },
  metricDetail: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    lineHeight: 16,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  metricValue: {
    color: colors.ink,
    fontSize: typography.h1,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pageVisibilitySummaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  pageVisibilitySummaryEyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pageVisibilitySummaryText: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '800',
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: typography.h2,
    fontWeight: '900',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickCard: {
    width: '48%',
    aspectRatio: 1.45,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  quickCardImage: {
    width: '100%',
    height: '100%',
  },
  quickTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
    textAlign: 'center',
  },
  quickSubtitle: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '700',
  },
  quickCta: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
    textAlign: 'center',
  },
  refreshButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  refreshButtonText: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  radarCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    padding: spacing.lg,
    gap: spacing.md,
  },
  radarStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radarStatusText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '800',
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '900',
  },
  alertList: {
    gap: spacing.sm,
  },
  alertRow: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  alertBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  alertBadgeDanger: {
    backgroundColor: 'transparent',
  },
  alertBadgeLost: {
    backgroundColor: 'transparent',
  },
  alertBadgeImage: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    resizeMode: 'contain',
  },
  alertBadgeText: {
    color: colors.danger,
    fontSize: typography.h2,
    fontWeight: '900',
  },
  alertRowCopy: {
    flex: 1,
    gap: 3,
  },
  alertRowTitle: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  alertRowMeta: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    lineHeight: 15,
    fontWeight: '900',
  },
  alertRowText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '700',
  },
  emptyRadar: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '700',
  },
  setupCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  setupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  setupLabel: {
    flex: 1,
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  setupValue: {
    color: colors.warning,
    fontSize: typography.small,
    fontWeight: '900',
  },
  setupValueOk: {
    color: colors.success,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusDotOk: {
    backgroundColor: colors.success,
  },
  statusDotWarn: {
    backgroundColor: colors.warning,
  },
  versionFooter: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '800',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
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
});
