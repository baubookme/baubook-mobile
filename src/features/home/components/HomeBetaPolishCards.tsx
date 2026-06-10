import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

declare const require: ((moduleName: string) => unknown) | undefined;

const FEEDBACK_EMAIL = 'admin@baubook.me';
const DISMISSED_BETA_WELCOME_STORAGE_KEY = 'baubook.home.dismissedBetaWelcome.2.1.1';

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

export function HomeBetaPolishCards() {
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const storage = getOptionalAsyncStorage();

    if (!storage) {
      return () => {
        isMounted = false;
      };
    }

    storage
      .getItem(DISMISSED_BETA_WELCOME_STORAGE_KEY)
      .then((dismissed) => {
        if (isMounted && dismissed === 'true') {
          setIsWelcomeVisible(false);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const dismissWelcome = useCallback(() => {
    setIsWelcomeVisible(false);

    const storage = getOptionalAsyncStorage();
    storage?.setItem(DISMISSED_BETA_WELCOME_STORAGE_KEY, 'true').catch(() => undefined);
  }, []);

  const openFeedbackEmail = useCallback(() => {
    const subject = encodeURIComponent('Feedback beta BauBook');
    const body = encodeURIComponent(
      'Ciao BauBook,\n\nsto provando la beta e vorrei lasciare questo feedback:\n\nCosa mi piace:\n\nCosa migliorerei:\n\nTelefono/modello dispositivo, se utile:\n',
    );

    Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`).catch(() => undefined);
  }, []);

  return (
    <View style={styles.wrapper}>
      {isWelcomeVisible ? (
        <View style={styles.welcomeCard}>
          <View style={styles.headerRow}>
            <View style={styles.titleCluster}>
              <Text style={styles.betaPill}>BETA</Text>
              <Text style={styles.title}>Benvenuto in BauBook Beta</Text>
            </View>
            <Pressable
              accessibilityLabel="Chiudi benvenuto beta"
              accessibilityRole="button"
              hitSlop={8}
              onPress={dismissWelcome}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Text style={styles.closeButtonText}>Chiudi</Text>
            </Pressable>
          </View>

          <Text style={styles.body}>
            Stiamo costruendo una community per passeggiate, aree cani, sicurezza e servizi dog-friendly. In
            questa fase ogni feedback ci aiuta a rendere l’app più utile e affidabile.
          </Text>

          <View style={styles.quickActionsRow}>
            <Text style={styles.quickAction}>Completa profilo cane</Text>
            <Text style={styles.quickAction}>Vai alla mappa</Text>
            <Text style={styles.quickAction}>Scopri Safety</Text>
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="Invia feedback beta BauBook"
        accessibilityRole="button"
        onPress={openFeedbackEmail}
        style={({ pressed }) => [styles.feedbackCard, pressed && styles.pressed]}
      >
        <View style={styles.feedbackIcon}>
          <Text style={styles.feedbackIconText}>🐶</Text>
        </View>
        <View style={styles.feedbackCopy}>
          <Text style={styles.feedbackTitle}>Invia feedback beta</Text>
          <Text style={styles.feedbackSubtitle}>Segnalaci cosa migliorare prima del lancio pubblico</Text>
        </View>
        <Text style={styles.feedbackArrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
    marginBottom: 14,
  },
  welcomeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(79, 105, 73, 0.16)',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleCluster: {
    flex: 1,
    gap: 6,
  },
  betaPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(242, 210, 126, 0.36)',
    borderRadius: 999,
    color: '#5a664f',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  title: {
    color: '#23311f',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  body: {
    color: '#5a6655',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 11,
  },
  quickAction: {
    backgroundColor: 'rgba(247, 244, 234, 0.88)',
    borderRadius: 999,
    color: '#53634f',
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeButton: {
    backgroundColor: 'rgba(247, 244, 234, 0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeButtonText: {
    color: '#62715c',
    fontSize: 11,
    fontWeight: '900',
  },
  feedbackCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(250, 246, 234, 0.86)',
    borderColor: 'rgba(93, 112, 80, 0.14)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  feedbackIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.76)',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  feedbackIconText: {
    fontSize: 18,
  },
  feedbackCopy: {
    flex: 1,
  },
  feedbackTitle: {
    color: '#293424',
    fontSize: 14,
    fontWeight: '900',
  },
  feedbackSubtitle: {
    color: '#6b7465',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 2,
  },
  feedbackArrow: {
    color: '#68745f',
    fontSize: 26,
    fontWeight: '700',
    marginLeft: 2,
    marginTop: -2,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.995 }],
  },
});
