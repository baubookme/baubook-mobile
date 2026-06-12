import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { baubookImages } from '../../shared/assets/images';
import { useAuthAccount } from '../../shared/auth/AuthProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { Tag } from '../../shared/components/Tag';
import { useSafetyBoard } from '../../shared/hooks/useSafetyBoard';
import { useSupabasePlaces } from '../../shared/hooks/useSupabasePublicData';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';
import type { PlaceModel, TabKey } from '../../shared/types/domain';

interface PackScreenProps {
  onNavigate: (tab: TabKey) => void;
}

type PulseTone = 'green' | 'orange' | 'red' | 'teal';

interface MissionCardModel {
  title: string;
  description: string;
  cta: string;
  target: TabKey;
  tone: PulseTone;
}

interface RouteBriefModel {
  place: PlaceModel;
  score: number;
  label: string;
  tone: PulseTone;
  reason: string;
}

function toneForScore(score: number): PulseTone {
  if (score >= 85) {
    return 'green';
  }
  if (score >= 65) {
    return 'teal';
  }
  if (score >= 45) {
    return 'orange';
  }
  return 'red';
}

function shortKind(kind: PlaceModel['kind']): string {
  switch (kind) {
    case 'dog_area':
      return 'area cani';
    case 'walk':
    case 'trail':
      return 'passeggiata';
    case 'vet':
      return 'vet';
    case 'pet_shop':
      return 'pet shop';
    case 'warning_zone':
      return 'attenzione';
    case 'beach':
      return 'pet holiday';
    case 'service':
      return 'servizio';
    default:
      return 'luogo';
  }
}

function buildRouteBriefs(places: PlaceModel[], activeDangerCount: number): RouteBriefModel[] {
  return places.slice(0, 6).map((place, index) => {
    const safetyPenalty = activeDangerCount > 0 ? 12 : 0;
    const kindBonus = place.kind === 'dog_area' || place.kind === 'walk' || place.kind === 'trail' ? 14 : 6;
    const moderationPenalty = place.moderationStatus === 'approved' ? 0 : 8;
    const score = Math.max(30, Math.min(98, 74 + kindBonus - safetyPenalty - moderationPenalty - index * 3));
    const tone = toneForScore(score);

    return {
      place,
      score,
      tone,
      label: score >= 85 ? 'super ok' : score >= 65 ? 'buona idea' : score >= 45 ? 'controlla prima' : 'evita ora',
      reason:
        activeDangerCount > 0
          ? 'Radar safety attivo: apri Aiuto prima di partire.'
          : place.moderationStatus === 'approved'
            ? 'Luogo pubblico leggibile e pronto per la beta.'
            : 'Scheda presente, ma da verificare nella community.',
    };
  });
}

