import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { getWeeklyDogTip } from '../data/weeklyDogTips';

declare const require: ((moduleName: string) => unknown) | undefined;

const PARTNERSHIP_EMAIL = 'admin@baubook.me';
const DISMISSED_TIP_STORAGE_KEY = 'baubook.home.dismissedWeeklyDogTipId';

type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

function getOptionalAsyncStorage(): AsyncStorageLike | null {
  try {
    if (typeof require !== 'function') {
      return null;
    }

    const asyncStorageModule = require('@react-native-async-storage/async-storage') as
      | ({ default?: AsyncStorageLike } & Partial<AsyncStorageLike>)
      | undefined;

    return asyncStorageModule?.default ?? (asyncStorageModule as AsyncStorageLike | undefined) ?? null;
  } catch {
    return null;
  }
}

export function HomeTopInsightBadges() {
  const weeklyTip = useMemo(() => getWeeklyDogTip(), []);
  const [isTipVisible, setIsTipVisible] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const storage = getOptionalAsyncStorage();

    if (!storage) {
      return () => {
        isMounted = false;
      };
    }

    storage
      .getItem(DISMISSED_TIP_STORAGE_KEY)
      .then((dismissedTipId) => {
        if (isMounted && dismissedTipId === weeklyTip.id) {
          setIsTipVisible(false);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [weeklyTip.id]);

  const dismissWeeklyTip = useCallback(() => {
    setIsTipVisible(false);

    const storage = getOptionalAsyncStorage();
    storage?.setItem(DISMISSED_TIP_STORAGE_KEY, weeklyTip.id).catch(() => undefined);
  }, [weeklyTip.id]);

  const openPartnershipEmail = useCallback(() => {
    const subject = encodeURIComponent('Richiesta partnership BauBook');
    const body = encodeURIComponent(
      'Ciao BauBook,\n\nvorrei ricevere informazioni per una possibile partnership con BauBook.\n\nNome attività:\nCittà:\nTelefono:\nNote:\n',
    );

    Linking.openURL(`mailto:${PARTNERSHIP_EMAIL}?subject=${subject}&body=${body}`).catch(() => undefined);
  }, []);

  return (
    <View style={styles.wrapper}>
      {isTipVisible ? (
        <View style={styles.tipBadge}>
          <View style={styles.tipHeaderRow}>
            <View style={styles.tipHeadingCluster}>
              <Text style={styles.tipEyebrow}>Tip della settimana</Text>
              <Text style={styles.tipPill}>news utile</Text>
            </View>
            <Pressable
              accessibilityLabel="Chiudi tip della settimana"
              accessibilityRole="button"
              hitSlop={8}
              onPress={dismissWeeklyTip}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            >
              <Text style={styles.closeButtonText}>Chiudi</Text>
            </Pressable>
          </View>
          <Text style={styles.tipTitle}>{weeklyTip.title}</Text>
          <Text style={styles.tipBody}>{weeklyTip.body}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="Richiedi partnership BauBook"
        accessibilityRole="button"
        onPress={openPartnershipEmail}
        style={({ pressed }) => [styles.partnershipBadge, pressed && styles.partnershipBadgePressed]}
      >
        <View style={styles.pawIcon}>
          <Text style={styles.pawIconText}>🐾</Text>
        </View>
        <View style={styles.partnershipCopy}>
          <Text style={styles.partnershipTitle}>Richiedi partnership</Text>
          <Text style={styles.partnershipSubtitle}>Scrivi a {PARTNERSHIP_EMAIL}</Text>
        </View>
        <Text style={styles.partnershipArrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
    marginBottom: 14,
  },
  tipBadge: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(64, 91, 69, 0.14)',
    backgroundColor: 'rgba(247, 244, 234, 0.86)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tipHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tipHeadingCluster: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingRight: 8,
  },
  tipEyebrow: {
    color: '#53634f',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  tipPill: {
    borderRadius: 999,
    color: '#586451',
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  closeButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }],
  },
  closeButtonText: {
    color: '#64705c',
    fontSize: 11,
    fontWeight: '800',
  },
  tipTitle: {
    color: '#243321',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  tipBody: {
    color: '#566252',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 4,
  },
  partnershipBadge: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(94, 110, 76, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  partnershipBadgePressed: {
    opacity: 0.72,
    transform: [{ scale: 0.995 }],
  },
  pawIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(242, 210, 126, 0.36)',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pawIconText: {
    fontSize: 18,
  },
  partnershipCopy: {
    flex: 1,
  },
  partnershipTitle: {
    color: '#293424',
    fontSize: 14,
    fontWeight: '800',
  },
  partnershipSubtitle: {
    color: '#6b7465',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  partnershipArrow: {
    color: '#68745f',
    fontSize: 26,
    fontWeight: '700',
    marginLeft: 2,
    marginTop: -2,
  },
});
