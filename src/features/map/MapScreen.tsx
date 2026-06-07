import { Image, StyleSheet, Text, View } from 'react-native';

import { baubookImages } from '../../shared/assets/images';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { Tag } from '../../shared/components/Tag';
import { useSupabasePlaces } from '../../shared/hooks/useSupabasePublicData';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';

export function MapScreen() {
  const { places, source, status, message, errorMessage, reload } = useSupabasePlaces();
  const isLive = source === 'supabase';

  return (
    <Screen>
      <SectionHeader
        eyebrow="Dove andiamo?"
        title={isLive ? 'Luoghi caricati da Supabase' : 'Mappa locale pronta per Supabase e PostGIS'}
        description="Questa schermata legge i luoghi pubblici dal database quando Supabase e' configurato. Se qualcosa non risponde, BauBook torna ai dati demo locali senza bloccarsi."
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
          <Tag label={isLive ? 'Supabase live' : 'fallback demo'} tone={isLive ? 'green' : 'orange'} />
        </View>
      </View>

      <AppCard tone={isLive ? 'teal' : 'warm'}>
        <View style={styles.statusHeader}>
          <IconBubble source={isLive ? baubookImages.icons.dogArea : baubookImages.icons.settings} size={58} tone="plain" />
          <View style={styles.statusCopy}>
            <Text style={styles.cardTitle}>{isLive ? 'Backend collegato' : 'Backend in fallback controllato'}</Text>
            <Text style={styles.bodyText}>{status === 'loading' ? 'Carico i luoghi dal database...' : message}</Text>
            {errorMessage ? <Text selectable style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        </View>
        <View style={styles.tagsRow}>
          <Tag label={status === 'loading' ? 'loading' : isLive ? 'live DB' : 'demo locale'} tone={isLive ? 'green' : 'orange'} />
          <Tag label={`${places.length} schede`} tone="teal" />
          <Tag label="RLS attiva" tone="pink" />
        </View>
        <View style={styles.buttonWrap}>
          <AppButton label="Ricarica luoghi" variant="ghost" icon={baubookImages.icons.filters} onPress={reload} />
        </View>
      </AppCard>

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
        {places.map((place) => (
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
    marginBottom: spacing.lg,
  },
  actionCopy: {
    flex: 1,
    gap: 4,
  },
});
