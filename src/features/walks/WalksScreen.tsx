import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { baubookImages } from '../../shared/assets/images';
import { useAuthAccount } from '../../shared/auth/AuthProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { Tag } from '../../shared/components/Tag';
import { useSafetyBoard } from '../../shared/hooks/useSafetyBoard';
import { useSupabasePlaces } from '../../shared/hooks/useSupabasePublicData';
import { useWalksBoard } from '../../shared/hooks/useWalksBoard';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';
import type { PlaceModel, TabKey } from '../../shared/types/domain';

interface WalksScreenProps {
  onNavigate?: (tab: TabKey) => void;
}

type ReadinessTone = 'green' | 'teal' | 'orange' | 'red';
type PresenceStatus = 'available' | 'walking' | 'playing';

interface StartOption {
  label: string;
  minutes: number;
}

interface PresenceOption {
  label: string;
  status: PresenceStatus;
  helper: string;
}

interface RoutePulse {
  place: PlaceModel;
  score: number;
  tone: ReadinessTone;
  label: string;
  reason: string;
}

const startOptions: StartOption[] = [
  { label: 'Tra 30 min', minutes: 30 },
  { label: 'Tra 1 ora', minutes: 60 },
  { label: 'Tra 2 ore', minutes: 120 },
  { label: 'Domani mattina', minutes: 18 * 60 },
];

const presenceOptions: PresenceOption[] = [
  { label: 'Accetto compagnia', status: 'available', helper: 'Sono disponibile a incontrare altri cani.' },
  { label: 'Sto passeggiando', status: 'walking', helper: 'Presenza morbida: sto facendo un giro.' },
  { label: 'Sto giocando', status: 'playing', helper: 'Sono in zona e ho voglia di socializzare.' },
];

function toneForScore(score: number): ReadinessTone {
  if (score >= 85) {
    return 'green';
  }
  if (score >= 68) {
    return 'teal';
  }
  if (score >= 45) {
    return 'orange';
  }
  return 'red';
}

