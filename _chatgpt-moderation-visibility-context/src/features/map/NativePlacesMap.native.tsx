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
  geo?: CoordinateValue | null;
  position?: CoordinateValue | null;
}

interface MapMarkerModel {
  id: string;
  name: string;
  description: string;
  kind: string;
  kindLabel: string;
  latitude: number;
  longitude: number;
  pinColor: string;
}

interface LegendItemModel {
  key: string;
  label: string;
  color: string;
}

const VENICE_REGION: Region = {
  latitude: 45.4408,
  longitude: 12.3155,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');

    if (!normalized.length) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readCoordinateValue(candidate: unknown, keys: string[]): number | null {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const record = candidate as Record<string, unknown>;

  for (const key of keys) {
    const value = toFiniteNumber(record[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function extractCoordinates(place: PlaceModel): { latitude: number; longitude: number } | null {
  const carrier = place as unknown as CoordinateCarrier;

  const candidates: Array<CoordinateValue | null | undefined> = [
    carrier,
    carrier.coords,
    carrier.coordinate,
    carrier.coordinates,
    carrier.location,
    carrier.geo,
    carrier.position,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const latitude = readCoordinateValue(candidate, [
      'latitude',
      'lat',
      'placeLatitude',
      'place_latitude',
      'gpsLatitude',
      'gps_latitude',
    ]);

    const longitude = readCoordinateValue(candidate, [
      'longitude',
      'lng',
      'lon',
      'placeLongitude',
      'place_longitude',
      'gpsLongitude',
      'gps_longitude',
    ]);

    if (
      latitude !== null &&
      longitude !== null &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180 &&
      (latitude !== 0 || longitude !== 0)
    ) {
      return { latitude, longitude };
    }
  }

  return null;
}

function markerColor(kind: string): string {
  if (kind === 'warning_zone') {
    return '#D83A2E';
  }

  if (kind === 'dog_area') {
    return '#0F8F7A';
  }

  if (kind === 'walk' || kind === 'trail' || kind === 'beach') {
    return '#0F8F7A';
  }

  if (kind === 'vet' || kind === 'pet_shop' || kind === 'service') {
    return '#E2871A';
  }

  return '#2F6BFF';
}

function markerKindLabel(kind: string): string {
  if (kind === 'dog_area') {
    return 'Area cani';
  }

  if (kind === 'warning_zone') {
    return 'Zona attenzione';
  }

  if (kind === 'walk' || kind === 'trail' || kind === 'beach') {
    return 'Passeggiata / outdoor';
  }

  if (kind === 'vet' || kind === 'pet_shop' || kind === 'service') {
    return 'Servizio';
  }

  return 'Luogo BauBook';
}

function buildLegendItems(markers: MapMarkerModel[]): LegendItemModel[] {
  const seen = new Set<string>();
  const items: LegendItemModel[] = [];

  for (const marker of markers) {
    if (seen.has(marker.kind)) {
      continue;
    }

    seen.add(marker.kind);
    items.push({
      key: marker.kind,
      label: marker.kindLabel,
      color: marker.pinColor,
    });
  }

  return items;
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
        kindLabel: markerKindLabel(kind),
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

  return 'Servizio non disponibile';
}

export function NativePlacesMap({ places, source, realtimeStatus, message, errorMessage }: NativePlacesMapProps) {
  const markers = useMemo(() => buildMarkers(places), [places]);
  const legendItems = useMemo(() => buildLegendItems(markers), [markers]);
  const rawPlacesCount = Array.isArray(places) ? places.length : 0;
  const mapRegionKey = markers.length
    ? `${markers[0].latitude.toFixed(5)}:${markers[0].longitude.toFixed(5)}:${markers.length}`
    : 'empty';

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
        <Text style={styles.eyebrow}>Mappa - Luoghi BauBook</Text>
        <Text style={styles.status}>{statusLabel(realtimeStatus, source)}</Text>
      </View>

      <View style={styles.mapShell}>
        <MapView
          key={mapRegionKey}
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
                  <Text style={styles.calloutKind}>{marker.kindLabel}</Text>
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
          <Text style={styles.emptyTitle}>{rawPlacesCount ? 'Nessun marker con coordinate valide' : 'Nessun risultato da mostrare'}</Text>
          <Text style={styles.emptyText}>
            {rawPlacesCount ? 'I luoghi sono disponibili, ma non espongono ancora coordinate utilizzabili dalla mappa.' : 'Usa la posizione attuale per cercare aree e servizi nel raggio selezionato.'}
          </Text>
        </View>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {legendItems.length ? (
        <View style={styles.legend}>
          {legendItems.map((item) => (
            <LegendDot key={item.key} color={item.color} label={item.label} />
          ))}
        </View>
      ) : null}
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

