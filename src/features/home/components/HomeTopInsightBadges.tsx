import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getWeeklyDogTip } from '../data/weeklyDogTips';
import BauBookContactSheet from './BauBookContactSheet';

const DISMISSED_WEEKLY_TIP_KEY = 'baubook.home.weeklyTip.dismissed.v1';

export function HomeTopInsightBadges() {
  const tip = useMemo(() => getWeeklyDogTip(), []);
  const dismissedValue = `weekly-tip:${tip.id}`;

  const [tipDismissed, setTipDismissed] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(DISMISSED_WEEKLY_TIP_KEY)
      .then((value) => {
        if (mounted) {
          setTipDismissed(value === dismissedValue);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [dismissedValue]);

  async function dismissWeeklyTip() {
    setTipDismissed(true);
    await AsyncStorage.setItem(DISMISSED_WEEKLY_TIP_KEY, dismissedValue);
  }

  return (
    <View style={styles.container}>
      {!tipDismissed ? (
        <View style={styles.tipCard}>
          <Pressable
            accessibilityRole="button"
            onPress={dismissWeeklyTip}
            hitSlop={10}
            style={styles.dismissButton}
          >
            <Text style={styles.dismissText}>Chiudi</Text>
          </Pressable>

          <Text style={styles.eyebrow}>Tip della settimana</Text>
          <Text style={styles.tipTitle}>{tip.title}</Text>
          <Text style={styles.tipBody}>{tip.body}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => setContactOpen(true)}
        style={styles.partnershipCard}
      >
        <View style={styles.partnershipIcon}>
          <Text style={styles.partnershipIconText}>🐾</Text>
        </View>

        <View style={styles.partnershipTextWrap}>
          <Text style={styles.partnershipTitle}>Richiedi partnership</Text>
          <Text style={styles.partnershipBody}>Raccontaci la tua attività dog-friendly</Text>
        </View>

        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <BauBookContactSheet
        visible={contactOpen}
        type="partnership"
        source="home-partnership-cta"
        onClose={() => setContactOpen(false)}
      />
    </View>
  );
}

export default HomeTopInsightBadges;

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 14
  },
  tipCard: {
    position: 'relative',
    borderRadius: 22,
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    backgroundColor: '#fff7e8',
    borderWidth: 1,
    borderColor: '#f0dfc1'
  },
  eyebrow: {
    paddingRight: 78,
    fontSize: 12,
    fontWeight: '800',
    color: '#7a5a36',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  dismissButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f3e2c6'
  },
  dismissText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7a5a36'
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2b241d',
    marginBottom: 4
  },
  tipBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#66584d'
  },
  partnershipCard: {
    minHeight: 62,
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#eef8f0',
    borderWidth: 1,
    borderColor: '#d5ecd9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  partnershipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dff1e3'
  },
  partnershipIconText: {
    fontSize: 18
  },
  partnershipTextWrap: {
    flex: 1
  },
  partnershipTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#24452d'
  },
  partnershipBody: {
    marginTop: 2,
    fontSize: 13,
    color: '#58735f'
  },
  chevron: {
    fontSize: 24,
    fontWeight: '700',
    color: '#58735f'
  }
});