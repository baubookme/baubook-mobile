import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { fetchNearbyDogAreas, type NearbyDogAreaModel } from '../../shared/api/supabaseContent';
import { baubookImages } from '../../shared/assets/images';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { Tag } from '../../shared/components/Tag';
import { NativePlacesMap } from './NativePlacesMap';
import { useSupabasePlaces } from '../../shared/hooks/useSupabasePublicData';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';

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
  source: 'supabase' | 'fallback' | null;
  areas: NearbyDogAreaModel[];
  message: string;
  errorMessage?: string;
  positionLabel?: string;
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

export function MapScreen() {
  const { places, source, status, message, errorMessage, reload, realtimeStatus } = useSupabasePlaces();
  const [radiusKm, setRadiusKm] = useState(3);
  const [manualRadius, setManualRadius] = useState('3');
  const [nearby, setNearby] = useState<NearbyState>({
    status: 'idle',
    source: null,
    areas: [],
    message: 'Scegli il raggio e usa la posizione attuale per trovare le aree cani ufficiali vicine.',
  });

  const isLive = source === 'supabase';
  const dogAreas = useMemo(() => places.filter((place) => place.kind === 'dog_area'), [places]);
  const approvedDogAreas = useMemo(
    () => dogAreas.filter((place) => place.moderationStatus === 'approved'),
    [dogAreas],
  );
  const visiblePlaces = useMemo(
    () => places.filter((place) => place.moderationStatus !== 'removed'),
    [places],
  );
  const nearbyPreview = nearby.areas.slice(0, 8);

  const handleManualRadiusChange = (value: string) => {
    const cleaned = value.replace(',', '.').replace(/[^0-9.]/g, '');
    setManualRadius(cleaned);
    const parsed = Number(cleaned);

    if (Number.isFinite(parsed) && parsed >= 0.2 && parsed <= 50) {
      setRadiusKm(parsed);
    }
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
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const result = await fetchNearbyDogAreas({ latitude, longitude, radiusKm });
      const accuracyLabel = typeof position.coords.accuracy === 'number'
        ? ` · accuratezza circa ${Math.round(position.coords.accuracy)} m`
        : '';

      setNearby({
        status: 'success',
        source: result.source,
        areas: result.areas,
        message: result.message,
        errorMessage: result.errorMessage,
        positionLabel: `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}${accuracyLabel}`,
      });
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

  return (
    <Screen>
      <View style={styles.mapMock}>
        <View style={styles.mapRoadOne} />
        <View style={styles.mapRoadTwo} />
        <View style={styles.mapPinOne} />
        <View style={styles.mapPinTwo} />
        <View style={styles.mapPinThree} />
        <Image source={baubookImages.icons.map} style={styles.mapIcon} />
        <View style={styles.mapLegend}>
          <Tag label="aree cani" tone="teal" />
          <Tag label="raggio km" tone="green" />
          <Tag label="safety" tone="red" />
        </View>
      </View>

      <SectionHeader
        eyebrow="Mappa BauBook"
        title="Aree cani vicino a te"
        description="Catalogo ufficiale Venezia-Mestre, geocoding beta e ricerca nel raggio dalla posizione attuale. La posizione serve solo per il calcolo immediato."
      />

      <AppCard tone={isLive ? 'teal' : 'warm'}>
        <View style={styles.statusHeader}>
          <IconBubble source={isLive ? baubookImages.icons.dogArea : baubookImages.icons.settings} tone={isLive ? 'teal' : 'warm'} />
          <View style={styles.statusCopy}>
            <Text style={styles.cardTitle}>{isLive ? 'Backend collegato' : 'Backend in fallback controllato'}</Text>
            <Text style={styles.bodyText}>{status === 'loading' ? 'Carico i luoghi dal database...' : message}</Text>
            <View style={styles.tagsRow}>
              <Tag label={`${approvedDogAreas.length} aree cani`} tone="teal" />
              <Tag label={`${places.length} luoghi`} tone="orange" />
              <Tag
                label={`Mappa ${
                  realtimeStatus === 'subscribed'
                    ? 'realtime'
                    : realtimeStatus === 'polling'
                      ? 'polling'
                      : source === 'supabase'
                        ? 'live'
                        : 'demo'
                }`}
                tone="orange"
              />
              <Tag label={source === 'supabase' ? 'Supabase live' : 'demo locale'} tone={source === 'supabase' ? 'green' : 'orange'} />
            </View>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            <View style={styles.buttonWrap}>
              <AppButton label="Aggiorna luoghi" onPress={reload} variant="ghost" />
            </View>
          </View>
        </View>
      </AppCard>

      <AppCard elevated tone="teal">
        <View style={styles.searchHeader}>
          <IconBubble source={baubookImages.icons.dogArea} tone="teal" />
          <View style={styles.searchCopy}>
            <Text style={styles.cardTitle}>Trova area cani nel raggio di X km</Text>
            <Text style={styles.bodyText}>
              Usa la posizione attuale per interrogare Supabase con PostGIS. Se non hai ancora lanciato la migration 0007, vedrai un fallback controllato.
            </Text>
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
              placeholder="3"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </View>
          <View style={styles.manualHintWrap}>
            <Text style={styles.helperText}>Range tecnico: 0,2-50 km. Default consigliato per città: 3 km.</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <AppButton
            label={nearby.status === 'loading' ? 'Cerco...' : `Cerca entro ${String(radiusKm).replace('.', ',')} km`}
            onPress={handleCurrentPositionSearch}
            disabled={nearby.status === 'loading'}
            icon={baubookImages.icons.map}
          />
        </View>

        <View style={styles.nearbyStatusBox}>
          <Text style={styles.nearbyStatusTitle}>
            {nearby.status === 'loading' ? 'Ricerca in corso' : nearby.source === 'supabase' ? 'Risultato live' : 'Stato ricerca'}
          </Text>
          <Text style={styles.bodyText}>{nearby.message}</Text>
          {nearby.positionLabel ? <Text style={styles.helperText}>Posizione usata: {nearby.positionLabel}</Text> : null}
          {nearby.errorMessage ? <Text style={styles.errorText}>{nearby.errorMessage}</Text> : null}
        </View>
      </AppCard>

      {nearbyPreview.length ? (
        <View style={styles.list}>
          <SectionHeader
            eyebrow="Risultati nel raggio"
            title="Aree cani più vicine"
            description="Ordinate per distanza calcolata lato database. I pin sono beta geocoded e restano verificabili nel metadata Supabase."
          />
          {nearbyPreview.map((area) => (
            <NearbyDogAreaCard key={area.id} area={area} />
          ))}
        </View>
      ) : null}

      <View style={styles.list}>
        <SectionHeader
          eyebrow="Catalogo"
          title="Luoghi BauBook"
          description="Elenco completo dei luoghi pubblici caricati. Le aree cani ufficiali sono marcate e pronte per filtri più evoluti."
        />
        <NativePlacesMap
          places={visiblePlaces}
          source={source}
          realtimeStatus={realtimeStatus}
          onRefresh={reload}
        />

        {visiblePlaces.map((place) => (
          <AppCard key={place.id}>
            <View style={styles.placeHeader}>
              <IconBubble source={place.icon} size={54} tone={place.kind === 'dog_area' ? 'teal' : 'warm'} />
              <View style={styles.placeCopy}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeMeta}>{place.area} · {place.distanceLabel}</Text>
                <Text style={styles.placeDescription}>{place.description}</Text>
                <View style={styles.tagsRow}>
                  {place.tags.map((tag) => (
                    <Tag key={tag} label={tag} tone={place.kind === 'dog_area' ? 'teal' : 'default'} />
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.placeFooter}>
              <Text style={styles.score}>{place.scoreLabel}</Text>
              <Text style={[styles.status, place.moderationStatus === 'pending' && styles.statusPending]}>
                {place.moderationStatus === 'pending' ? 'da verificare' : 'pubblicabile'}
              </Text>
            </View>
          </AppCard>
        ))}
      </View>

      <AppCard tone="warm">
        <View style={styles.inlineAction}>
          <IconBubble source={baubookImages.icons.vet} tone="warm" />
          <View style={styles.actionCopy}>
            <Text style={styles.cardTitle}>Mi serve un dottore...</Text>
            <Text style={styles.bodyText}>
              Qui agganceremo ricerca veterinari su Maps e schede esperienza BauBook con moderazione.
            </Text>
          </View>
        </View>
      </AppCard>
    </Screen>
  );
}

function RadiusChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.radiusChip, selected && styles.radiusChipSelected, pressed && styles.radiusChipPressed]}
    >
      <Text style={[styles.radiusChipText, selected && styles.radiusChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function NearbyDogAreaCard({ area }: { area: NearbyDogAreaModel }) {
  return (
    <AppCard tone="teal">
      <View style={styles.placeHeader}>
        <IconBubble source={area.icon} size={54} tone="teal" />
        <View style={styles.placeCopy}>
          <Text style={styles.placeName}>{area.name}</Text>
          <Text style={styles.placeMeta}>{area.distanceLabel} · {area.area}</Text>
          <Text style={styles.placeDescription}>{area.addressLabel}</Text>
          <View style={styles.tagsRow}>
            <Tag label="nel raggio" tone="green" />
            <Tag label={area.geocodingStatus} tone={area.geocodingStatus === 'beta_geocoded' ? 'teal' : 'orange'} />
            {area.tags.slice(0, 4).map((tag) => (
              <Tag key={tag} label={tag} tone="teal" />
            ))}
          </View>
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  mapMock: {
    height: 260,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#DDF7F3',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapIcon: {
    width: 104,
    height: 104,
    resizeMode: 'contain',
    opacity: 0.95,
    zIndex: 3,
  },
  mapRoadOne: {
    position: 'absolute',
    width: 360,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 178, 63, 0.38)',
    transform: [{ rotate: '-23deg' }],
  },
  mapRoadTwo: {
    position: 'absolute',
    width: 310,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 129, 120, 0.20)',
    transform: [{ rotate: '21deg' }],
  },
  mapPinOne: {
    position: 'absolute',
    left: 42,
    top: 46,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    zIndex: 2,
  },
  mapPinTwo: {
    position: 'absolute',
    right: 64,
    top: 78,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    zIndex: 2,
  },
  mapPinThree: {
    position: 'absolute',
    right: 112,
    bottom: 56,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.warning,
    zIndex: 2,
  },
  mapLegend: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    zIndex: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  statusCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  searchHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  searchCopy: {
    flex: 1,
    gap: 4,
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
  buttonWrap: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
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
    gap: spacing.md,
    alignItems: 'flex-start',
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
  },
  score: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  status: {
    color: colors.success,
    fontSize: typography.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  statusPending: {
    color: colors.warning,
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
