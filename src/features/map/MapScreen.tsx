import { Image, StyleSheet, Text, View } from 'react-native';

import { baubookImages } from '../../shared/assets/images';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { Tag } from '../../shared/components/Tag';
import { demoPlaces } from '../../shared/data/mockData';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';

export function MapScreen() {
  return (
    <Screen>
      <SectionHeader
        eyebrow="Dove andiamo?"
        title="Mappa locale pronta per Maps e PostGIS"
        description="Per ora vedi dati demo. La prossima iterazione collegherà Supabase, geodati e Google Places con salvataggio dei Place ID."
      />

      <View style={styles.mapMock}>
        <Image source={baubookImages.icons.map} style={styles.mapIcon} />
        <View style={styles.mapPinOne} />
        <View style={styles.mapPinTwo} />
        <View style={styles.mapPinThree} />
        <View style={styles.mapRoadOne} />
        <View style={styles.mapRoadTwo} />
        <View style={styles.mapLegend}>
          <Tag label="Venezia-Mestre" tone="teal" />
          <Tag label="placeholder mappa" tone="orange" />
        </View>
      </View>

      <AppCard tone="teal">
        <View style={styles.searchHeader}>
          <IconBubble source={baubookImages.icons.filters} size={58} tone="plain" />
          <View style={styles.searchCopy}>
            <Text style={styles.cardTitle}>Filtri MVP</Text>
            <Text style={styles.bodyText}>Aree cani, passeggiate, veterinari, ombra, acqua, traffico e durata.</Text>
          </View>
        </View>
        <View style={styles.tagsRow}>
          <Tag label="ombra" tone="teal" />
          <Tag label="fontanella" tone="green" />
          <Tag label="poco traffico" tone="orange" />
          <Tag label="recensioni BauBook" tone="pink" />
        </View>
      </AppCard>

      <View style={styles.list}>
        {demoPlaces.map((place) => (
          <AppCard key={place.id}>
            <View style={styles.placeHeader}>
              <IconBubble source={place.icon} size={62} />
              <View style={styles.placeCopy}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeMeta}>{place.area} · {place.distanceLabel}</Text>
                <Text style={styles.placeDescription}>{place.description}</Text>
              </View>
            </View>
            <View style={styles.tagsRow}>
              {place.tags.map((tag) => (
                <Tag key={tag} label={tag} />
              ))}
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
          <IconBubble source={baubookImages.icons.vet} size={54} tone="plain" />
          <View style={styles.actionCopy}>
            <Text style={styles.cardTitle}>Mi serve un dottore...</Text>
            <Text style={styles.bodyText}>Qui agganceremo ricerca veterinari su Maps e schede esperienza BauBook con moderazione.</Text>
          </View>
        </View>
        <AppButton label="Segna come prossima feature" variant="ghost" icon={baubookImages.icons.vet} />
      </AppCard>
    </Screen>
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
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  placeHeader: {
    flexDirection: 'row',
    gap: spacing.md,
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
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
  },
  placeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  score: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  status: {
    color: colors.success,
    fontSize: typography.small,
    fontWeight: '900',
  },
  statusPending: {
    color: colors.warning,
  },
  inlineAction: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionCopy: {
    flex: 1,
    gap: 4,
  },
});
