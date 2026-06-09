import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import type { PlaceModel } from '../../shared/types/domain';

type RealtimeStatus = 'idle' | 'connecting' | 'disabled' | 'polling' | 'subscribed' | 'error';

interface NativePlacesMapProps {
  places: PlaceModel[];
  source?: string;
  status?: string;
  message?: string;
  errorMessage?: string;
  realtimeStatus?: RealtimeStatus;
  lastUpdatedAt?: string;
  reload?: () => void;
  onReload?: () => void;
  onRefresh?: (reasonOrEvent?: unknown) => void;
}

interface CoordinateValue {
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
}

interface CoordinateCarrier extends CoordinateValue {
  coords?: CoordinateValue | null;
  coordinate?: CoordinateValue | null;
  coordinates?: CoordinateValue | null;
  location?: CoordinateValue | null;
  position?: CoordinateValue | null;
}

interface MapMarkerModel {
  id: string;
  name: string;
  description: string;
  kind: string;
  latitude: number;
  longitude: number;
  pinColor: string;
}

const VENICE_REGION: Region = {
  latitude: 45.4408,
  longitude: 12.3155,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function extractCoordinates(place: PlaceModel): { latitude: number; longitude: number } | null {
  const carrier = place as unknown as CoordinateCarrier;

  const candidates: Array<CoordinateValue | null | undefined> = [
    carrier,
    carrier.coords,
    carrier.coordinate,
    carrier.coordinates,
    carrier.location,
    carrier.position,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const latitude = toFiniteNumber(candidate.latitude ?? candidate.lat);
    const longitude = toFiniteNumber(candidate.longitude ?? candidate.lng);

    if (latitude !== null && longitude !== null && (latitude !== 0 || longitude !== 0)) {
      return { latitude, longitude };
    }
  }

  return null;
}

function markerColor(kind: string): string {
  if (kind === 'warning_zone') {
    return '#D83A2E';
  }

  if (kind === 'walk' || kind === 'trail' || kind === 'beach') {
    return '#0F8F7A';
  }

  if (kind === 'vet' || kind === 'pet_shop' || kind === 'service') {
    return '#E2871A';
  }

  return '#2F6BFF';
}

function buildMarkers(places: PlaceModel[]): MapMarkerModel[] {
  return places
    .map((place, index) => {
      const coordinates = extractCoordinates(place);

      if (!coordinates) {
        return null;
      }

      const loose = place as unknown as {
        id?: string;
        name?: string;
        title?: string;
        description?: string | null;
        address?: string | null;
        kind?: string | null;
        type?: string | null;
      };

      const kind = String(loose.kind ?? loose.type ?? 'other');
      const name = loose.name ?? loose.title ?? `Luogo ${index + 1}`;
      const description = loose.description ?? loose.address ?? kind;

      return {
        id: loose.id ?? `${name}-${index}`,
        name,
        description,
        kind,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        pinColor: markerColor(kind),
      };
    })
    .filter((marker): marker is MapMarkerModel => marker !== null);
}

function statusLabel(realtimeStatus?: RealtimeStatus, source?: string): string {
  if (realtimeStatus === 'subscribed') {
    return 'Realtime attivo';
  }

  if (realtimeStatus === 'polling') {
    return 'Polling 30s';
  }

  if (realtimeStatus === 'error') {
    return 'Realtime non disponibile';
  }

  if (source === 'supabase') {
    return 'Live Supabase';
  }

  return 'Demo locale';
}

export function NativePlacesMap({ places, source, realtimeStatus, message, errorMessage }: NativePlacesMapProps) {
  const markers = useMemo(() => buildMarkers(places), [places]);

  const initialRegion = useMemo<Region>(() => {
    const first = markers[0];

    if (!first) {
      return VENICE_REGION;
    }

    return {
      latitude: first.latitude,
      longitude: first.longitude,
      latitudeDelta: 0.045,
      longitudeDelta: 0.045,
    };
  }, [markers]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Mappa nativa</Text>
        <Text style={styles.title}>Luoghi BauBook</Text>
        <Text style={styles.status}>{statusLabel(realtimeStatus, source)}</Text>
      </View>

      <View style={styles.mapShell}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
              title={marker.name}
              description={marker.description}
              pinColor={marker.pinColor}
            >
              <Callout tooltip={false}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{marker.name}</Text>
                  <Text style={styles.calloutText}>{marker.description}</Text>
                  <Text style={styles.calloutKind}>{marker.kind}</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        <View style={styles.overlayPill}>
          <Text style={styles.overlayText}>{markers.length} marker</Text>
        </View>
      </View>

      {markers.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nessun marker con coordinate valide</Text>
          <Text style={styles.emptyText}>
            I luoghi sono disponibili, ma non espongono ancora coordinate utilizzabili dalla mappa nativa.
          </Text>
        </View>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <View style={styles.legend}>
        <LegendDot color="#0F8F7A" label="Passeggiate / outdoor" />
        <LegendDot color="#E2871A" label="Servizi" />
        <LegendDot color="#D83A2E" label="Zone attenzione" />
        <LegendDot color="#2F6BFF" label="Altri luoghi" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
    marginBottom: 18,
  },
  header: {
    gap: 4,
  },
  eyebrow: {
    color: '#7A5B32',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#2B2118',
    fontSize: 22,
    fontWeight: '900',
  },
  status: {
    color: '#5B4B3B',
    fontSize: 13,
    fontWeight: '700',
  },
  mapShell: {
    height: 360,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#EFE3CF',
    borderWidth: 1,
    borderColor: '#E2CFB3',
  },
  map: {
    flex: 1,
  },
  overlayPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(43, 33, 24, 0.82)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  callout: {
    maxWidth: 230,
    gap: 4,
    padding: 8,
  },
  calloutTitle: {
    color: '#2B2118',
    fontSize: 15,
    fontWeight: '900',
  },
  calloutText: {
    color: '#5B4B3B',
    fontSize: 13,
    fontWeight: '600',
  },
  calloutKind: {
    color: '#7A5B32',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  emptyBox: {
    borderRadius: 18,
    backgroundColor: '#FFF8ED',
    borderWidth: 1,
    borderColor: '#E2CFB3',
    padding: 14,
    gap: 4,
  },
  emptyTitle: {
    color: '#2B2118',
    fontSize: 15,
    fontWeight: '900',
  },
  emptyText: {
    color: '#5B4B3B',
    fontSize: 13,
    fontWeight: '600',
  },
  message: {
    color: '#5B4B3B',
    fontSize: 12,
    fontWeight: '600',
  },
  error: {
    color: '#B3261E',
    fontSize: 12,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendText: {
    color: '#5B4B3B',
    fontSize: 12,
    fontWeight: '700',
  },
});

