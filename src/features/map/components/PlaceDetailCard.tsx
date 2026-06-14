import React from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import BauBookIcon from '../../../components/BauBookIcon';
import { colors, radius, spacing, typography } from '../../../shared/theme/theme';

export type MapCarePlace = object;

type PlaceDetailCardProps = {
  place: MapCarePlace;
  favorite: boolean;
  onToggleFavorite: () => void;
};

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

function readText(record: MapCarePlace, paths: string[][], fallback: string): string {
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

function readNumber(record: MapCarePlace, paths: string[][]): number | null {
  for (const path of paths) {
    const value = readPath(record, path);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value.trim().replace(',', '.'));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function readTags(place: MapCarePlace): string[] {
  const value = readPath(place, ['tags']);
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').slice(0, 5);
  }
  return [];
}

function uniqueTextParts(parts: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const part of parts) {
    const cleaned = part.trim();
    if (!cleaned.length) {
      continue;
    }

    const key = cleaned.toLocaleLowerCase('it-IT');
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(cleaned);
  }

  return output;
}

function buildNavigationQuery(place: MapCarePlace): string {
  const latitude = readNumber(place, [
    ['latitude'],
    ['lat'],
    ['placeLatitude'],
    ['place_latitude'],
    ['coordinates', 'latitude'],
    ['coordinates', 'lat'],
    ['location', 'latitude'],
    ['location', 'lat'],
  ]);
  const longitude = readNumber(place, [
    ['longitude'],
    ['lng'],
    ['lon'],
    ['placeLongitude'],
    ['place_longitude'],
    ['coordinates', 'longitude'],
    ['coordinates', 'lng'],
    ['coordinates', 'lon'],
    ['location', 'longitude'],
    ['location', 'lng'],
    ['location', 'lon'],
  ]);
  const textQuery = uniqueTextParts([
    readText(place, [['name'], ['title'], ['label']], ''),
    readText(place, [['addressLabel'], ['address_label'], ['address'], ['street']], ''),
    readText(place, [['area'], ['city'], ['municipality']], ''),
  ]).join(', ');

  if (textQuery.length) {
    return textQuery;
  }

  if (latitude !== null && longitude !== null) {
    return `${latitude},${longitude}`;
  }

  return readText(place, [['name'], ['title'], ['label']], 'luogo dog friendly');
}

function openNativeNavigation(place: MapCarePlace): void {
  const query = encodeURIComponent(buildNavigationQuery(place));
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


function showReportInfo(place: MapCarePlace): void {
  const name = readText(place, [['name'], ['title'], ['label']], 'questo luogo');
  Alert.alert(
    'Segnala o aggiorna luogo',
    `Per ora la beta raccoglie queste richieste dal form partnership/contatto in Home. Apri Home e usa "Richiedi partnership" indicando: ${name}.`,
  );
}

export function PlaceDetailCard({ place, favorite, onToggleFavorite }: PlaceDetailCardProps) {
  const name = readText(place, [['name'], ['title'], ['label']], 'Luogo dog-friendly');
  const area = readText(place, [['area'], ['city'], ['municipality'], ['address']], 'Zona da verificare');
  const distance = readText(place, [['distanceLabel'], ['distance_label'], ['distance']], 'distanza non disponibile');
  const description = readText(
    place,
    [['description'], ['subtitle'], ['notes'], ['addressLabel'], ['address_label']],
    'Scheda luogo pronta per navigazione, preferiti e segnalazioni beta.',
  );
  const moderationStatus = readText(place, [['moderationStatus'], ['moderation_status']], 'approved');
  const score = readText(place, [['scoreLabel'], ['score_label'], ['ratingLabel'], ['rating_label']], 'BauBook place');
  const tags = readTags(place);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBubble}>
          <BauBookIcon name="map" size={22} color={colors.primaryDark} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Scheda luogo</Text>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.meta}>{area} · {distance}</Text>
        </View>
      </View>

      <Text style={styles.description}>{description}</Text>

      <View style={styles.badgesRow}>
        <View style={styles.badge}><Text style={styles.badgeText}>{score}</Text></View>
        <View style={[styles.badge, moderationStatus === 'pending' ? styles.badgePending : styles.badgeApproved]}>
          <Text style={styles.badgeText}>{moderationStatus === 'pending' ? 'da verificare' : 'pubblicabile'}</Text>
        </View>
        {favorite ? <View style={styles.badge}><Text style={styles.badgeText}>preferito</Text></View> : null}
      </View>

      {tags.length ? (
        <View style={styles.tagsRow}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
          ))}
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => openNativeNavigation(place)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>Apri navigazione</Text>
        </Pressable>
        <Pressable
          onPress={onToggleFavorite}
          style={({ pressed }) => [styles.actionButtonSecondary, pressed && styles.pressed]}
        >
          <Text style={styles.actionTextSecondary}>{favorite ? 'Rimuovi preferito' : 'Salva preferito'}</Text>
        </Pressable>
        <Pressable
          onPress={() => showReportInfo(place)}
          style={({ pressed }) => [styles.actionButtonGhost, pressed && styles.pressed]}
        >
          <Text style={styles.actionTextGhost}>Segnala info</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default PlaceDetailCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: typography.h2,
    lineHeight: 24,
    fontWeight: '900',
  },
  meta: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '800',
  },
  description: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeApproved: {
    backgroundColor: colors.greenSoft,
  },
  badgePending: {
    backgroundColor: colors.orangeSoft,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: colors.tealSoft,
  },
  tagText: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionButtonSecondary: {
    borderRadius: radius.pill,
    backgroundColor: colors.greenSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionButtonGhost: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: typography.small,
    fontWeight: '900',
  },
  actionTextSecondary: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  actionTextGhost: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
});
