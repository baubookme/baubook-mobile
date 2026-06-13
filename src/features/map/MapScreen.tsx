import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fetchNearbyDogAreas, type NearbyDogAreaModel } from '../../shared/api/supabaseContent';
import { baubookImages } from '../../shared/assets/images';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { Tag } from '../../shared/components/Tag';
import { useSupabasePlaces } from '../../shared/hooks/useSupabasePublicData';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';
import { NativePlacesMap } from './NativePlacesMap';

const dogAreaCartoonIcon = require('../../../assets/baubook/map/dog_area_cartoon_integrated.png');

const radiusOptions = [1, 3, 5, 10];

type NearbyStatus = 'idle' | 'loading' | 'success' | 'error';

type GeoPosition = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  };
};

type GeoError = {
  code?: number;
  message?: string;
};

type GeoOptions = {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
};

type NavigatorWithGeolocation = {
  geolocation?: {
    getCurrentPosition: (
      success: (position: GeoPosition) => void,
      error?: (error: GeoError) => void,
      options?: GeoOptions,
    ) => void;
  };
};

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
}

function readCurrentPosition(): Promise<GeoPosition> {
  const nav = (globalThis as unknown as { navigator?: NavigatorWithGeolocation }).navigator;

  return new Promise((resolve, reject) => {
    if (!nav?.geolocation?.getCurrentPosition) {
      reject(new Error('Geolocalizzazione non disponibile in questo ambiente. Su web autorizza la posizione dal browser.'));
      return;
    }

    nav.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

function formatCoordinate(value: number): string {
  return value.toFixed(5).replace('.', ',');
}

function openDogAreaNavigation(area: NearbyDogAreaModel): void {
  const url = `https://www.google.com/maps/search/?api=1&query=${area.latitude},${area.longitude}`;
  void Linking.openURL(url);
}

export function MapScreen() {
  const { source, reload, realtimeStatus } = useSupabasePlaces();

  const [radiusKm, setRadiusKm] = useState(3);
  const [manualRadius, setManualRadius] = useState('3');
  const [nearby, setNearby] = useState<NearbyState>({
    status: 'idle',
    source: null,
    areas: [],
    message: 'Scegli il raggio e usa la posizione attuale per trovare le aree cani ufficiali vicine.',
  });
  const [lastNearbySearch, setLastNearbySearch] = useState<LastNearbySearch | null>(null);

  const nearbyMapPlaces = nearby.status === 'success' ? nearby.areas : [];
  const nearbyPreview = nearbyMapPlaces.slice(0, 8);
  const hiddenNearbyCount = Math.max(nearbyMapPlaces.length - nearbyPreview.length, 0);

  const handleManualRadiusChange = (value: string) => {
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

    setNearby({
      status: 'success',
      source: result.source,
      areas: result.areas,
      message: result.message,
      errorMessage: result.errorMessage,
      positionLabel: `${formatCoordinate(search.latitude)}, ${formatCoordinate(search.longitude)}${accuracyLabel}`,
    });
  };

  const handleCurrentPositionSearch = async () => {
    setNearby((current) => ({
      ...current,
      status: 'loading',
      message: 'Chiedo la posizione al dispositivo e cerco le aree cani ufficiali nel raggio selezionato...',
      errorMessage: undefined,
    }));

    try {
      const position = await readCurrentPosition();
      const search: LastNearbySearch = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        radiusKm,
        accuracy: position.coords.accuracy,
      };

      setLastNearbySearch(search);
      await runNearbySearch(search);
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : JSON.stringify(error);

      setNearby({
        status: 'error',
        source: null,
        areas: [],
        message: 'Non riesco a leggere la posizione attuale.',
        errorMessage: fallbackMessage,
      });
    }
  };

  const handleMapRefresh = async () => {
    setNearby((current) => ({
      ...current,
      status: lastNearbySearch ? 'loading' : current.status,
      message: lastNearbySearch
        ? 'Ricarico i luoghi dal database e aggiorno la ricerca nel raggio selezionato...'
        : 'Ricarico i luoghi dal database...',
      errorMessage: undefined,
    }));

    try {
      await Promise.resolve(reload());

      if (lastNearbySearch) {
        await runNearbySearch(lastNearbySearch);
        return;
      }

      setNearby((current) => ({
        ...current,
        message: 'Luoghi dal database ricaricati. Usa la posizione attuale per vedere solo quelli vicini e utili.',
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
            ? 'I marker sono limitati alle aree cani trovate nel raggio selezionato.'
            : 'La mappa resta pronta: dopo la ricerca mostrerà solo i luoghi coinvolti nel filtro.'}
        </Text>
      </View>

      <AppCard tone="teal">
        <View style={styles.searchHeader}>
          <Image source={dogAreaCartoonIcon} style={styles.dogAreaHeroIcon} />
          <View style={styles.searchCopy}>
            <Text style={styles.cardTitle}>Trova area cani nel raggio di X km</Text>
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
                setRadiusKm(option);
                setManualRadius(String(option));
              }}
            />
          ))}
        </View>

        <View style={styles.manualRow}>
          <View style={styles.manualInputWrap}>
            <Text style={styles.label}>Raggio custom</Text>
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
            <Text style={styles.helperText}>Raggio supportato: 0,2-50 km. Consigliato in città: 3 km.</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
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
          {nearby.positionLabel ? <Text style={styles.helperText}>Posizione usata: {nearby.positionLabel}</Text> : null}
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
                ? `Mostro le prime ${nearbyPreview.length} aree più vicine. Altre ${hiddenNearbyCount} sono visibili sulla mappa.`
                : 'Tocca una card per aprire subito la navigazione.'
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
