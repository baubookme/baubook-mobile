import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fetchNearbyDogAreas, type NearbyDogAreaModel } from '../../shared/api/supabaseContent';
import { baubookImages } from '../../shared/assets/images';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { Tag } from '../../shared/components/Tag';
import { savePageVisibilityLocation, usePageVisibilitySettings } from '../../shared/hooks/usePageVisibilitySettings';
import { useSupabasePlaces } from '../../shared/hooks/useSupabasePublicData';
import { getSupabaseClient } from '../../shared/lib/supabase';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';
import { NativePlacesMap } from './NativePlacesMap';

const dogAreaCartoonIcon = require('../../../assets/baubook/map/dog_area_cartoon_integrated.png');

const radiusOptions = [1, 3, 5, 10];

function formatSearchRadiusLabel(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const label = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',');
  return `${label} km`;
}

type NearbyStatus = 'idle' | 'loading' | 'success' | 'error';

interface NearbyState {
  status: NearbyStatus;
  source: 'supabase' | 'empty' | 'unavailable' | null;
  areas: NearbyDogAreaModel[];
  message: string;
  errorMessage?: string;
  positionLabel?: string;
}

interface LastNearbySearch {
  latitude: number;
  longitude: number;
  radiusKm: number;
  accuracy?: number | null;
  locationLabel?: string | null;
}

interface ResolvedCurrentPosition {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  locationLabel: string | null;
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

const CURRENT_POSITION_TIMEOUT_MS = 8000;
const LOCATION_LABEL_TIMEOUT_MS = 3000;

function isUsableCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    (latitude !== 0 || longitude !== 0)
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

async function toResolvedPosition(
  position: Location.LocationObject | null | undefined,
  fallbackLabel: string,
): Promise<ResolvedCurrentPosition | null> {
  if (!position?.coords) {
    return null;
  }

  const { latitude, longitude, accuracy } = position.coords;

  if (!isUsableCoordinate(latitude, longitude)) {
    return null;
  }

  const locationLabel =
    (await withTimeout(resolveReadableLocationLabel(latitude, longitude), LOCATION_LABEL_TIMEOUT_MS)) ?? fallbackLabel;

  return {
    latitude,
    longitude,
    accuracy,
    locationLabel,
  };
}

async function readCurrentPosition(): Promise<ResolvedCurrentPosition> {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== 'granted') {
    throw new Error('Permesso posizione non concesso. Autorizza la rilevazione dal dispositivo.');
  }

  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 5 * 60 * 1000,
    requiredAccuracy: 5000,
  }).catch(() => null);

  const resolvedLastKnown = await toResolvedPosition(lastKnown, '-');

  if (resolvedLastKnown) {
    return resolvedLastKnown;
  }

  const current = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
    CURRENT_POSITION_TIMEOUT_MS,
  );

  const resolvedCurrent = await toResolvedPosition(current, 'Posizione condivisa');

  if (resolvedCurrent) {
    return resolvedCurrent;
  }

  throw new Error('Impossibile leggere la posizione attuale dal dispositivo.');
}

function formatCoordinate(value: number): string {
  return value.toFixed(5).replace('.', ',');
}

function cleanText(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.trim();
  return cleaned.length ? cleaned : null;
}

function uniqueParts(parts: Array<string | null>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const part of parts) {
    if (!part) {
      continue;
    }

    const key = part.toLocaleLowerCase('it-IT');
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(part);
  }

  return output;
}

function buildDogAreaNavigationQuery(area: NearbyDogAreaModel): string {
  const textQuery = uniqueParts([
    cleanText(area.name),
    cleanText(area.addressLabel),
    cleanText(area.area),
  ]).join(', ');

  if (textQuery.length) {
    return textQuery;
  }

  return `${area.latitude},${area.longitude}`;
}

function openDogAreaNavigation(area: NearbyDogAreaModel): void {
  const query = encodeURIComponent(buildDogAreaNavigationQuery(area));
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${query}`;

  if (Platform.OS === 'ios') {
    void Linking.openURL(`maps://?daddr=${query}`).catch(() => Linking.openURL(fallbackUrl));
    return;
  }

  if (Platform.OS === 'android') {
    void Linking.openURL(`google.navigation:q=${query}`).catch(() =>
      Linking.openURL(`geo:0,0?q=${query}`).catch(() => Linking.openURL(fallbackUrl)),
    );
    return;
  }

  void Linking.openURL(fallbackUrl);
}

