import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getWeeklyDogTip } from '../data/weeklyDogTips';
import { BauBookContactSheet } from './BauBookContactSheet';

export function HomeTopInsightBadges() {
  const tip = useMemo(() => getWeeklyDogTip(), []);
  const dismissedKey = `baubook_weekly_tip_dismissed_v1:${tip.id}`;
  const [tipVisible, setTipVisible] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(dismissedKey)
      .then((value) => {
        if (mounted) setTipVisible(value !== 'true');
      })
      .catch(() => {
        if (mounted) setTipVisible(true);
      });

    return () => {
      mounted = false;
    };
  }, [dismissedKey]);

  async function closeTip() {
    setTipVisible(false);
    await AsyncStorage.setItem(dismissedKey, 'true');
  }

  return (
    <View style={styles.wrapper}>
      {tipVisible ? (
        <View style={styles.tipCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.eyebrow}>Tip della settimana</Text>
              <Text style={styles.title}>{tip.title}</Text>
            </View>
            <Text style={styles.badge}>news utile</Text>
          </View>
          <Text style={styles.body}>{tip.body}</Text>
          <Pressable accessibilityRole="button" onPress={closeTip} style={styles.closeTipButton}>
            <Text style={styles.closeTipText}>Chiudi</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => setContactVisible(true)}
        style={styles.partnerCard}
      >
        <View style={styles.pawBadge}>
          <Text style={styles.paw}>🐾</Text>
        </View>
        <View style={styles.partnerTextWrap}>
          <Text style={styles.partnerTitle}>Richiedi partnership</Text>
          <Text style={styles.partnerBody}>Invia una richiesta direttamente in app</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <BauBookContactSheet
        visible={contactVisible}
        type="partnership"
        onClose={() => setContactVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
    marginBottom: 16,
  },
  tipCard: {
    borderRadius: 22,
    backgroundColor: '#fff5df',
    padding: 16,
    borderWidth: 1,
    borderColor: '#efd8ad',
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    color: '#a36f26',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#35281e',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 3,
  },
  badge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#f2dfb8',
    color: '#704914',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  body: {
    color: '#665444',
    fontSize: 14,
    lineHeight: 20,
  },
  closeTipButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#ead3a4',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  closeTipText: {
    color: '#5c3b13',
    fontSize: 12,
    fontWeight: '800',
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#eef8f1',
    padding: 14,
    borderWidth: 1,
    borderColor: '#cce8d5',
    gap: 12,
  },
  pawBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#d8f0df',
  },
  paw: {
    fontSize: 22,
  },
  partnerTextWrap: {
    flex: 1,
  },
  partnerTitle: {
    color: '#203f2d',
    fontSize: 16,
    fontWeight: '900',
  },
  partnerBody: {
    color: '#52735d',
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    color: '#2f7d5c',
    fontSize: 28,
    fontWeight: '600',
  },
});
