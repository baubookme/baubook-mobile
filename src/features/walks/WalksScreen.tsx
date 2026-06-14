import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { baubookImages } from '../../shared/assets/images';
import { useAuthAccount } from '../../shared/auth/AuthProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { Tag } from '../../shared/components/Tag';
import { useSupabasePlaces } from '../../shared/hooks/useSupabasePublicData';
import { useWalksBoard } from '../../shared/hooks/useWalksBoard';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';
import type { TabKey } from '../../shared/types/domain';

interface WalksScreenProps {
  onNavigate?: (tab: TabKey) => void;
}

type PresenceStatus = 'available' | 'walking' | 'playing';
type LocationMode = 'current' | 'manual';

interface StartOption {
  label: string;
  minutes: number;
}

interface PresenceOption {
  label: string;
  status: PresenceStatus;
  helper: string;
}

const walkHubIntroImage = require('../../../assets/baubook/walks/walk_hub_intro.png') as ImageSourcePropType;

const startOptions: StartOption[] = [
  { label: 'Tra 30 min', minutes: 30 },
  { label: 'Tra 1 ora', minutes: 60 },
  { label: 'Tra 2 ore', minutes: 120 },
];

const presenceOptions: PresenceOption[] = [
  { label: 'Accetto compagnia', status: 'available', helper: 'Sono disponibile a incontrare altri cani.' },
  { label: 'Sto passeggiando', status: 'walking', helper: 'Presenza morbida: sto facendo un giro.' },
  { label: 'Sto giocando', status: 'playing', helper: 'Sono in zona e ho voglia di socializzare.' },
];