export function MapScreen() {
  const { source, reload, realtimeStatus } = useSupabasePlaces();
  const pageVisibility = usePageVisibilitySettings();
  const savedLocationSearchKeyRef = useRef<string | null>(null);
  const initializedRadiusFromGlobalRef = useRef(false);
  const hasLocalRadiusOverrideRef = useRef(false);

  const [radiusKm, setRadiusKm] = useState(3);
  const [manualRadius, setManualRadius] = useState('3');
  const [nearby, setNearby] = useState<NearbyState>({
    status: 'idle',
    source: null,
    areas: [],
    message: 'Scegli il raggio e usa la posizione attuale per trovare le aree cani ufficiali vicine.',
  });
  const [lastNearbySearch, setLastNearbySearch] = useState<LastNearbySearch | null>(null);

  const nearbyMapPlaces = nearby.areas;
  const nearbyPreview = nearbyMapPlaces.slice(0, 5);
  const hiddenNearbyCount = Math.max(nearbyMapPlaces.length - nearbyPreview.length, 0);

  const handleManualRadiusChange = (value: string) => {
    hasLocalRadiusOverrideRef.current = true;

    const cleaned = value.replace(',', '.').replace(/[^0-9.]/g, '');
    setManualRadius(cleaned);

    const parsed = Number(cleaned);
    if (Number.isFinite(parsed) && parsed >= 0.2 && parsed <= 50) {
      setRadiusKm(parsed);
    }
  };

  const runNearbySearch = async (search: LastNearbySearch) => {
    const result = await fetchNearbyDogAreas({
      latitude: search.latitude,
      longitude: search.longitude,
      radiusKm: search.radiusKm,
      limit: 24,
    });

    const accuracyLabel =
      typeof search.accuracy === 'number'
        ? ` · accuratezza circa ${Math.round(search.accuracy)} m`
        : '';

    const coordinatesLabel = `${formatCoordinate(search.latitude)}, ${formatCoordinate(search.longitude)}`;

    setNearby({
      status: 'success',
      source: result.source,
      areas: result.areas,
      message: result.message,
      errorMessage: result.errorMessage,
      positionLabel: `${search.locationLabel ?? coordinatesLabel}${accuracyLabel}`,
    });
  };


  useEffect(() => {
    if (!pageVisibility.loaded || initializedRadiusFromGlobalRef.current || hasLocalRadiusOverrideRef.current) {
      return;
    }

    initializedRadiusFromGlobalRef.current = true;
    setRadiusKm(pageVisibility.radiusKm);
    setManualRadius(String(pageVisibility.radiusKm));
  }, [pageVisibility.loaded, pageVisibility.radiusKm]);

  useEffect(() => {
    if (!pageVisibility.loaded || !pageVisibility.location) {
      return;
    }

    const savedLocation = pageVisibility.location;
    const searchRadiusKm = hasLocalRadiusOverrideRef.current ? radiusKm : pageVisibility.radiusKm;
    const searchRadiusLabel = formatSearchRadiusLabel(searchRadiusKm);
    const searchKey = `${savedLocation.savedAtIso}:${searchRadiusKm}`;

    if (savedLocationSearchKeyRef.current === searchKey) {
      return;
    }

    savedLocationSearchKeyRef.current = searchKey;

    const search: LastNearbySearch = {
      latitude: savedLocation.latitude,
      longitude: savedLocation.longitude,
      radiusKm: searchRadiusKm,
      accuracy: null,
      locationLabel: savedLocation.label,
    };

    if (!hasLocalRadiusOverrideRef.current) {
      setRadiusKm(pageVisibility.radiusKm);
      setManualRadius(String(pageVisibility.radiusKm));
    }

    setLastNearbySearch(search);
    setNearby((current) => ({
      ...current,
      status: 'loading',
      message: `Uso la posizione aggiornata e cerco nel raggio di ${searchRadiusLabel}...`,
      errorMessage: undefined,
      positionLabel: savedLocation.label,
    }));

    void runNearbySearch(search).catch((error) => {
      const fallbackMessage = error instanceof Error ? error.message : JSON.stringify(error);

      setNearby((current) => ({
        ...current,
        status: 'error',
        message: 'Ho trovato la posizione salvata, ma non riesco a caricare i luoghi vicini.',
        errorMessage: fallbackMessage,
        positionLabel: savedLocation.label,
      }));
    });
  }, [pageVisibility.loaded, pageVisibility.location, pageVisibility.radiusKm, pageVisibility.radiusLabel]);

  const handleCurrentPositionSearch = async () => {
    setNearby((current) => ({
      ...current,
      status: 'loading',
      message: `Chiedo la posizione al dispositivo e cerco le aree ufficiali nel raggio di ${formatSearchRadiusLabel(radiusKm)}...`,
      errorMessage: undefined,
    }));

    try {
      const position = await readCurrentPosition();
      const search: LastNearbySearch = {
        latitude: position.latitude,
        longitude: position.longitude,
        radiusKm,
        accuracy: position.accuracy,
        locationLabel: position.locationLabel,
      };

      await savePageVisibilityLocation({
        latitude: position.latitude,
        longitude: position.longitude,
        label: position.locationLabel ?? 'Posizione salvata',
        savedAtIso: new Date().toISOString(),
      });

      setLastNearbySearch(search);
      await runNearbySearch(search);
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : JSON.stringify(error);

      setNearby((current) => ({
        ...current,
        status: 'error',
        message: 'Non riesco a leggere la posizione attuale. Se disponibile mantengo l’ultima rilevata.',
        errorMessage: fallbackMessage,
      }));
    }
  };

  const handleMapRefresh = async () => {
    setNearby((current) => ({
      ...current,
      status: lastNearbySearch ? 'loading' : current.status,
      message: lastNearbySearch
        ? `Ricarico i luoghi dal database e aggiorno la ricerca nel raggio di ${formatSearchRadiusLabel(radiusKm)}...`
        : 'Ricarico i luoghi dal database...',
      errorMessage: undefined,
    }));

    try {
      await Promise.resolve(reload());

      if (lastNearbySearch) {
        const search: LastNearbySearch = {
          ...lastNearbySearch,
          radiusKm,
        };
        setLastNearbySearch(search);
        await runNearbySearch(search);
        return;
      }

      setNearby((current) => ({
        ...current,
        message: 'Luoghi ricaricati. Usa la posizione attuale per vedere solo quelli vicini e utili.',
      }));
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : JSON.stringify(error);

      setNearby((current) => ({
        ...current,
        status: 'error',
        message: 'Non riesco ad aggiornare i luoghi dal database.',
        errorMessage: fallbackMessage,
      }));
    }
  };

  return (
    <Screen>
      <View style={styles.mapHeader}>
        <View style={styles.mapHeaderTop}>
          <Text style={styles.mapEyebrow}>Mappa live BauBook</Text>
          <Pressable
            onPress={() => {
              void handleMapRefresh();
            }}
            style={({ pressed }) => [styles.mapRefreshButton, pressed && styles.mapRefreshButtonPressed]}
          >
            <Text style={styles.mapRefreshText}>Aggiorna</Text>
          </Pressable>
        </View>

        <Text style={styles.mapTitle}>
          {nearbyMapPlaces.length ? 'Risultati sulla mappa' : 'Cerca per visualizzare i marker'}
        </Text>

        <Text style={styles.mapDescription}>
          {nearbyMapPlaces.length
            ? 'I marker sono limitati alle aree trovate nel raggio selezionato.'
            : 'La mappa resta pronta: dopo la ricerca mostrerà solo i luoghi coinvolti nel filtro.'}
        </Text>
      </View>

      <AppCard tone="teal">
        <View style={styles.searchHeader}>
          <Image source={dogAreaCartoonIcon} style={styles.dogAreaHeroIcon} />
          <View style={styles.searchCopy}>
            <Text style={styles.cardTitle}>Trova area cani nel raggio di {formatSearchRadiusLabel(radiusKm)}</Text>
            <Text style={styles.bodyText}>Usa la posizione attuale per vedere solo le aree cani davvero vicine.</Text>
          </View>
        </View>

        <Text style={styles.label}>Raggio rapido</Text>
        <View style={styles.radiusRow}>
          {radiusOptions.map((option) => (
            <RadiusChip
              key={option}
              label={`${option} km`}
              selected={radiusKm === option}
              onPress={() => {
                hasLocalRadiusOverrideRef.current = true;
                setRadiusKm(option);
                setManualRadius(String(option));
              }}
            />
          ))}
        </View>

        <View style={styles.manualRow}>
          <View style={styles.manualInputWrap}>
            <Text style={styles.label}>Manuale</Text>
            <TextInput
              value={manualRadius}
              onChangeText={handleManualRadiusChange}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="3"
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.manualHintWrap}>
            <Text style={styles.helperText}>Raggio massimo: 50 km. Consigliato in città: 3 km.</Text>
          </View>
        </View>

        <View style={styles.actionRow_center}>
          <AppButton
            label={nearby.status === 'loading' ? 'Cerco...' : 'Usa posizione attuale'}
            onPress={handleCurrentPositionSearch}
            disabled={nearby.status === 'loading'}
          />
        </View>

        <View style={styles.nearbyStatusBox}>
          <Text style={styles.nearbyStatusTitle}>
            {nearby.status === 'loading'
              ? 'Ricerca in corso'
              : nearby.source === 'supabase'
                ? 'Risultato live'
                : 'Stato ricerca'}
          </Text>
          <Text style={styles.bodyText}>{nearby.message}</Text>
          {nearby.positionLabel ? <Text style={styles.helperText}>Posizione rilevata: {nearby.positionLabel}</Text> : null}
          {nearby.errorMessage ? <Text style={styles.errorText}>{nearby.errorMessage}</Text> : null}
        </View>
      </AppCard>

      <View style={styles.mapSection}>
        <NativePlacesMap
          places={nearbyMapPlaces}
          source={source}
          realtimeStatus={realtimeStatus}
        />
      </View>

      {nearbyPreview.length ? (
        <View style={styles.list}>
          <SectionHeader
            eyebrow="Risultati"
            title="Aree cani trovate"
            description={
              hiddenNearbyCount
                ? `Ecco le prime ${nearbyPreview.length} aree nell'elenco. Le altre ${hiddenNearbyCount} restano presenti come pin sulla mappa.`
                : 'Per arrivarci clicca \'Apri navigazione\' nella card.'
            }
          />

          {nearbyPreview.map((area) => (
            <NearbyDogAreaCard
              key={area.id}
              area={area}
              onOpenNavigation={() => openDogAreaNavigation(area)}
            />
          ))}
        </View>
      ) : null}

      <AppCard tone="warm">
        <View style={styles.inlineAction}>
          <IconBubble source={baubookImages.icons.vet} tone="warm" />
          <View style={styles.actionCopy}>
            <Text style={styles.cardTitle}>Mi serve un dottore...</Text>
            <Text style={styles.bodyText}>Veterinari e servizi verranno mostrati quando saranno disponibili nel database BauBook.</Text>
          </View>
        </View>
      </AppCard>
    </Screen>
  );
}

function RadiusChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.radiusChip,
        selected && styles.radiusChipSelected,
        pressed && styles.radiusChipPressed,
      ]}
    >
      <Text style={[styles.radiusChipText, selected && styles.radiusChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function NearbyDogAreaCard({
  area,
  onOpenNavigation,
}: {
  area: NearbyDogAreaModel;
  onOpenNavigation: () => void;
}) {
  return (
    <AppCard elevated={false}>
      <View style={styles.placeHeader}>
        <Image source={dogAreaCartoonIcon} style={styles.dogAreaResultIcon} />
        <View style={styles.placeCopy}>
          <Text style={styles.placeName}>{area.name}</Text>
          <Text style={styles.placeMeta}>
            {area.distanceLabel} · {area.area}
          </Text>
          <Text style={styles.placeDescription}>{area.addressLabel}</Text>
        </View>
      </View>

      <View style={styles.tagsRow}>
        {area.tags.slice(0, 4).map((tag) => (
          <Tag key={tag} label={tag} tone="green" />
        ))}
      </View>

      <View style={styles.placeFooter}>
        <View>
          <Text style={styles.score}>{area.scoreLabel}</Text>
          <Text style={styles.coordinates}>
            {area.latitude.toFixed(5)}, {area.longitude.toFixed(5)}
          </Text>
        </View>

        <AppButton label="Apri navigazione" onPress={onOpenNavigation} variant="ghost" />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  searchHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  searchCopy: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.xs,
  },
  dogAreaHeroIcon: {
    width: 116,
    height: 116,
    resizeMode: 'contain',
    marginLeft: -10,
    marginVertical: -14,
  },
  dogAreaResultIcon: {
    width: 76,
    height: 76,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginLeft: -8,
    marginVertical: -8,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  bodyText: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  helperText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '800',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  mapSection: {
    gap: spacing.md,
  },
  mapHeader: {
    gap: spacing.xs,
  },
  mapHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  mapEyebrow: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  mapRefreshButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  mapRefreshButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  mapRefreshText: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  mapTitle: {
    color: colors.ink,
    fontSize: typography.h2,
    fontWeight: '900',
  },
  mapDescription: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  list: {
    gap: spacing.md,
  },
  label: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  radiusChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  radiusChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.greenSoft,
  },
  radiusChipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  radiusChipText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },
  radiusChipTextSelected: {
    color: colors.primaryDark,
  },
  manualRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  manualInputWrap: {
    width: 126,
    gap: spacing.xs,
  },
  manualHintWrap: {
    flex: 1,
    paddingBottom: spacing.xs,
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
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionRow_center: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignSelf: "center",
    marginTop: spacing.md,
  },
  nearbyStatusBox: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  nearbyStatusTitle: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  placeHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  placeCopy: {
    flex: 1,
    gap: 4,
  },
  placeName: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  placeMeta: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '800',
  },
  placeDescription: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 21,
  },
  placeFooter: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  score: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  coordinates: {
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: '700',
    marginTop: 3,
  },
  inlineAction: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  actionCopy: {
    flex: 1,
    gap: 4,
  },
});
