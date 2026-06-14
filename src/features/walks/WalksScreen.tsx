import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
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
import { getSupabaseClient } from '../../shared/lib/supabase';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';
import type { TabKey } from '../../shared/types/domain';

interface WalksScreenProps {
  onNavigate?: (tab: TabKey) => void;
}

type PresenceStatus = 'available' | 'walking' | 'playing' | 'dog_area';
type LocationMode = 'current' | 'manual';

interface LocationPayload {
  locationMode: LocationMode;
  locationLabel: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  manualAddress: string | null;
}

interface LiveLocationTarget {
  locationLabel?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  manualAddress?: string | null;
}

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
const homeReturnIcon = require('../../../assets/baubook/walks/home_return_icon.png') as ImageSourcePropType;

const startOptions: StartOption[] = [
  { label: 'Tra 30 min', minutes: 30 },
  { label: 'Tra 1 ora', minutes: 60 },
  { label: 'Tra 2 ore', minutes: 120 },
];

const presenceOptions: PresenceOption[] = [
  { label: 'Accetto compagnia', status: 'available', helper: 'Sono disponibile a incontrare altri cani.' },
  { label: 'Sto passeggiando', status: 'walking', helper: 'Gironzolo qui intorno senza meta.' },
  { label: 'Sto giocando', status: 'playing', helper: 'Sono in zona e ho voglia di socializzare.' },
  { label: 'Sono in area cani', status: 'dog_area', helper: 'Chi si fa una corsetta?' },
];