export function PackScreen({ onNavigate }: PackScreenProps) {
  const auth = useAuthAccount();
  const placesState = useSupabasePlaces();
  const safetyBoard = useSafetyBoard(auth.profile?.id);

  const activeAlerts = safetyBoard.alerts.filter((alert) => alert.status === 'active');
  const dangerCount = activeAlerts.filter((alert) => alert.type === 'danger').length;
  const lostDogCount = activeAlerts.filter((alert) => alert.type === 'lost_dog').length;
  const livePlaces = placesState.places.filter((place) => !place.id.endsWith('-demo'));
  const placesForBrief = livePlaces.length ? livePlaces : placesState.places;

  const profileReady = auth.isSignedIn && Boolean(auth.profile);
  const dogReady = auth.dogs.length > 0;
  const liveBackendReady = placesState.source === 'supabase' && safetyBoard.source === 'supabase';

  const packScore = useMemo(() => {
    const account = profileReady ? 24 : 0;
    const dog = dogReady ? 24 : 0;
    const data = liveBackendReady ? 24 : 10;
    const calm = activeAlerts.length === 0 ? 22 : Math.max(5, 22 - activeAlerts.length * 5);
    const places = Math.min(6, placesForBrief.length);
    return Math.min(100, account + dog + data + calm + places);
  }, [activeAlerts.length, dogReady, liveBackendReady, placesForBrief.length, profileReady]);

  const packTone = toneForScore(packScore);
  const routeBriefs = useMemo(() => buildRouteBriefs(placesForBrief, dangerCount), [dangerCount, placesForBrief]);

  const missions = useMemo<MissionCardModel[]>(() => {
    const result: MissionCardModel[] = [];

    if (!profileReady) {
      result.push({
        title: 'Completa identità beta',
        description: 'Accedi o crea il profilo umano per sbloccare azioni reali e safety live.',
        cta: 'Vai in Setup',
        target: 'profile',
        tone: 'orange',
      });
    }

    if (profileReady && !dogReady) {
      result.push({
        title: 'Registra il primo cane',
        description: 'Serve per smarrimento, passeggiate e profilo BauBook del branco.',
        cta: 'Io sono',
        target: 'dog',
        tone: 'teal',
      });
    }

    if (activeAlerts.length > 0) {
      result.push({
        title: `${activeAlerts.length} alert da leggere`,
        description: `${lostDogCount} smarrimento/i e ${dangerCount} pericolo/i attivi nella bacheca sicurezza.`,
        cta: 'Apri Aiuto',
        target: 'alerts',
        tone: dangerCount > 0 ? 'red' : 'orange',
      });
    }

    result.push({
      title: 'Prepara una passeggiata smart',
      description: 'Scegli un luogo con buon segnale, poi passa a Passeggio per creare presenza o interesse.',
      cta: 'Passeggio',
      target: 'walks',
      tone: 'green',
    });

    return result.slice(0, 4);
  }, [activeAlerts.length, dangerCount, dogReady, lostDogCount, profileReady]);

  return (
    <Screen>
      <AppCard tone="teal">
        <View style={styles.heroRow}>
          <Image source={baubookImages.icons.friends} style={styles.heroIcon} />
          <View style={styles.heroCopy}>
            <Text style={styles.title}>Branco in azione 🐾</Text>
            <Text style={styles.bodyText}>
              Una bacheca semplice: account, il mio amico, luoghi, sicurezza e prossima azione in un solo colpo d'occhio.
            </Text>
          </View>
        </View>

      </AppCard>

      <View style={styles.kpiGrid}>
        <PulseKpi title="Luoghi" value={`${placesForBrief.length}`} label={placesState.source === 'supabase' ? 'online' : 'offline'} tone="teal" />
        <PulseKpi title="Alert" value={`${activeAlerts.length}`} label={safetyBoard.source === 'supabase' ? 'safety' : 'fallback'} tone={activeAlerts.length ? 'red' : 'green'} />
        <PulseKpi title="Cani" value={`${auth.dogs.length}`} label={dogReady ? 'profilo ok' : 'manca'} tone={dogReady ? 'green' : 'orange'} />
        <PulseKpi title="Account" value={auth.isSignedIn ? 'ON' : 'OFF'} label={auth.status} tone={auth.isSignedIn ? 'green' : 'orange'} />
      </View>

      <AppCard elevated={false}>
        <View style={styles.sectionTitleRow}>
          <IconBubble source={baubookImages.icons.notifications} tone="warm" />
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>Attività</Text>
            <Text style={styles.bodyText}>Dai sempre un'occhiata qui. 👀</Text>
          </View>
        </View>
        <View style={styles.missionList}>
          {missions.map((mission) => (
            <Pressable key={mission.title} onPress={() => onNavigate(mission.target)} style={({ pressed }) => [styles.missionCard, pressed && styles.pressed]}>
              <View style={styles.missionTop}>
                <Tag label={mission.tone === 'red' ? 'urgente' : mission.tone === 'orange' ? 'setup' : 'go'} tone={mission.tone} />
                <Text style={styles.missionCta}>{mission.cta}</Text>
              </View>
              <Text style={styles.missionTitle}>{mission.title}</Text>
              <Text style={styles.missionDescription}>{mission.description}</Text>
            </Pressable>
          ))}
        </View>
      </AppCard>

      <AppCard tone="warm">
        <View style={styles.sectionTitleRow}>
          <IconBubble source={baubookImages.icons.route} tone="teal" />
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>Radar passeggiate</Text>
            <Text style={styles.bodyText}>Primi suggererimenti sui luoghi disponibili e dal livello sicurezza.</Text>
          </View>
        </View>
        <View style={styles.routeList}>
          {routeBriefs.map((brief) => (
            <View key={brief.place.id} style={styles.routeRow}>
              <Image source={brief.place.icon} style={styles.routeIcon} />
              <View style={styles.routeCopy}>
                <Text style={styles.routeTitle}>{brief.place.name}</Text>
                <Text style={styles.routeMeta}>{brief.place.area} · {shortKind(brief.place.kind)} · {brief.place.distanceLabel}</Text>
                <Text style={styles.routeReason}>{brief.reason}</Text>
                <View style={styles.tagsRow}>
                  <Tag label={`${brief.score}/100`} tone={brief.tone} />
                  <Tag label={brief.label} tone={brief.tone} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </AppCard>


      <View style={styles.quickActions}>
        <AppButton label="Passeggio" icon={baubookImages.icons.walks} onPress={() => onNavigate('walks')} />
        <AppButton label="Io sono" variant="secondary" icon={baubookImages.icons.dogProfile} onPress={() => onNavigate('dog')} />
      </View>
    </Screen>
  );
}

function PulseKpi({ title, value, label, tone }: { title: string; value: string; label: string; tone: PulseTone }) {
  return (
    <View style={[styles.kpiCard, kpiTones[tone]]}>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  heroIcon: {
    width: 86,
    height: 86,
    resizeMode: 'contain',
  },
  heroCopy: {
    flex: 1,
    gap: 4,
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
    fontSize: typography.h1,
    fontWeight: '900',
  },
  bodyText: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  scoreWrap: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.72)',
    padding: spacing.md,
  },
  scoreNumber: {
    color: colors.primaryDark,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '900',
  },
  scoreCopy: {
    flex: 1,
    gap: 2,
  },
  scoreLabel: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  scoreHint: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCard: {
    width: '48%',
    minHeight: 102,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  kpiTitle: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  kpiValue: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '900',
  },
  kpiLabel: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  flexOne: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: typography.h2,
    fontWeight: '900',
  },
  missionList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  missionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    padding: spacing.md,
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  missionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  missionCta: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  missionTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  missionDescription: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '700',
  },
  routeList: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  routeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.74)',
    padding: spacing.md,
  },
  routeIcon: {
    width: 54,
    height: 54,
    resizeMode: 'contain',
  },
  routeCopy: {
    flex: 1,
    gap: 3,
  },
  routeTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  routeMeta: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '800',
  },
  routeReason: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

const kpiTones = StyleSheet.create({
  green: {
    backgroundColor: colors.greenSoft,
  },
  orange: {
    backgroundColor: colors.orangeSoft,
  },
  red: {
    backgroundColor: colors.redSoft,
  },
  teal: {
    backgroundColor: colors.tealSoft,
  },
});
