import React, { useMemo } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type AnyPlace = Record<string, unknown>;

type WebMarker = {
  id: string;
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  navigationQuery: string;
};

type NativePlacesMapProps = {
  places?: unknown;
  data?: unknown;
  items?: unknown;
  mapPlaces?: unknown;
  officialAreas?: unknown;
  style?: StyleProp<ViewStyle>;
  source?: unknown;
  realtimeStatus?: unknown;
};

const coordinatePaths = [
  ['latitude'],
  ['lat'],
  ['placeLatitude'],
  ['place_latitude'],
  ['gpsLatitude'],
  ['gps_latitude'],
  ['coordinate', 'latitude'],
  ['coordinate', 'lat'],
  ['coordinates', 'latitude'],
  ['coordinates', 'lat'],
  ['location', 'latitude'],
  ['location', 'lat'],
  ['geo', 'latitude'],
  ['geo', 'lat'],
];

const longitudePaths = [
  ['longitude'],
  ['lng'],
  ['lon'],
  ['placeLongitude'],
  ['place_longitude'],
  ['gpsLongitude'],
  ['gps_longitude'],
  ['coordinate', 'longitude'],
  ['coordinate', 'lng'],
  ['coordinate', 'lon'],
  ['coordinates', 'longitude'],
  ['coordinates', 'lng'],
  ['coordinates', 'lon'],
  ['location', 'longitude'],
  ['location', 'lng'],
  ['location', 'lon'],
  ['geo', 'longitude'],
  ['geo', 'lng'],
  ['geo', 'lon'],
];

const titlePaths = [
  ['name'],
  ['title'],
  ['label'],
  ['description'],
  ['placeName'],
  ['place_name'],
];

const subtitlePaths = [
  ['addressLabel'],
  ['address_label'],
  ['address'],
  ['street'],
  ['area'],
  ['city'],
  ['municipality'],
  ['type'],
  ['kind'],
  ['category'],
];

function isRecord(value: unknown): value is AnyPlace {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asPlaceArray(value: unknown): AnyPlace[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function collectPlaces(props: NativePlacesMapProps): AnyPlace[] {
  const candidates = [props.places, props.mapPlaces, props.officialAreas, props.items, props.data];
  for (const candidate of candidates) {
    const places = asPlaceArray(candidate);
    if (places.length > 0) {
      return places;
    }
  }
  return [];
}

function readPath(record: AnyPlace, path: string[]): unknown {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    if (normalized.length === 0) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readNumber(record: AnyPlace, paths: string[][]): number | null {
  for (const path of paths) {
    const value = toFiniteNumber(readPath(record, path));
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function readText(record: AnyPlace, paths: string[][], fallback: string): string {
  for (const path of paths) {
    const value = readPath(record, path);
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return fallback;
}

function readOptionalText(record: AnyPlace, paths: string[][]): string | null {
  for (const path of paths) {
    const value = readPath(record, path);
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function uniqueTextParts(parts: Array<string | null>): string[] {
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

function buildNavigationQuery(place: AnyPlace, title: string, latitude: number, longitude: number): string {
  const textQuery = uniqueTextParts([
    title,
    readOptionalText(place, [['addressLabel'], ['address_label'], ['address'], ['street']]),
    readOptionalText(place, [['area'], ['city'], ['municipality']]),
  ]).join(', ');

  if (textQuery.length) {
    return textQuery;
  }

  return `${latitude},${longitude}`;
}

function toMarker(place: AnyPlace, index: number): WebMarker | null {
  const latitude = readNumber(place, coordinatePaths);
  const longitude = readNumber(place, longitudePaths);
  if (latitude === null || longitude === null) {
    return null;
  }

  const rawId = readPath(place, ['id']) ?? readPath(place, ['placeId']) ?? readPath(place, ['uuid']);
  const id = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : `${latitude}:${longitude}:${index}`;

  const title = readText(place, titlePaths, `Luogo ${index + 1}`);

  return {
    id,
    title,
    subtitle: readText(place, subtitlePaths, `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`),
    latitude,
    longitude,
    navigationQuery: buildNavigationQuery(place, title, latitude, longitude),
  };
}

function openMarker(marker: WebMarker): void {
  const query = encodeURIComponent(marker.navigationQuery);
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

export function NativePlacesMap(props: NativePlacesMapProps): React.ReactElement {
  const markers = useMemo(
    () => collectPlaces(props).map(toMarker).filter((marker): marker is WebMarker => marker !== null),
    [props],
  );

  return (
    <View style={[styles.container, props.style]} testID="native-places-map-web-fallback">
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{markers.length ? 'Risultati filtrati' : 'Mappa pronta'}</Text>
        <Text style={styles.title}>
          {markers.length ? `${markers.length} area/e 🐶 nel raggio` : 'Cerca nel raggio per vedere i marker'}
        </Text>
        <Text style={styles.body}>
          {markers.length
            ? 'Tocca un risultato per aprire la navigazione. Su app mobile gli stessi punti vengono mostrati sulla mappa nativa.'
            : 'La mappa resta vuota finché non lanci una ricerca dalla tua posizione.'}
        </Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {markers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nessun marker da mostrare</Text>
            <Text style={styles.emptyBody}>
              Usa la ricerca per raggio: qui compariranno solo le aree cani coinvolte dal filtro.
            </Text>
          </View>
        ) : (
          markers.map((marker) => (
            <Pressable
              key={marker.id}
              onPress={() => openMarker(marker)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.pin} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{marker.title}</Text>
                <Text style={styles.cardSubtitle}>{marker.subtitle}</Text>
                <Text style={styles.coordinates}>
                  {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}
                </Text>
              </View>
              <Text style={styles.navigationText}>Apri</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default NativePlacesMap;

const styles = StyleSheet.create({
  container: {
    minHeight: 360,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#f4efe8',
    borderWidth: 1,
    borderColor: '#e5d7c7',
  },
  header: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e5d7c7',
    backgroundColor: '#fffaf4',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#9a6a35',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3a2a1a',
    marginTop: 4,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6a5642',
  },
  list: {
    maxHeight: 420,
  },
  listContent: {
    padding: 14,
    gap: 10,
  },
  emptyCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eaddd2',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3a2a1a',
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6a5642',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eaddd2',
  },
  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  pin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#d86f45',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3a2a1a',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6a5642',
    marginTop: 2,
  },
  coordinates: {
    fontSize: 12,
    color: '#9a6a35',
    marginTop: 4,
    fontWeight: '700',
  },
  navigationText: {
    color: '#0e8178',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
