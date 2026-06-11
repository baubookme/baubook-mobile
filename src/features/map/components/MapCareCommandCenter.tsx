import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BauBookIcon from '../../../components/BauBookIcon';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';
import { readPlaceFavoriteIds, togglePlaceFavoriteId } from '../placeFavoritesStorage';
import PlaceDetailCard, { type MapCarePlace } from './PlaceDetailCard';

type MapCareFilter = 'all' | 'dog_area' | 'vet' | 'pet_shop' | 'grooming' | 'sponsored' | 'favorites';

type FilterConfig = {
  key: MapCareFilter;
  label: string;
};

type MapCareCommandCenterProps = {
  places?: MapCarePlace[];
};

const FILTERS: FilterConfig[] = [
  { key: 'all', label: 'Tutti' },
  { key: 'dog_area', label: 'Aree cani' },
  { key: 'vet', label: 'Veterinari' },
  { key: 'pet_shop', label: 'Pet shop' },
  { key: 'grooming', label: 'Toelettatura' },
  { key: 'sponsored', label: 'Sponsor' },
  { key: 'favorites', label: 'Preferiti' },
];

function readPath(record: MapCarePlace, path: string[]): unknown {
  let current: unknown = record;
  for (const key of path) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function readText(record: MapCarePlace, paths: string[][], fallback = ''): string {
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

function readTags(place: MapCarePlace): string[] {
  const value = readPath(place, ['tags']);
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function getPlaceId(place: MapCarePlace, index: number): string {
  const rawId = readPath(place, ['id']) ?? readPath(place, ['placeId']) ?? readPath(place, ['uuid']);
  if (typeof rawId === 'string' || typeof rawId === 'number') {
    return String(rawId);
  }
  const name = readText(place, [['name'], ['title'], ['label']], `place-${index}`);
  const area = readText(place, [['area'], ['city'], ['municipality']], 'area');
  return `${name}-${area}-${index}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function getSearchBlob(place: MapCarePlace): string {
  return [
    readText(place, [['kind'], ['type'], ['category']]),
    readText(place, [['name'], ['title'], ['label']]),
    readText(place, [['description'], ['subtitle'], ['area'], ['address']]),
    ...readTags(place),
  ]
    .join(' ')
    .toLowerCase();
}

function isSponsored(place: MapCarePlace): boolean {
  const value = readPath(place, ['sponsored']) ?? readPath(place, ['isSponsored']) ?? readPath(place, ['sponsoredSlot']);
  if (typeof value === 'boolean') {
    return value;
  }
  return getSearchBlob(place).includes('sponsor');
}

function matchesFilter(place: MapCarePlace, filter: MapCareFilter, favoriteIds: string[], index: number): boolean {
  if (filter === 'all') {
    return true;
  }

  const id = getPlaceId(place, index);
  if (filter === 'favorites') {
    return favoriteIds.includes(id);
  }

  const blob = getSearchBlob(place);
  if (filter === 'dog_area') {
    return blob.includes('dog_area') || blob.includes('area cani') || blob.includes('cane') || blob.includes('cani');
  }
  if (filter === 'vet') {
    return blob.includes('vet') || blob.includes('veterin');
  }
  if (filter === 'pet_shop') {
    return blob.includes('pet') || blob.includes('shop') || blob.includes('negozio');
  }
  if (filter === 'grooming') {
    return blob.includes('toelett') || blob.includes('groom');
  }
  if (filter === 'sponsored') {
    return isSponsored(place);
  }

  return true;
}

function getPlaceTitle(place: MapCarePlace, index: number): string {
  return readText(place, [['name'], ['title'], ['label']], `Luogo ${index + 1}`);
}

function getPlaceMeta(place: MapCarePlace): string {
  const area = readText(place, [['area'], ['city'], ['municipality']], 'zona');
  const distance = readText(place, [['distanceLabel'], ['distance_label'], ['distance']], 'distanza n.d.');
  return `${area} · ${distance}`;
}

export function MapCareCommandCenter({ places = [] }: MapCareCommandCenterProps) {
  const [filter, setFilter] = useState<MapCareFilter>('all');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    readPlaceFavoriteIds()
      .then((ids) => {
        if (mounted) {
          setFavoriteIds(ids);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const indexedPlaces = useMemo(
    () => places.map((place, index) => ({ place, index, id: getPlaceId(place, index) })),
    [places],
  );

  const filteredPlaces = useMemo(
    () => indexedPlaces.filter((item) => matchesFilter(item.place, filter, favoriteIds, item.index)),
    [favoriteIds, filter, indexedPlaces],
  );

  const selectedPlace = useMemo(() => {
    if (filteredPlaces.length === 0) {
      return null;
    }
    return filteredPlaces.find((item) => item.id === selectedId) ?? filteredPlaces[0];
  }, [filteredPlaces, selectedId]);

  useEffect(() => {
    if (!selectedPlace) {
      setSelectedId(null);
      return;
    }
    if (selectedPlace.id !== selectedId) {
      setSelectedId(selectedPlace.id);
    }
  }, [selectedId, selectedPlace]);

  async function handleToggleFavorite(id: string): Promise<void> {
    const nextIds = await togglePlaceFavoriteId(id, favoriteIds);
    setFavoriteIds(nextIds);
  }

  const dogAreasCount = indexedPlaces.filter((item) => matchesFilter(item.place, 'dog_area', favoriteIds, item.index)).length;
  const sponsoredCount = indexedPlaces.filter((item) => matchesFilter(item.place, 'sponsored', favoriteIds, item.index)).length;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBubble}>
          <BauBookIcon name="map" size={23} color={colors.primaryDark} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Map & Care Command Center</Text>
          <Text style={styles.title}>Luoghi utili, preferiti e azioni rapide</Text>
          <Text style={styles.subtitle}>
            Filtra i luoghi dog-friendly, apri la scheda, salva preferiti e prepara richieste di aggiornamento.
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricPill}>
          <Text style={styles.metricValue}>{places.length}</Text>
          <Text style={styles.metricLabel}>luoghi</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricValue}>{dogAreasCount}</Text>
          <Text style={styles.metricLabel}>aree cani</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricValue}>{favoriteIds.length}</Text>
          <Text style={styles.metricLabel}>preferiti</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricValue}>{sponsoredCount}</Text>
          <Text style={styles.metricLabel}>sponsor</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = item.key === filter;
          return (
            <Pressable
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.pressed]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedPlace ? (
        <PlaceDetailCard
          place={selectedPlace.place}
          favorite={favoriteIds.includes(selectedPlace.id)}
          onToggleFavorite={() => void handleToggleFavorite(selectedPlace.id)}
        />
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nessun luogo in questo filtro</Text>
          <Text style={styles.emptyText}>Aggiungi dati live o scegli un altro filtro per vedere le schede operative.</Text>
        </View>
      )}

      {filteredPlaces.length > 1 ? (
        <View style={styles.placeList}>
          <Text style={styles.listTitle}>Altri luoghi nel filtro</Text>
          {filteredPlaces.slice(0, 5).map((item) => {
            const active = item.id === selectedPlace?.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedId(item.id)}
                style={({ pressed }) => [styles.placeRow, active && styles.placeRowActive, pressed && styles.pressed]}
              >
                <View style={styles.placeRowIcon}>
                  <BauBookIcon name={favoriteIds.includes(item.id) ? 'favorite' : 'map'} size={16} color={colors.primaryDark} />
                </View>
                <View style={styles.placeRowCopy}>
                  <Text style={styles.placeRowTitle}>{getPlaceTitle(item.place, item.index)}</Text>
                  <Text style={styles.placeRowMeta}>{getPlaceMeta(item.place)}</Text>
                </View>
                <Text style={styles.placeRowArrow}>›</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export default MapCareCommandCenter;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.ink,
    fontSize: typography.h2,
    lineHeight: 25,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricPill: {
    flexGrow: 1,
    minWidth: '42%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  metricValue: {
    color: colors.ink,
    fontSize: typography.h2,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  filterRow: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  filterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  filterTextActive: {
    color: '#FFFFFF',
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
  emptyText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '700',
  },
  placeList: {
    gap: spacing.sm,
  },
  listTitle: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  placeRowActive: {
    backgroundColor: colors.greenSoft,
    borderColor: colors.primary,
  },
  placeRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  placeRowCopy: {
    flex: 1,
    gap: 2,
  },
  placeRowTitle: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  placeRowMeta: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  placeRowArrow: {
    color: colors.primaryDark,
    fontSize: 26,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