function placeKindLabel(kind: PlaceModel['kind']): string {
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

function buildRoutePulses(places: PlaceModel[], activeDangerCount: number): RoutePulse[] {
  return places.slice(0, 5).map((place, index) => {
    const kindBonus = place.kind === 'dog_area' || place.kind === 'walk' || place.kind === 'trail' ? 16 : 5;
    const dangerPenalty = activeDangerCount > 0 ? 16 : 0;
    const approvalPenalty = place.moderationStatus === 'approved' ? 0 : 9;
    const score = Math.max(28, Math.min(99, 76 + kindBonus - dangerPenalty - approvalPenalty - index * 4));
    const tone = toneForScore(score);

    return {
      place,
      score,
      tone,
      label: score >= 85 ? 'go forte' : score >= 68 ? 'buona zona' : score >= 45 ? 'controlla prima' : 'meglio evitare',
      reason:
        activeDangerCount > 0
          ? 'Pericoli attivi: leggi Aiuto prima di uscire.'
          : place.moderationStatus === 'approved'
            ? 'Luogo live adatto a una presenza temporanea.'
            : 'Luogo presente ma ancora da verificare bene.',
    };
  });
}

function formatStartPreview(minutes: number): string {
  const value = new Date(Date.now() + minutes * 60000);
  return value.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

export function WalksScreen({ onNavigate }: WalksScreenProps) {
  const auth = useAuthAccount();
  const placesState = useSupabasePlaces();
  const walksBoard = useWalksBoard(auth.profile?.id);
  const safetyBoard = useSafetyBoard(auth.profile?.id);

  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState(60);
  const [acceptsCompany, setAcceptsCompany] = useState(true);
  const [message, setMessage] = useState('Passeggiata tranquilla, annusata contemplativa.');
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('walking');

  const livePlaces = useMemo(
    () => placesState.places.filter((place) => place.moderationStatus !== 'removed'),
    [placesState.places],
  );

  const activeAlerts = useMemo(
    () => safetyBoard.alerts.filter((alert) => alert.status === 'active'),
    [safetyBoard.alerts],
  );

  const activeDangerCount = activeAlerts.filter((alert) => alert.type === 'danger').length;
  const lostDogCount = activeAlerts.filter((alert) => alert.type === 'lost_dog').length;
  const selectedDog = auth.dogs.find((dog) => dog.id === selectedDogId) ?? auth.dogs[0] ?? null;
  const selectedPlace = livePlaces.find((place) => place.id === selectedPlaceId) ?? livePlaces[0] ?? null;
  const profileReady = auth.isSignedIn && Boolean(auth.profile);
  const dogReady = Boolean(selectedDog);
  const placeReady = Boolean(selectedPlace);
  const safetyReadable = safetyBoard.source === 'supabase';
  const placesLive = placesState.source === 'supabase';
  const canUseLiveWrites = profileReady && dogReady && placeReady && placesLive;

  const startsAtIso = useMemo(() => new Date(Date.now() + selectedMinutes * 60000).toISOString(), [selectedMinutes]);
  const startsAtPreview = useMemo(() => formatStartPreview(selectedMinutes), [selectedMinutes]);
  const routePulses = useMemo(() => buildRoutePulses(livePlaces, activeDangerCount), [activeDangerCount, livePlaces]);

  const readinessScore = useMemo(() => {
    const account = profileReady ? 22 : 0;
    const dog = dogReady ? 22 : 0;
    const place = placeReady ? 18 : 0;
    const live = placesLive ? 16 : 6;
    const safety = activeDangerCount === 0 ? 16 : Math.max(3, 16 - activeDangerCount * 5);
    const board = walksBoard.source === 'supabase' ? 6 : 2;
    return Math.min(100, account + dog + place + live + safety + board);
  }, [activeDangerCount, dogReady, placeReady, placesLive, profileReady, walksBoard.source]);

  const readinessTone = toneForScore(readinessScore);
  const selectedPresenceOption = presenceOptions.find((option) => option.status === presenceStatus) ?? presenceOptions[1];

  useEffect(() => {
    if (!selectedDogId && auth.dogs[0]?.id) {
      setSelectedDogId(auth.dogs[0].id);
    }
  }, [auth.dogs, selectedDogId]);

  useEffect(() => {
    if (!selectedPlaceId && livePlaces[0]?.id) {
      setSelectedPlaceId(livePlaces[0].id);
    }
  }, [livePlaces, selectedPlaceId]);

  const handleCreateWalk = () => {
    if (!canUseLiveWrites || !selectedDog || !selectedPlace) {
      return;
    }

    void walksBoard.createPlan({
      dogId: selectedDog.id,
      placeId: selectedPlace.id,
      startsAtIso,
      message,
      acceptsCompany,
    });
  };

  const handleStartPresence = () => {
    if (!canUseLiveWrites || !selectedDog || !selectedPlace) {
      return;
    }

    void walksBoard.startPresence({
      dogId: selectedDog.id,
      placeId: selectedPlace.id,
      status: presenceStatus,
      message,
      expiresMinutes: 90,
    });
  };

  return (
    <Screen>
      <AppCard tone="teal">
        <View style={styles.heroHeader}>
          <IconBubble source={baubookImages.icons.walks} tone="teal" size={70} />
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Atomic block 1.9.4</Text>
            <Text style={styles.title}>Walk Command Center</Text>
            <Text style={styles.bodyText}>
              Il punto operativo per uscire: cane, luogo, safety, presenza e passeggiata reale in una schermata sola.
            </Text>
          </View>
        </View>

        <View style={styles.readinessPanel}>
          <View style={styles.readinessScoreBox}>
            <Text style={styles.readinessScore}>{readinessScore}</Text>
            <Text style={styles.readinessScoreLabel}>ready</Text>
          </View>
          <View style={styles.readinessCopy}>
            <Text style={styles.readinessTitle}>
              {readinessScore >= 85
                ? 'Pronto a uscire'
                : readinessScore >= 68
                  ? 'Quasi pronto'
                  : 'Completa la pre-partenza'}
            </Text>
            <Text style={styles.helperText}>
              {canUseLiveWrites
                ? `${selectedDog?.name ?? 'Il cane'} verso ${selectedPlace?.name ?? 'un luogo BauBook'} · ${startsAtPreview}`
                : 'Servono login, cane e luoghi live per scrivere passeggiate/presenze reali.'}
            </Text>
          </View>
          <Tag label={readinessTone === 'red' ? 'stop' : readinessTone === 'orange' ? 'check' : 'go'} tone={readinessTone} />
        </View>
      </AppCard>

      <View style={styles.kpiGrid}>
        <MetricBox title="Walk" value={String(walksBoard.walks.length)} label={walksBoard.source === 'supabase' ? 'live' : 'demo'} tone="teal" />
        <MetricBox title="Presenze" value={String(walksBoard.presences.length)} label="90 min" tone="green" />
        <MetricBox title="Alert" value={String(activeAlerts.length)} label={`${lostDogCount} persi · ${activeDangerCount} pericoli`} tone={activeAlerts.length ? 'red' : 'green'} />
        <MetricBox title="Luoghi" value={String(livePlaces.length)} label={placesLive ? 'Supabase' : 'fallback'} tone={placesLive ? 'teal' : 'orange'} />
      </View>

      <AppCard elevated={false}>
        <View style={styles.sectionTitleRow}>
          <IconBubble source={baubookImages.icons.checkin} tone="warm" />
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>Pre-partenza</Text>
            <Text style={styles.bodyText}>La checklist minima per usare BauBook senza fare confusione.</Text>
          </View>
        </View>
        <View style={styles.checkList}>
          <ChecklistRow title="Account" description={profileReady ? 'Profilo umano attivo.' : 'Accedi in Setup per scrivere dati reali.'} ok={profileReady} action="Setup" onPress={onNavigate ? () => onNavigate('profile') : undefined} />
          <ChecklistRow title="Cane" description={dogReady ? `${selectedDog?.name ?? 'Cane'} pronto.` : 'Crea il primo cane in Io sono.'} ok={dogReady} action="Io sono" onPress={onNavigate ? () => onNavigate('dog') : undefined} />
          <ChecklistRow title="Luogo" description={placeReady ? `${selectedPlace?.name ?? 'Luogo'} selezionato.` : 'Aspetta i luoghi o apri la Mappa.'} ok={placeReady} action="Mappa" onPress={onNavigate ? () => onNavigate('map') : undefined} />
          <ChecklistRow title="Safety" description={activeAlerts.length ? `${activeAlerts.length} alert attivi da leggere.` : 'Nessun alert attivo nella board.'} ok={activeAlerts.length === 0} action="Aiuto" onPress={onNavigate ? () => onNavigate('alerts') : undefined} />
        </View>
      </AppCard>

      <AppCard tone="warm">
        <View style={styles.sectionTitleRow}>
          <IconBubble source={baubookImages.icons.route} tone="teal" />
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>Rotta consigliata</Text>
            <Text style={styles.bodyText}>Scegli dove uscire. Il punteggio tiene conto di safety, tipo luogo e moderazione.</Text>
          </View>
        </View>

        <View style={styles.routeList}>
          {routePulses.length ? (
            routePulses.map((route) => (
              <Pressable
                key={route.place.id}
                onPress={() => setSelectedPlaceId(route.place.id)}
                style={({ pressed }) => [
                  styles.routeRow,
                  selectedPlace?.id === route.place.id && styles.routeRowSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Image source={route.place.icon} style={styles.routeIcon} />
                <View style={styles.routeCopy}>
                  <View style={styles.routeTop}>
                    <Text style={styles.routeTitle}>{route.place.name}</Text>
                    <Tag label={`${route.score}/100`} tone={route.tone} />
                  </View>
                  <Text style={styles.routeMeta}>{route.place.area} · {placeKindLabel(route.place.kind)} · {route.place.distanceLabel}</Text>
                  <Text style={styles.routeReason}>{route.reason}</Text>
                  <View style={styles.tagsRow}>
                    <Tag label={route.label} tone={route.tone} />
                    {selectedPlace?.id === route.place.id ? <Tag label="selezionato" tone="green" /> : null}
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.helperText}>Nessun luogo disponibile per ora. Controlla la connessione Supabase o la mappa demo.</Text>
          )}
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.sectionTitleRow}>
          <IconBubble source={baubookImages.icons.calendar} tone="warm" />
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>Crea passeggiata</Text>
            <Text style={styles.bodyText}>Programma un'uscita e lascia agli altri umani un messaggio chiaro.</Text>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Cane protagonista</Text>
          <View style={styles.chipRow}>
            {auth.dogs.length ? (
              auth.dogs.map((dog) => (
                <ChoiceChip key={dog.id} label={dog.name} selected={selectedDog?.id === dog.id} onPress={() => setSelectedDogId(dog.id)} />
              ))
            ) : (
              <Text style={styles.helperText}>Nessun cane ancora salvato.</Text>
            )}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Quando</Text>
          <View style={styles.chipRow}>
            {startOptions.map((option) => (
              <ChoiceChip key={option.label} label={option.label} selected={selectedMinutes === option.minutes} onPress={() => setSelectedMinutes(option.minutes)} />
            ))}
          </View>
          <Text style={styles.helperText}>Partenza prevista: {startsAtPreview}</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Messaggio del cane</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Es. giro tranquillo, no cani agitati, pausa acqua..."
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.input, styles.textArea]}
          />
        </View>

        <View style={styles.chipRow}>
          <ChoiceChip label="Accetto compagnia" selected={acceptsCompany} onPress={() => setAcceptsCompany(true)} />
          <ChoiceChip label="Meglio soli" selected={!acceptsCompany} onPress={() => setAcceptsCompany(false)} />
        </View>

        <View style={styles.actionRow}>
          <AppButton label="Crea passeggiata" icon={baubookImages.icons.walks} onPress={handleCreateWalk} disabled={!canUseLiveWrites || walksBoard.status === 'loading'} />
          <AppButton label="Aggiorna" variant="ghost" icon={baubookImages.icons.notifications} onPress={walksBoard.reload} />
        </View>

        <GateMessages authSignedIn={auth.isSignedIn} hasDog={auth.dogs.length > 0} placesLive={placesLive} />
        {walksBoard.errorMessage ? <Text style={styles.errorBox}>{walksBoard.errorMessage}</Text> : null}
        {walksBoard.actionMessage ? <Text style={styles.successBox}>{walksBoard.actionMessage}</Text> : null}
      </AppCard>

      <AppCard tone="teal">
        <View style={styles.sectionTitleRow}>
          <IconBubble source={baubookImages.icons.checkin} tone="teal" />
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>Presenza temporanea</Text>
            <Text style={styles.bodyText}>Dici “sono qui per un po'” senza tracking live continuo. Scade dopo 90 minuti.</Text>
          </View>
        </View>

        <View style={styles.chipRow}>
          {presenceOptions.map((option) => (
            <ChoiceChip key={option.status} label={option.label} selected={presenceStatus === option.status} onPress={() => setPresenceStatus(option.status)} />
          ))}
        </View>
        <Text style={styles.helperText}>{selectedPresenceOption.helper}</Text>

        <View style={styles.actionRow}>
          <AppButton label="Attiva presenza" icon={baubookImages.icons.checkin} onPress={handleStartPresence} disabled={!canUseLiveWrites || walksBoard.status === 'loading'} />
          <AppButton label="Chiudi mie presenze" variant="ghost" onPress={() => void walksBoard.endPresence()} disabled={!auth.isSignedIn || walksBoard.status === 'loading'} />
        </View>
      </AppCard>

      <AppCard tone={activeAlerts.length ? 'danger' : 'warm'}>
        <View style={styles.sectionTitleRow}>
          <IconBubble source={activeAlerts.length ? baubookImages.icons.danger : baubookImages.icons.safety} tone={activeAlerts.length ? 'danger' : 'teal'} />
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>{activeAlerts.length ? 'Safety prima di uscire' : 'Safety ok'}</Text>
            <Text style={styles.bodyText}>{safetyBoard.message}</Text>
            {safetyBoard.errorMessage ? <Text style={styles.errorText}>{safetyBoard.errorMessage}</Text> : null}
          </View>
        </View>

        {activeAlerts.length ? (
          <View style={styles.alertList}>
            {activeAlerts.slice(0, 3).map((alert) => (
              <View key={alert.id} style={styles.alertRow}>
                <Image source={alert.icon} style={styles.alertIcon} />
                <View style={styles.flexOne}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertMeta}>{alert.placeName} · {alert.ttlLabel} · {alert.radiusLabel}</Text>
                  <Text style={styles.alertDescription} numberOfLines={2}>{alert.description}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actionRow}>
          {onNavigate ? <AppButton label="Apri Aiuto" variant={activeAlerts.length ? 'danger' : 'ghost'} icon={baubookImages.icons.lostDog} onPress={() => onNavigate('alerts')} /> : null}
          {onNavigate ? <AppButton label="Vai alla Mappa" variant="ghost" icon={baubookImages.icons.map} onPress={() => onNavigate('map')} /> : null}
          <AppButton label="Ricarica safety" variant="ghost" icon={baubookImages.icons.notifications} onPress={safetyBoard.reload} />
        </View>
      </AppCard>

      <AppCard elevated={false}>
        <View style={styles.sectionTitleRow}>
          <IconBubble source={baubookImages.icons.friends} tone="warm" />
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>Passeggiate live</Text>
            <Text style={styles.bodyText}>Chi ha proposto una passeggiata e chi ha detto “sono in zona”.</Text>
          </View>
        </View>

        <View style={styles.walkList}>
          {walksBoard.walks.length ? (
            walksBoard.walks.map((plan) => (
              <View key={plan.id} style={styles.walkItem}>
                <View style={styles.walkHeader}>
                  <IconBubble source={baubookImages.icons.walks} size={46} tone="teal" />
                  <View style={styles.flexOne}>
                    <Text style={styles.walkTime}>{plan.startsAtLabel}</Text>
                    <Text style={styles.walkTitle}>{plan.dogName} va a {plan.placeName}</Text>
                    <Text style={styles.walkMessage}>“{plan.message}”</Text>
                    <Text style={styles.ownerText}>Umano: {plan.ownerName}</Text>
                    <View style={styles.tagsRow}>
                      {plan.tags.map((tag) => <Tag key={tag} label={tag} tone="teal" />)}
                      {plan.isMine ? <Tag label="mia" tone="green" /> : null}
                    </View>
                  </View>
                </View>
                {!plan.isMine ? (
                  <View style={styles.buttonWrap}>
                    <AppButton label="Mi interessa" variant="ghost" onPress={() => void walksBoard.joinPlan(plan.id, selectedDog?.id)} disabled={!auth.isSignedIn || walksBoard.status === 'loading'} />
                  </View>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Nessuna passeggiata live per ora</Text>
              <Text style={styles.helperText}>Crea la prima uscita BauBook e controlla Supabase: walk_plans e community_events si popoleranno.</Text>
            </View>
          )}
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Presenze attive</Text>
        <Text style={styles.bodyText}>Presenze leggere, temporanee e non geolocalizzazione continua.</Text>
        <View style={styles.presenceList}>
          {walksBoard.presences.length ? (
            walksBoard.presences.map((presence) => (
              <View key={presence.id} style={styles.presenceItem}>
                <Text style={styles.walkTitle}>{presence.dogName} · {presence.statusLabel}</Text>
                <Text style={styles.walkTime}>{presence.placeName} · {presence.expiresAtLabel}</Text>
                <Text style={styles.walkMessage}>“{presence.message}”</Text>
                <View style={styles.tagsRow}>{presence.tags.map((tag) => <Tag key={tag} label={tag} tone="green" />)}</View>
              </View>
            ))
          ) : (
            <Text style={styles.helperText}>Nessuna presenza attiva. Bene per la privacy, male per la scodinzolata.</Text>
          )}
        </View>
      </AppCard>
    </Screen>
  );
}

function MetricBox({ title, value, label, tone }: { title: string; value: string; label: string; tone: ReadinessTone }) {
  return (
    <View style={[styles.metricBox, toneCards[tone]]}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ChecklistRow({ title, description, ok, action, onPress }: { title: string; description: string; ok: boolean; action: string; onPress?: () => void }) {
  return (
    <View style={styles.checkRow}>
      <View style={[styles.statusDot, ok ? styles.statusDotOk : styles.statusDotWarn]} />
      <View style={styles.flexOne}>
        <Text style={styles.checkTitle}>{title}</Text>
        <Text style={styles.checkDescription}>{description}</Text>
      </View>
      {onPress ? (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.smallLink, pressed && styles.pressed]}>
          <Text style={styles.smallLinkText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function GateMessages({ authSignedIn, hasDog, placesLive }: { authSignedIn: boolean; hasDog: boolean; placesLive: boolean }) {
  if (authSignedIn && hasDog && placesLive) {
    return null;
  }

  return (
    <View style={styles.gateBox}>
      {!authSignedIn ? <Text style={styles.gateText}>Accedi in Setup per creare passeggiate reali.</Text> : null}
      {authSignedIn && !hasDog ? <Text style={styles.gateText}>Salva il primo cane in “Io sono” per sbloccare la passeggiata.</Text> : null}
      {!placesLive ? <Text style={styles.gateText}>Scrittura disabilitata finché i luoghi non arrivano da Supabase live.</Text> : null}
    </View>
  );
}

function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.choiceChip, selected && styles.choiceChipSelected, pressed && styles.choiceChipPressed]}>
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
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
    lineHeight: 32,
    fontWeight: '900',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: typography.h2,
    fontWeight: '900',
  },
  bodyText: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '700',
  },
  helperText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '700',
  },
  readinessPanel: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  readinessScoreBox: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  readinessScore: {
    color: colors.primaryDark,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
  },
  readinessScoreLabel: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  readinessCopy: {
    flex: 1,
    gap: 2,
  },
  readinessTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricBox: {
    width: '48%',
    minHeight: 104,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  metricTitle: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '900',
  },
  metricLabel: {
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
  checkList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    padding: spacing.md,
  },
  statusDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
  },
  statusDotOk: {
    backgroundColor: colors.success,
  },
  statusDotWarn: {
    backgroundColor: colors.warning,
  },
  checkTitle: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  checkDescription: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '700',
  },
  smallLink: {
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  smallLinkText: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  routeList: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  routeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.76)',
    padding: spacing.md,
  },
  routeRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.tealSoft,
  },
  routeIcon: {
    width: 54,
    height: 54,
    resizeMode: 'contain',
  },
  routeCopy: {
    flex: 1,
    gap: 4,
  },
  routeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  routeTitle: {
    flex: 1,
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
  formGroup: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  label: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typography.body,
  },
  textArea: {
    minHeight: 94,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  choiceChip: {
    maxWidth: '100%',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  choiceChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.tealSoft,
  },
  choiceChipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  choiceChipText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },
  choiceChipTextSelected: {
    color: colors.primaryDark,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  gateBox: {
    marginTop: spacing.md,
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.orangeSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  gateText: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '800',
  },
  errorBox: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.redSoft,
    color: colors.danger,
    padding: spacing.md,
    fontSize: typography.small,
    fontWeight: '800',
  },
  successBox: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.greenSoft,
    color: colors.primaryDark,
    padding: spacing.md,
    fontSize: typography.small,
    fontWeight: '900',
  },
  alertList: {
    marginTop: spacing.lg,
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
  alertIcon: {
    width: 46,
    height: 46,
    resizeMode: 'contain',
  },
  alertTitle: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  alertMeta: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    lineHeight: 15,
    fontWeight: '900',
  },
  alertDescription: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '700',
  },
  walkList: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  walkItem: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    padding: spacing.md,
    gap: spacing.sm,
  },
  walkHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  walkTime: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  walkTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  walkMessage: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  ownerText: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  buttonWrap: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  emptyBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  presenceList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  presenceItem: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    padding: spacing.md,
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '800',
  },
});

const toneCards = StyleSheet.create({
  green: {
    backgroundColor: colors.greenSoft,
  },
  teal: {
    backgroundColor: colors.tealSoft,
  },
  orange: {
    backgroundColor: colors.orangeSoft,
  },
  red: {
    backgroundColor: colors.redSoft,
  },
});
