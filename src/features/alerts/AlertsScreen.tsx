import { Image, StyleSheet, Text, View } from 'react-native';

import { baubookImages } from '../../shared/assets/images';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { Tag } from '../../shared/components/Tag';
import { demoAlerts, moderationChecklist } from '../../shared/data/mockData';
import { colors, spacing, typography } from '../../shared/theme/theme';

export function AlertsScreen() {
  return (
    <Screen>
      <SectionHeader
        eyebrow="Community locale"
        title="Emergenze con cintura di sicurezza"
        description="Cane smarrito e pericoli sono funzioni delicate: verifica utente, raggio limitato, storico, chiusura e abuso segnalabile."
      />

      <AppCard tone="danger">
        <View style={styles.criticalHeader}>
          <IconBubble source={baubookImages.icons.lostDog} size={72} tone="plain" />
          <View style={styles.criticalCopy}>
            <Text style={styles.eyebrow}>Mi sono perso!</Text>
            <Text style={styles.cardTitle}>Alert locale, non panico globale.</Text>
            <Text style={styles.bodyText}>Area indicativa disegnata su mappa, foto cane, avvistamenti e chiusura evento.</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <AppButton label="Crea alert" variant="danger" icon={baubookImages.icons.lostDog} />
          <AppButton label="Volantino" variant="ghost" icon={baubookImages.icons.recovered} />
        </View>
      </AppCard>

      <AppCard tone="warm">
        <View style={styles.criticalHeader}>
          <IconBubble source={baubookImages.icons.danger} size={66} tone="plain" />
          <View style={styles.criticalCopy}>
            <Text style={styles.eyebrow}>Pericolo!</Text>
            <Text style={styles.cardTitle}>Segnalazioni temporanee</Text>
            <Text style={styles.bodyText}>Bocconi sospetti, animali vaganti, aree da evitare. Ogni evento ha TTL e moderazione.</Text>
          </View>
        </View>
        <View style={styles.tagsRow}>
          <Tag label="2h" tone="orange" />
          <Tag label="6h" tone="orange" />
          <Tag label="24h" tone="orange" />
          <Tag label="72h" tone="orange" />
        </View>
      </AppCard>

      <View style={styles.alertList}>
        {demoAlerts.map((alert) => (
          <AppCard key={alert.id}>
            <View style={styles.alertHeader}>
              <IconBubble source={alert.icon} size={58} tone={alert.type === 'danger' ? 'danger' : 'pink'} />
              <View style={styles.alertCopy}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMeta}>{alert.area} · {alert.ttlLabel}</Text>
                <Text style={styles.alertDescription}>{alert.description}</Text>
              </View>
            </View>
            <View style={styles.tagsRow}>
              <Tag label={alert.status} tone={alert.status === 'active' ? 'red' : 'green'} />
              <Tag label={alert.type === 'lost_dog' ? 'cane smarrito' : 'pericolo'} tone="pink" />
            </View>
          </AppCard>
        ))}
      </View>

      <AppCard>
        <View style={styles.moderationHeader}>
          <Image source={baubookImages.icons.moderation} style={styles.moderationIcon} />
          <View style={styles.criticalCopy}>
            <Text style={styles.eyebrow}>Moderazione UGC</Text>
            <Text style={styles.cardTitle}>Già prevista nello schema.</Text>
          </View>
        </View>
        <View style={styles.checkList}>
          {moderationChecklist.map((item) => (
            <View key={item} style={styles.checkItem}>
              <Text style={styles.checkMark}>✓</Text>
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  criticalHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  criticalCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
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
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  alertList: {
    gap: spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  alertCopy: {
    flex: 1,
    gap: 4,
  },
  alertTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  alertMeta: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  alertDescription: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
  },
  moderationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  moderationIcon: {
    width: 62,
    height: 62,
    resizeMode: 'contain',
  },
  checkList: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  checkItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  checkMark: {
    color: colors.success,
    fontSize: typography.body,
    fontWeight: '900',
  },
  checkText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '700',
  },
});