function formatStartPreview(minutes: number): string {
  const value = new Date(Date.now() + minutes * 60000);
  return value.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

export function WalksScreen({ onNavigate }: WalksScreenProps) {
  const auth = useAuthAccount();
  const placesState = useSupabasePlaces();
  const walksBoard = useWalksBoard(auth.profile?.id);

  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState(60);
  const [acceptsCompany, setAcceptsCompany] = useState(true);
  const [message, setMessage] = useState('Passeggiata tranquilla, annusata contemplativa.');
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('walking');
  const [locationMode, setLocationMode] = useState<LocationMode>('current');
  const [manualAddress, setManualAddress] = useState('');

  const livePlaces = useMemo(
    () => placesState.places.filter((place) => place.moderationStatus !== 'removed'),
    [placesState.places],
  );

  const selectedDog = auth.dogs.find((dog) => dog.id === selectedDogId) ?? auth.dogs[0] ?? null;
  const selectedPlace = livePlaces.find((place) => place.id === selectedPlaceId) ?? livePlaces[0] ?? null;
  const profileReady = auth.isSignedIn && Boolean(auth.profile);
  const dogReady = Boolean(selectedDog);
  const manualAddressValue = manualAddress.trim();
  const manualAddressReady = manualAddressValue.length >= 10;
  const locationReady = locationMode === 'current' || manualAddressReady;
  const placesLive = placesState.source === 'supabase';
  const writePlaceReady = Boolean(selectedPlace);
  const canUseLiveWrites = profileReady && dogReady && locationReady && placesLive && writePlaceReady;

  const startsAtIso = useMemo(() => new Date(Date.now() + selectedMinutes * 60000).toISOString(), [selectedMinutes]);
  const startsAtPreview = useMemo(() => formatStartPreview(selectedMinutes), [selectedMinutes]);
  const selectedPresenceOption = presenceOptions.find((option) => option.status === presenceStatus) ?? presenceOptions[1];
  const locationLabel = locationMode === 'current' ? 'Posizione attuale' : manualAddressValue || 'Indirizzo manuale da inserire';
  const messageWithLocation = useMemo(() => {
    const cleanMessage = message.trim() || 'Passeggiata BauBook senza messaggio.';
    return `${cleanMessage}\n\n📍 ${locationLabel}`;
  }, [locationLabel, message]);

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

  const handleOpenManualAddressInMaps = () => {
    const address = manualAddressValue;
    if (!manualAddressReady) {
      return;
    }

    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
  };

  const handleCreateWalk = () => {
    if (!canUseLiveWrites || !selectedDog || !selectedPlace) {
      return;
    }

    void walksBoard.createPlan({
      dogId: selectedDog.id,
      placeId: selectedPlace.id,
      startsAtIso,
      message: messageWithLocation,
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
      message: messageWithLocation,
      expiresMinutes: 90,
    });
  };

  return (
    <Screen>
      <AppCard tone="teal">
        <View style={styles.heroHeader}>
          <View style={styles.heroImageFrame}>
            <Image source={walkHubIntroImage} style={styles.heroWalkImage} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.bodyText}>
              Il punto operativo per uscire: amici, posizione, presenza e passeggiata in corso in una sola schermata.
            </Text>
          </View>
        </View>
      </AppCard>

      <AppCard elevated={false}>
        <View style={styles.sectionTitleRow}>
          <IconBubble source={baubookImages.icons.checkin} tone="warm" />
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>Pre-partenza</Text>
            <Text style={styles.bodyText}>La checklist minima per uscire senza fare confusione.</Text>
          </View>
        </View>

        <View style={styles.checkList}>
          <ChecklistRow title="Account 👤" description={profileReady ? 'Profilo attivo.' : 'Accedi in Setup per scrivere dati reali.'} ok={profileReady} action="Setup" onPress={onNavigate ? () => onNavigate('profile') : undefined} />
          <ChecklistRow title="Attore 🐾" description={dogReady ? `${selectedDog?.name ?? 'Attore'} pronto.` : 'Crea il primo amico in Io sono.'} ok={dogReady} action="Io sono" onPress={onNavigate ? () => onNavigate('dog') : undefined} />
          <ChecklistRow title="Posizione 📍" description={locationReady ? locationLabel : 'Usa la posizione attuale o inserisci un indirizzo.'} ok={locationReady} />
        </View>

        <View style={styles.locationPanel}>
          <Text style={styles.label}>Da dove parto</Text>
          <View style={styles.locationModeRow}>
            <LocationModeButton label="Posizione attuale" selected={locationMode === 'current'} onPress={() => setLocationMode('current')} />
            <LocationModeButton label="Indirizzo manuale" selected={locationMode === 'manual'} onPress={() => setLocationMode('manual')} />
          </View>
          {locationMode === 'manual' ? (
            <View style={styles.manualAddressBlock}>
              <View style={[styles.addressInputShell, !manualAddressReady && manualAddressValue.length > 0 && styles.addressInputShellWarn]}>
                <TextInput
                  value={manualAddress}
                  onChangeText={setManualAddress}
                  placeholder="Es. Via Roma 10, Mestre"
                  placeholderTextColor={colors.muted}
                  style={styles.addressInput}
                />
                <Pressable
                  disabled={!manualAddressReady}
                  onPress={handleOpenManualAddressInMaps}
                  style={({ pressed }) => [styles.mapsInlineAction, !manualAddressReady && styles.mapsInlineActionDisabled, pressed && styles.pressed]}
                >
                  <Image source={baubookImages.icons.map} style={styles.mapsInlineIcon} />
                </Pressable>
              </View>
              <Text style={manualAddressReady || manualAddressValue.length === 0 ? styles.helperText : styles.warningText}>Inserisci almeno 10 caratteri per usare l’indirizzo manuale.</Text>
            </View>
          ) : (
            <Text style={styles.helperText}>Useremo la posizione attuale come punto di partenza visibile nel messaggio.</Text>
          )}
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.sectionTitleRow}>
          <IconBubble source={baubookImages.icons.calendar} tone="warm" />
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>Crea passeggiata</Text>
            <Text style={styles.bodyText}>Programma un'uscita e lascia agli altri un messaggio chiaro.</Text>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Attore protagonista 👉</Text>
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
          <Text style={styles.label}>Posizione</Text>
          <Text style={styles.locationSummary}>{locationLabel}</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Messaggio</Text>
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

        <View style={styles.splitActionRow}>
          <View style={styles.actionLeft}>
            <AppButton label="Crea" icon={baubookImages.icons.walks} onPress={handleCreateWalk} disabled={!canUseLiveWrites || walksBoard.status === 'loading'} />
          </View>
          <View style={styles.actionRight}>
            <AppButton label="Aggiorna" variant="ghost" icon={baubookImages.icons.notifications} onPress={walksBoard.reload} />
          </View>
        </View>

        <GateMessages authSignedIn={auth.isSignedIn} hasDog={auth.dogs.length > 0} locationReady={locationReady} placesLive={placesLive} hasWritePlace={writePlaceReady} />
        {walksBoard.errorMessage ? <Text style={styles.errorBox}>{walksBoard.errorMessage}</Text> : null}
        {walksBoard.actionMessage ? <Text style={styles.successBox}>{walksBoard.actionMessage}</Text> : null}
      </AppCard>

      <AppCard tone="teal">
        <View style={styles.sectionTitleRow}>
          <IconBubble source={baubookImages.icons.checkin} tone="teal" />
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>Presenza temporanea</Text>
            <Text style={styles.bodyText}>“Sono qui per un po'” senza tracking live continuo. Scade dopo 90 minuti.</Text>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Posizione</Text>
          <Text style={styles.locationSummary}>{locationLabel}</Text>
        </View>

        <View style={styles.chipRow}>
          {presenceOptions.map((option) => (
            <ChoiceChip key={option.status} label={option.label} selected={presenceStatus === option.status} onPress={() => setPresenceStatus(option.status)} />
          ))}
        </View>
        <Text style={styles.helperText}>{selectedPresenceOption.helper}</Text>

        <View style={styles.splitActionRow}>
          <View style={styles.actionLeft}>
            <AppButton label="Attiva" icon={baubookImages.icons.checkin} onPress={handleStartPresence} disabled={!canUseLiveWrites || walksBoard.status === 'loading'} />
          </View>
          <View style={styles.actionRight}>
            <AppButton label="Aggiorna" variant="ghost" icon={baubookImages.icons.notifications} onPress={() => void walksBoard.endPresence()} disabled={!auth.isSignedIn || walksBoard.status === 'loading'} />
          </View>
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
              <Text style={styles.helperText}>Crea la prima uscita BauBook e controlla Supabase.</Text>
            </View>
          )}
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Presenze attive</Text>
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

