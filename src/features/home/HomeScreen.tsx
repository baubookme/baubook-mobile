import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafetyBoard } from '../../shared/hooks/useSafetyBoard';
import { useSupabasePlaces } from '../../shared/hooks/useSupabasePublicData';
import { useAuthAccount } from '../../shared/auth/AuthProvider';
import { AppButton } from '../../shared/components/AppButton';
import { Screen } from '../../shared/components/Screen';
import { colors, radius, shadows, spacing, typography } from '../../shared/theme/theme';
import type { SafetyAlertModel } from '../../shared/api/safety';
import type { TabKey } from '../../shared/types/domain';

import { BetaTrustCommandCenter } from '../beta';
import { HomeTopInsightBadges } from './components/HomeTopInsightBadges';
import { HomeBetaPolishCards } from './components/HomeBetaPolishCards';
import { HomeFirstStepsCommandCenter } from './components/HomeFirstStepsCommandCenter';
import HomeDogDiaryLite from './components/HomeDogDiaryLite';
import { HomeTodayCommandCenter } from './components/HomeTodayCommandCenter';
interface HomeScreenProps {
  onNavigate: (tab: TabKey) => void;
}

type ActionTone = 'teal' | 'orange' | 'red' | 'green';

interface QuickAction {
  title: string;
  subtitle: string;
  tab: TabKey;
  tone: ActionTone;
}

const quickActions: QuickAction[] = [
  {
    title: 'Passeggio',
    subtitle: 'Organizza o raggiungi una presenza temporanea.',
    tab: 'walks',
    tone: 'teal',
  },
  {
    title: 'Aiuto',
    subtitle: 'Apri smarrimenti, pericoli e avvistamenti.',
    tab: 'alerts',
    tone: 'red',
  },
  {
    title: 'Mappa',
    subtitle: 'Controlla luoghi e zone utili Venezia-Mestre.',
    tab: 'map',
    tone: 'orange',
  },
  {
    title: 'Io sono',
    subtitle: 'Tieni pronto il profilo del tuo cane.',
    tab: 'dog',
    tone: 'green',
  },
];

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const auth = useAuthAccount();
  const placesState = useSupabasePlaces();
  const safetyBoard = useSafetyBoard(auth.profile?.id);

  const activeAlerts = useMemo(
    () => safetyBoard.alerts.filter((alert) => alert.status === 'active'),
    [safetyBoard.alerts],
  );

  const lostCount = useMemo(
    () => activeAlerts.filter((alert) => alert.type === 'lost_dog').length,
    [activeAlerts],
  );

  const dangerCount = activeAlerts.length - lostCount;
  const livePlacesCount = placesState.places.filter((place) => !place.id.endsWith('-demo')).length;
  const visiblePlacesCount = livePlacesCount || placesState.places.length;

  const setupItems = useMemo(
    () => [
      {
        label: 'Account',
        value: auth.isSignedIn ? 'attivo' : 'da fare',
        ok: auth.isSignedIn,
      },
      {
        label: 'Cane',
        value: auth.dogs.length ? auth.dogs[0].name : 'da creare',
        ok: auth.dogs.length > 0,
      },
      {
        label: 'Luoghi',
        value: placesState.source === 'supabase' ? 'live' : 'demo',
        ok: placesState.source === 'supabase',
      },
    ],
    [auth.dogs, auth.isSignedIn, placesState.source],
  );

  const topAlerts = activeAlerts.slice(0, 3);

  return (
    <Screen>
      <View style={styles.heroCard}>
      <HomeTopInsightBadges />
      <HomeTodayCommandCenter
        dogName={auth.dogs[0]?.name}
        placesCount={visiblePlacesCount}
        activeAlertsCount={activeAlerts.length}
        onNavigate={onNavigate}
      />
      <HomeBetaPolishCards />
      <HomeFirstStepsCommandCenter />
      <HomeDogDiaryLite />
        <View style={styles.heroHeader}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>BB</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>BauBook live cockpit</Text>
            <Text style={styles.title}>Cosa succede vicino a te?</Text>
            <Text style={styles.subtitle}>
              Home operativa: passeggiate, luoghi e safety in un colpo dâ€™occhio.
            </Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <MetricPill label="Alert attivi" value={String(activeAlerts.length)} tone="red" />
          <MetricPill label="Smarrimenti" value={String(lostCount)} tone="orange" />
          <MetricPill label="Pericoli" value={String(dangerCount)} tone="red" />
          <MetricPill label="Luoghi" value={String(visiblePlacesCount)} tone="teal" />
        </View>

        <View style={styles.heroActions}>
          <AppButton label="Apri Aiuto" onPress={() => onNavigate('alerts')} variant="danger" />
          <AppButton label="Vai alla Mappa" onPress={() => onNavigate('map')} variant="ghost" />
        </View>
      </View>

      <BetaTrustCommandCenter />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.kicker}>Azioni rapide</Text>
            <Text style={styles.sectionTitle}>Parti da qui</Text>
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
            <Text style={styles.sectionTitle}>Alert e zone da guardare</Text>
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
                  : `Demo locale: ${safetyBoard.message}`}
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
                Se nasce un pericolo o uno smarrimento, lo vedrai qui subito dalla Home.
              </Text>
              <AppButton label="Apri Aiuto" onPress={() => onNavigate('alerts')} variant="ghost" />
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.kicker}>Setup beta</Text>
            <Text style={styles.sectionTitle}>Prontezza profilo</Text>
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
    </Screen>
  );
}

function MetricPill({ label, value, tone }: { label: string; value: string; tone: ActionTone }) {
  return (
    <View style={[styles.metricPill, toneStyles[tone]]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function QuickActionCard({ action, onPress }: { action: QuickAction; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickCard, toneStyles[action.tone], pressed && styles.pressed]}
    >
      <Text style={styles.quickTitle}>{action.title}</Text>
      <Text style={styles.quickSubtitle}>{action.subtitle}</Text>
      <Text style={styles.quickCta}>Apri â†’</Text>
    </Pressable>
  );
}

function RadarAlertRow({ alert, onPress }: { alert: SafetyAlertModel; onPress: () => void }) {
  const danger = alert.type === 'danger';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.alertRow, pressed && styles.pressed]}>
      <View style={[styles.alertBadge, danger ? styles.alertBadgeDanger : styles.alertBadgeLost]}>
        <Text style={styles.alertBadgeText}>{danger ? '!' : '?'}</Text>
      </View>
      <View style={styles.alertRowCopy}>
        <Text style={styles.alertRowTitle}>{alert.title}</Text>
        <Text style={styles.alertRowMeta}>
          {alert.placeName} Â· {alert.ttlLabel} Â· {alert.radiusLabel}
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
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconText: {
    color: '#FFFFFF',
    fontSize: typography.h2,
    fontWeight: '900',
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
    fontSize: typography.h1,
    lineHeight: 31,
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
  },
  metricPill: {
    flexGrow: 1,
    minWidth: '45%',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    flexWrap: 'wrap',
    gap: spacing.sm,
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
    minHeight: 132,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  quickTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
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
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBadgeDanger: {
    backgroundColor: colors.redSoft,
  },
  alertBadgeLost: {
    backgroundColor: colors.orangeSoft,
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