function formatStartPreview(minutes: number): string {
  const value = new Date(Date.now() + minutes * 60000);
  return value.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

function openLocationInNativeMaps(target: LiveLocationTarget) {
  const latitude = typeof target.locationLatitude === 'number' ? target.locationLatitude : null;
  const longitude = typeof target.locationLongitude === 'number' ? target.locationLongitude : null;
  const label = target.locationLabel || target.manualAddress || 'Posizione BauBook';
  const encodedLabel = encodeURIComponent(label);

  let fallbackUrl: string;
  let nativeUrl: string;

  if (latitude !== null && longitude !== null) {
    const coord = `${latitude},${longitude}`;
    fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${coord}`;
    nativeUrl =
      Platform.OS === 'ios'
        ? `maps://?q=${encodedLabel}&ll=${coord}`
        : Platform.OS === 'android'
          ? `geo:${coord}?q=${coord}(${encodedLabel})`
          : fallbackUrl;
  } else {
    const query = encodeURIComponent(target.manualAddress || label);
    fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    nativeUrl =
      Platform.OS === 'ios'
        ? `maps://?q=${query}`
        : Platform.OS === 'android'
          ? `geo:0,0?q=${query}`
          : fallbackUrl;
  }

  void Linking.openURL(nativeUrl).catch(() => Linking.openURL(fallbackUrl));
}
async function resolveReadableLocationLabel(latitude: number, longitude: number): Promise<string | null> {
  const client = getSupabaseClient();

  if (!client) {
    return null;
  }

  try {
    const { data, error } = await client.functions.invoke('resolve-location-label', {
      body: { latitude, longitude },
    });

    if (error || !data || typeof data.label !== 'string') {
      return null;
    }

    const label = data.label.trim();
    return label.length ? label : null;
  } catch {
    return null;
  }
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
  const [currentLocationPayload, setCurrentLocationPayload] = useState<LocationPayload | null>(null);
  const [locationStatusMessage, setLocationStatusMessage] = useState<string | null>(null);
  const [locationResolving, setLocationResolving] = useState(false);

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
  const hasMyActiveWalk = walksBoard.hasMyActiveWalk;
  const hasMyActivePresence = walksBoard.hasMyActivePresence;
  const actionDisabled = walksBoard.status === 'loading';
  const walkActionMessage = walksBoard.actionScope === 'walk' ? walksBoard.actionMessage : undefined;
  const walkErrorMessage = walksBoard.actionScope === 'walk' ? walksBoard.errorMessage : undefined;
  const presenceActionMessage = walksBoard.actionScope === 'presence' ? walksBoard.actionMessage : undefined;
  const presenceErrorMessage = walksBoard.actionScope === 'presence' ? walksBoard.errorMessage : undefined;
  const canCreateWalk = canUseLiveWrites && !hasMyActiveWalk;
  const canUpdateWalk = canUseLiveWrites && hasMyActiveWalk;
  const canCreatePresence = canUseLiveWrites && !hasMyActivePresence;
  const canUpdatePresence = canUseLiveWrites && hasMyActivePresence;
  const resolvedLocationLabel =
    locationMode === 'current'
      ? currentLocationPayload?.locationLabel ?? 'Posizione attuale da rilevare'
      : manualAddressValue || 'Indirizzo manuale da inserire';
  const cleanMessage = useMemo(() => message.trim() || 'Passeggiata BauBook senza messaggio.', [message]);

  const resolveCurrentLocationPayload = async (): Promise<LocationPayload | null> => {
    setLocationResolving(true);
    setLocationStatusMessage('Rilevo la posizione...');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setLocationStatusMessage('Permesso posizione non concesso. Usa un indirizzo manuale.');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const label = (await resolveReadableLocationLabel(latitude, longitude)) ?? 'Posizione condivisa';

      const payload: LocationPayload = {
        locationMode: 'current',
        locationLabel: label,
        locationLatitude: latitude,
        locationLongitude: longitude,
        manualAddress: null,
      };

      setCurrentLocationPayload(payload);
      setLocationStatusMessage(`Posizione rilevata: ${label}`);
      return payload;
    } catch {
      setLocationStatusMessage('Non riesco a leggere la posizione. Usa un indirizzo manuale.');
      return null;
    } finally {
      setLocationResolving(false);
    }
  };

  const resolveManualLocationPayload = async (): Promise<LocationPayload | null> => {
    if (!manualAddressReady) {
      setLocationStatusMessage('Inserisci almeno 10 caratteri per usare l’indirizzo manuale.');
      return null;
    }

    return {
      locationMode: 'manual',
      locationLabel: manualAddressValue,
      locationLatitude: null,
      locationLongitude: null,
      manualAddress: manualAddressValue,
    };
  };

  const prepareLocationPayload = async (): Promise<LocationPayload | null> => {
    if (locationMode === 'manual') {
      return resolveManualLocationPayload();
    }

    return currentLocationPayload ?? resolveCurrentLocationPayload();
  };

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
    if (!manualAddressReady) {
      return;
    }

    openLocationInNativeMaps({ locationLabel: manualAddressValue, manualAddress: manualAddressValue });
  };

  const handleCreateWalk = async () => {
    if (!canCreateWalk || !selectedDog || !selectedPlace) {
      return;
    }

    const locationPayload = await prepareLocationPayload();
    if (!locationPayload) {
      return;
    }

    void walksBoard.createPlan({
      dogId: selectedDog.id,
      placeId: selectedPlace.id,
      startsAtIso,
      message: cleanMessage,
      acceptsCompany,
      ...locationPayload,
    });
  };

  const handleStartPresence = async () => {
    if (!canCreatePresence || !selectedDog || !selectedPlace) {
      return;
    }

    const locationPayload = await prepareLocationPayload();
    if (!locationPayload) {
      return;
    }

    void walksBoard.startPresence({
      dogId: selectedDog.id,
      placeId: selectedPlace.id,
      status: presenceStatus,
      message: cleanMessage,
      expiresMinutes: 90,
      ...locationPayload,
    });
  };

  const handleUpdateWalk = async () => {
    if (!canUpdateWalk || !selectedDog || !selectedPlace) {
      return;
    }

    const locationPayload = await prepareLocationPayload();
    if (!locationPayload) {
      return;
    }

    void walksBoard.updatePlan({
      dogId: selectedDog.id,
      placeId: selectedPlace.id,
      startsAtIso,
      message: cleanMessage,
      acceptsCompany,
      ...locationPayload,
    });
  };

  const handleUpdatePresence = async () => {
    if (!canUpdatePresence || !selectedDog || !selectedPlace) {
      return;
    }

    const locationPayload = await prepareLocationPayload();
    if (!locationPayload) {
      return;
    }

    void walksBoard.updatePresence({
      dogId: selectedDog.id,
      placeId: selectedPlace.id,
      status: presenceStatus,
      message: cleanMessage,
      expiresMinutes: 90,
      ...locationPayload,
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
            <Text style={styles.bodyText}>La checklist minima per iniziare a divertirsi con BauBook!</Text>
          </View>
        </View>

        <View style={styles.checkList}>
          <ChecklistRow title="Account 👤" description={profileReady ? 'Profilo attivo.' : 'Accedi in Setup per scrivere dati reali.'} ok={profileReady} action="Setup" onPress={onNavigate ? () => onNavigate('profile') : undefined} />
          <ChecklistRow title="Attore 🐾" description={dogReady ? `${selectedDog?.name ?? 'Attore'} pronto.` : 'Crea il primo amico in Io sono.'} ok={dogReady} action="Io sono" onPress={onNavigate ? () => onNavigate('dog') : undefined} />
          <ChecklistRow title="Posizione 📍" description={locationReady ? resolvedLocationLabel : 'Usa la posizione attuale o inserisci un indirizzo.'} ok={locationReady} />
        </View>

        <View style={styles.locationPanel}>
          <Text style={styles.label}>Da dove parto</Text>
          <View style={styles.locationModeRow}>
            <LocationModeButton label="Posizione attuale" selected={locationMode === 'current'} onPress={() => { setLocationMode('current'); void resolveCurrentLocationPayload(); }} />
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
            <View style={styles.currentLocationBox}>
              <Text style={styles.helperText}>{locationStatusMessage ?? 'Rileva la posizione attuale per condividerla in modo utile agli altri utenti.'}</Text>
              <Pressable onPress={() => void resolveCurrentLocationPayload()} style={({ pressed }) => [styles.currentLocationAction, pressed && styles.pressed]}>
                <Text style={styles.currentLocationActionText}>{locationResolving ? 'Rilevo...' : 'Rileva posizione'}</Text>
              </Pressable>
            </View>
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
          <Text style={styles.locationSummary}>{resolvedLocationLabel}</Text>
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
          <ChoiceChip label="Meglio se ci conosciamo già!" selected={!acceptsCompany} onPress={() => setAcceptsCompany(false)} />
        </View>

        {hasMyActiveWalk ? (
          <View style={styles.businessNotice}>
            <Text style={styles.businessNoticeTitle}>Ora hai una passeggiata attiva</Text>
            <Text style={styles.helperText}>Puoi aggiornarla con le informazioni inserite qui sotto oppure chiuderla da 'Passeggiate live'.</Text>
          </View>
        ) : null}

        <View style={styles.splitActionRow}>
          <View style={styles.actionLeft}>
            <AppButton label="Crea" icon={baubookImages.icons.walks} onPress={handleCreateWalk} disabled={!canCreateWalk || actionDisabled} />
          </View>
          <View style={styles.actionRight}>
            <AppButton label="Aggiorna" variant="ghost" icon={baubookImages.icons.notifications} onPress={handleUpdateWalk} disabled={!canUpdateWalk || actionDisabled} />
          </View>
        </View>

        <GateMessages authSignedIn={auth.isSignedIn} hasDog={auth.dogs.length > 0} locationReady={locationReady} placesLive={placesLive} hasWritePlace={writePlaceReady} />
        {walkErrorMessage ? <Text style={styles.errorBox}>{walkErrorMessage}</Text> : null}
        {walkActionMessage ? <Text style={styles.successBox}>{walkActionMessage}</Text> : null}
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
          <Text style={styles.locationSummary}>{resolvedLocationLabel}</Text>
        </View>

        <View style={styles.chipRow}>
          {presenceOptions.map((option) => (
            <ChoiceChip key={option.status} label={option.label} selected={presenceStatus === option.status} onPress={() => setPresenceStatus(option.status)} />
          ))}
        </View>
        <Text style={styles.helperText}>{selectedPresenceOption.helper}</Text>

        {hasMyActivePresence ? (
          <View style={styles.businessNotice}>
            <Text style={styles.businessNoticeTitle}>Ora hai una presenza live attiva</Text>
            <Text style={styles.helperText}>Puoi aggiornarla con le informazioni inserite qui sopra oppure chiuderla da 'Presenze live'.</Text>
          </View>
        ) : null}

        <View style={styles.splitActionRow}>
          <View style={styles.actionLeft}>
            <AppButton label="Attiva" icon={baubookImages.icons.checkin} onPress={handleStartPresence} disabled={!canCreatePresence || actionDisabled} />
          </View>
          <View style={styles.actionRight}>
            <AppButton label="Aggiorna" variant="ghost" icon={baubookImages.icons.notifications} onPress={handleUpdatePresence} disabled={!canUpdatePresence || actionDisabled} />
          </View>
        </View>

        {presenceErrorMessage ? <Text style={styles.errorBox}>{presenceErrorMessage}</Text> : null}
        {presenceActionMessage ? <Text style={styles.successBox}>{presenceActionMessage}</Text> : null}
      </AppCard>

      <AppCard elevated={false}>
        <View style={styles.sectionTitleRow}>

          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>Passeggiate live 🚶🏻‍♀️</Text>

          </View>
        </View>


        <View style={styles.walkList}>
          {walksBoard.walks.length ? (
            walksBoard.walks.map((plan) => (
              <View key={plan.id} style={styles.walkItem}>
                <View style={styles.walkHeader}>
                  <WalkDogAvatar avatarUrl={plan.dogAvatarUrl} />
                  <View style={styles.flexOne}>
                    <Text style={styles.walkTime}>{plan.startsAtLabel}</Text>
                    <Text style={styles.walkTitle}>{plan.dogName} parte da {plan.placeName}</Text>
                    <Text style={styles.walkMessage}>“{plan.message}”</Text>
                    <LiveMapLink target={plan} />
                    <View style={styles.tagsRow}>
                      {plan.tags.map((tag) => <Tag key={tag} label={tag} tone="teal" />)}
                    </View>
                  </View>
                </View>
                {plan.isMine ? (
                  <View style={styles.centerButtonWrap}>
                    <AppButton label="Tornato a casa" variant="ghost" icon={homeReturnIcon} onPress={() => void walksBoard.endWalkPlan(plan.id)} disabled={actionDisabled} />
                  </View>
                ) : (
                  <View style={styles.buttonWrap}>
                    <AppButton label="Mi interessa" variant="ghost" onPress={() => void walksBoard.joinPlan(plan.id, selectedDog?.id)} disabled={!auth.isSignedIn || actionDisabled} />
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Nessuna passeggiata live per ora</Text>
              <Text style={styles.helperText}>Crea la prima uscita BauBook!</Text>
            </View>
          )}
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.sectionTitleRow}>

          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>Presenze live 🐕</Text>
          </View>
        </View>

        <View style={styles.presenceList}>
          {walksBoard.presences.length ? (
            walksBoard.presences.map((presence) => (
              <View key={presence.id} style={styles.presenceItem}>
                <View style={styles.walkHeader}>
                  <WalkDogAvatar avatarUrl={presence.dogAvatarUrl} />
                  <View style={styles.flexOne}>
                    <Text style={styles.walkTitle}>{presence.dogName} · {presence.statusLabel}</Text>
                    <Text style={styles.walkTime}>{presence.placeName} · {presence.expiresAtLabel}</Text>
                    <Text style={styles.walkMessage}>“{presence.message}”</Text>
                    <LiveMapLink target={presence} />
                    <View style={styles.tagsRow}>{presence.tags.map((tag) => <Tag key={tag} label={tag} tone="green" />)}</View>
                  </View>
                </View>
                {presence.isMine ? (
                  <View style={styles.centerButtonWrap}>
                    <AppButton label="Tornato a casa" variant="ghost" icon={homeReturnIcon} onPress={() => void walksBoard.endPresence()} disabled={actionDisabled} />
                  </View>
                ) : null}
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

function LiveMapLink({ target }: { target: LiveLocationTarget }) {
  const hasLocation =
    typeof target.locationLatitude === 'number' ||
    typeof target.locationLongitude === 'number' ||
    Boolean(target.manualAddress || target.locationLabel);

  if (!hasLocation) {
    return null;
  }

  return (
    <Pressable onPress={() => openLocationInNativeMaps(target)} style={({ pressed }) => [styles.liveMapLink, pressed && styles.pressed]}>
      <Image source={baubookImages.icons.map} style={styles.liveMapIcon} />
      <Text style={styles.liveMapText}>Apri mappa</Text>
    </Pressable>
  );
}

function WalkDogAvatar({ avatarUrl }: { avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <View style={styles.walkDogAvatarFrame}>
        <Image source={{ uri: avatarUrl }} style={styles.walkDogAvatarImage} />
      </View>
    );
  }

  return <IconBubble source={baubookImages.icons.walks} size={54} tone="teal" />;
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
  currentLocationBox: {
    gap: spacing.sm,
  },
  currentLocationAction: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.tealSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  currentLocationActionText: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
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
  businessNotice: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  businessNoticeTitle: {
    color: colors.primaryDark,
    fontSize: typography.body,
    fontWeight: '900',
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
  walkDogAvatarFrame: {
    width: 54,
    height: 54,
    borderRadius: 24,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walkDogAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  liveMapLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: spacing.xs,
  },
  liveMapIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  liveMapText: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
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
  centerButtonWrap: {
    marginTop: spacing.md,
    alignItems: 'center',
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