function ChecklistRow({ title, description, ok, action, onPress }: { title: string; description: string; ok: boolean; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.checkRow}>
      <View style={[styles.statusDot, ok ? styles.statusDotOk : styles.statusDotWarn]} />
      <View style={styles.flexOne}>
        <Text style={styles.checkTitle}>{title}</Text>
        <Text style={styles.checkDescription}>{description}</Text>
      </View>
      {onPress && action ? (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.smallLink, pressed && styles.pressed]}>
          <Text style={styles.smallLinkText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function GateMessages({
  authSignedIn,
  hasDog,
  locationReady,
  placesLive,
  hasWritePlace,
}: {
  authSignedIn: boolean;
  hasDog: boolean;
  locationReady: boolean;
  placesLive: boolean;
  hasWritePlace: boolean;
}) {
  if (authSignedIn && hasDog && locationReady && placesLive && hasWritePlace) {
    return null;
  }

  return (
    <View style={styles.gateBox}>
      {!authSignedIn ? <Text style={styles.gateText}>Accedi in Setup per creare passeggiate reali.</Text> : null}
      {authSignedIn && !hasDog ? <Text style={styles.gateText}>Salva il primo cane in “Io sono” per sbloccare la passeggiata.</Text> : null}
      {!locationReady ? <Text style={styles.gateText}>Scegli la posizione attuale o inserisci un indirizzo manuale di almeno 10 caratteri.</Text> : null}
      {!placesLive ? <Text style={styles.gateText}>Scrittura disabilitata finché i luoghi non arrivano da Supabase live.</Text> : null}
      {placesLive && !hasWritePlace ? <Text style={styles.gateText}>Serve almeno un luogo live disponibile per registrare la passeggiata.</Text> : null}
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

function LocationModeButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.locationModeButton, selected && styles.locationModeButtonSelected, pressed && styles.choiceChipPressed]}>
      <Text style={[styles.locationModeButtonText, selected && styles.locationModeButtonTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  heroImageFrame: {
    width: 112,
    height: 112,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroWalkImage: {
    width: 112,
    height: 112,
    resizeMode: 'cover',
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
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
  warningText: {
    color: colors.warning,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '900',
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
  locationPanel: {
    marginTop: spacing.lg,
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.74)',
    padding: spacing.md,
  },
  locationModeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  locationModeButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationModeButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.tealSoft,
  },
  locationModeButtonText: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  locationModeButtonTextSelected: {
    color: colors.primaryDark,
  },
  manualAddressBlock: {
    gap: spacing.xs,
  },
  addressInputShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  addressInputShellWarn: {
    borderColor: colors.warning,
    backgroundColor: colors.orangeSoft,
  },
  addressInput: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.body,
  },
  mapsInlineAction: {
    width: 62,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.tealSoft,
  },
  mapsInlineActionDisabled: {
    backgroundColor: colors.surfaceWarm,
  },
  mapsInlineIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  locationSummary: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 20,
    fontWeight: '800',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  splitActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  actionRight: {
    flex: 1,
    alignItems: 'flex-end',
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
});
