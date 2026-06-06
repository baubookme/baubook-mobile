import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { baubookImages } from '../../shared/assets/images';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { FeatureCard } from '../../shared/components/FeatureCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { Tag } from '../../shared/components/Tag';
import { comingSoonFeatures, heroPromises, mvpFeatures } from '../../shared/data/mockData';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';
import type { ComingSoonFeatureModel, TabKey } from '../../shared/types/domain';

interface HomeScreenProps {
  onNavigate: (tab: TabKey) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Image source={baubookImages.logo} style={styles.logo} />
        </View>
        <View style={styles.betaRow}>
          <Tag label="BETA VENEZIA-MESTRE" tone="teal" />
          <Tag label="MVP locale" tone="orange" />
        </View>
        <Text style={styles.title}>Il diario di bordo del tuo cane in città.</Text>
        <Text style={styles.subtitle}>
          Prima versione focalizzata su luoghi, passeggiate e sicurezza locale. Tutto il resto resta in roadmap.
        </Text>
      </View>

      <AppCard tone="warm">
        <View style={styles.promiseHeader}>
          <IconBubble source={baubookImages.icons.neighbours} size={64} tone="teal" />
          <View style={styles.promiseTextWrap}>
            <Text style={styles.cardEyebrow}>Le 3 promesse dell'MVP</Text>
            <Text style={styles.cardTitle}>Poche cose, fatte bene.</Text>
          </View>
        </View>
        <View style={styles.promiseList}>
          {heroPromises.map((promise, index) => (
            <View key={promise} style={styles.promiseItem}>
              <Text style={styles.promiseNumber}>{index + 1}</Text>
              <Text style={styles.promiseText}>{promise}</Text>
            </View>
          ))}
        </View>
        <View style={styles.actionRow}>
          <AppButton label="Apri mappa" icon={baubookImages.icons.map} onPress={() => onNavigate('map')} />
          <AppButton label="Emergenza" icon={baubookImages.icons.lostDog} variant="danger" onPress={() => onNavigate('alerts')} />
        </View>
      </AppCard>

      <View style={styles.features}>
        {mvpFeatures.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} onPress={() => feature.tab && onNavigate(feature.tab)} />
        ))}
      </View>

      <AppCard>
        <View style={styles.comingSoonHeader}>
          <Image source={baubookImages.badges.inArrivo} style={styles.badge} />
          <View style={styles.inlineCopy}>
            <Text style={styles.cardEyebrow}>Coming Soon</Text>
            <Text style={styles.cardTitle}>La versione estesa resta in roadmap.</Text>
            <Text style={styles.bodyText}>
              Per la beta partiamo stretti: luoghi, passeggiate e sicurezza. Queste funzioni arriveranno dopo, senza appesantire l'MVP.
            </Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.comingSoonRail}
        >
          {comingSoonFeatures.map((feature) => (
            <ComingSoonBadge key={feature.title} feature={feature} />
          ))}
        </ScrollView>
      </AppCard>
    </Screen>
  );
}

function ComingSoonBadge({ feature }: { feature: ComingSoonFeatureModel }) {
  return (
    <View style={[styles.comingSoonBadge, comingSoonTones[feature.tone]]}>
      <Image source={feature.icon} style={styles.comingSoonIcon} />
      <View style={styles.comingSoonCopy}>
        <Text style={styles.comingSoonLabel}>Coming soon</Text>
        <Text style={styles.comingSoonTitle} numberOfLines={2}>
          {feature.title}
        </Text>
        <Text style={styles.comingSoonSubtitle} numberOfLines={2}>
          {feature.subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  logo: {
    width: 260,
    height: 210,
    resizeMode: 'contain',
  },
  betaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  title: {
    color: colors.ink,
    fontSize: typography.title,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: 'center',
  },
  promiseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  promiseTextWrap: {
    flex: 1,
    gap: 4,
  },
  cardEyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: typography.h2,
    lineHeight: 26,
    fontWeight: '900',
  },
  promiseList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  promiseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  promiseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: colors.primary,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  promiseText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 21,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  features: {
    gap: spacing.md,
  },
  comingSoonHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  badge: {
    width: 84,
    height: 84,
    resizeMode: 'contain',
  },
  inlineCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  bodyText: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  comingSoonRail: {
    paddingTop: spacing.lg,
    paddingRight: spacing.lg,
    gap: spacing.sm,
  },
  comingSoonBadge: {
    width: 214,
    minHeight: 118,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  comingSoonIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  comingSoonCopy: {
    flex: 1,
    gap: 2,
  },
  comingSoonLabel: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  comingSoonTitle: {
    color: colors.ink,
    fontSize: typography.small,
    lineHeight: 17,
    fontWeight: '900',
  },
  comingSoonSubtitle: {
    color: colors.muted,
    fontSize: typography.tiny,
    lineHeight: 15,
    fontWeight: '700',
  },
});

const comingSoonTones = StyleSheet.create({
  teal: {
    backgroundColor: colors.tealSoft,
  },
  orange: {
    backgroundColor: colors.orangeSoft,
  },
  pink: {
    backgroundColor: colors.pinkSoft,
  },
  green: {
    backgroundColor: colors.greenSoft,
  },
  red: {
    backgroundColor: colors.redSoft,
  },
});
