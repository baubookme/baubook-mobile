import { StyleSheet, Text, View } from 'react-native';

import { baubookImages } from '../../shared/assets/images';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { Tag } from '../../shared/components/Tag';
import { demoWalkPlans } from '../../shared/data/mockData';
import { colors, spacing, typography } from '../../shared/theme/theme';

export function WalksScreen() {
  return (
    <Screen>
      <SectionHeader
        eyebrow="So chi c'è"
        title="Passeggiate, non tracciamento continuo"
        description="MVP sicuro: pubblico un appuntamento temporaneo in un luogo, non la posizione live permanente."
      />

      <AppCard tone="warm">
        <View style={styles.headerRow}>
          <IconBubble source={baubookImages.icons.checkin} size={66} tone="plain" />
          <View style={styles.headerCopy}>
            <Text style={styles.cardTitle}>Io sono qui... più o meno.</Text>
            <Text style={styles.bodyText}>Check-in temporaneo, area indicativa, visibilità limitata e scadenza automatica.</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <AppButton label="Creo passeggiata" icon={baubookImages.icons.calendar} />
          <AppButton label="Chi c'è vicino?" variant="ghost" icon={baubookImages.icons.search} />
        </View>
      </AppCard>

      <View style={styles.walkList}>
        {demoWalkPlans.map((plan) => (
          <AppCard key={plan.id}>
            <View style={styles.walkHeader}>
              <IconBubble source={baubookImages.icons.walks} size={58} tone="teal" />
              <View style={styles.walkCopy}>
                <Text style={styles.walkTime}>{plan.startsAtLabel}</Text>
                <Text style={styles.walkTitle}>{plan.dogName} va a {plan.placeName}</Text>
                <Text style={styles.walkMessage}>“{plan.message}”</Text>
              </View>
            </View>
            <View style={styles.tagsRow}>
              {plan.tags.map((tag) => (
                <Tag key={tag} label={tag} tone="teal" />
              ))}
              <Tag label={plan.acceptsCompany ? 'accetta compagnia' : 'solo io'} tone={plan.acceptsCompany ? 'green' : 'orange'} />
            </View>
          </AppCard>
        ))}
      </View>

      <AppCard tone="teal">
        <View style={styles.headerRow}>
          <IconBubble source={baubookImages.icons.notifications} size={58} tone="plain" />
          <View style={styles.headerCopy}>
            <Text style={styles.cardTitle}>Notifiche leggere</Text>
            <Text style={styles.bodyText}>Solo per eventi utili: nuove passeggiate vicine, alert smarrimento, pericoli attivi. No spam da social network.</Text>
          </View>
        </View>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerCopy: {
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
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  walkList: {
    gap: spacing.md,
  },
  walkHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  walkCopy: {
    flex: 1,
    gap: 4,
  },
  walkTime: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  walkTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  walkMessage: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
});
