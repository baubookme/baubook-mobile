import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { FIRST_STEPS, type FirstStepKey } from '../data/firstSteps';

declare const require: ((moduleName: string) => unknown) | undefined;

const STORAGE_KEY = 'baubook.home.firstSteps.2.1.1';
const FEEDBACK_EMAIL = 'admin@baubook.me';

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

function readCompletedKeys(raw: string | null): FirstStepKey[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is FirstStepKey =>
      FIRST_STEPS.some((step) => step.key === value),
    );
  } catch {
    return [];
  }
}

function encodeMailBody() {
  return encodeURIComponent(
    'Ciao BauBook,\n\nsto provando la beta e vorrei lasciare questo feedback:\n\nCosa ho provato:\n\nCosa mi e stato chiaro:\n\nCosa migliorerei:\n\nDispositivo, se utile:\n',
  );
}

export function HomeFirstStepsCommandCenter() {
  const [completedKeys, setCompletedKeys] = useState<FirstStepKey[]>([]);
  const [lastHint, setLastHint] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const storage = getOptionalAsyncStorage();

    if (!storage) {
      return () => {
        isMounted = false;
      };
    }

    storage
      .getItem(STORAGE_KEY)
      .then((raw) => {
        if (isMounted) {
          setCompletedKeys(readCompletedKeys(raw));
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const persistCompletedKeys = useCallback((nextKeys: FirstStepKey[]) => {
    const uniqueKeys = Array.from(new Set(nextKeys));
    setCompletedKeys(uniqueKeys);

    const storage = getOptionalAsyncStorage();
    storage?.setItem(STORAGE_KEY, JSON.stringify(uniqueKeys)).catch(() => undefined);
  }, []);

  const toggleStep = useCallback(
    (key: FirstStepKey) => {
      const isCompleted = completedKeys.includes(key);
      const nextKeys = isCompleted
        ? completedKeys.filter((completedKey) => completedKey !== key)
        : [...completedKeys, key];

      persistCompletedKeys(nextKeys);
    },
    [completedKeys, persistCompletedKeys],
  );

  const openFeedbackEmail = useCallback(() => {
    const subject = encodeURIComponent('Feedback beta BauBook');
    Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${encodeMailBody()}`).catch(() => undefined);
    persistCompletedKeys([...completedKeys, 'feedback']);
  }, [completedKeys, persistCompletedKeys]);

  const handlePrimaryAction = useCallback(
    (key: FirstStepKey) => {
      const step = FIRST_STEPS.find((item) => item.key === key);
      if (!step) {
        return;
      }

      if (key === 'feedback') {
        openFeedbackEmail();
        return;
      }

      setLastHint(step.hint);
      persistCompletedKeys([...completedKeys, key]);
    },
    [completedKeys, openFeedbackEmail, persistCompletedKeys],
  );

  const completedCount = completedKeys.length;
  const progressWidth = `${Math.round((completedCount / FIRST_STEPS.length) * 100)}%` as `${number}%`;
  const progressLabel = useMemo(
    () => `${completedCount}/${FIRST_STEPS.length} completati`,
    [completedCount],
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>PRIMI PASSI</Text>
          <Text style={styles.title}>Cosa provare nella beta</Text>
          <Text style={styles.subtitle}>Una mini-checklist per testare BauBook senza perdersi tra le sezioni.</Text>
        </View>
        <View style={styles.progressPill}>
          <Text style={styles.progressText}>{progressLabel}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <View style={styles.stepsList}>
        {FIRST_STEPS.map((step) => {
          const isCompleted = completedKeys.includes(step.key);

          return (
            <View key={step.key} style={[styles.stepRow, isCompleted && styles.stepRowDone]}>
              <Pressable
                accessibilityLabel={isCompleted ? `Segna da fare ${step.title}` : `Segna completato ${step.title}`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => toggleStep(step.key)}
                style={[styles.checkButton, isCompleted && styles.checkButtonDone]}
              >
                <Text style={[styles.checkButtonText, isCompleted && styles.checkButtonTextDone]}>
                  {isCompleted ? '\u2713' : String(step.order)}
                </Text>
              </Pressable>

              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>

              <Pressable
                accessibilityLabel={step.actionLabel}
                accessibilityRole="button"
                onPress={() => handlePrimaryAction(step.key)}
                style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
              >
                <Text style={styles.actionButtonText}>{step.actionLabel}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {lastHint ? (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>{lastHint}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: 'rgba(79, 105, 73, 0.15)',
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: '#78856f',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  title: {
    color: '#22311f',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  subtitle: {
    color: '#5f6d59',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  progressPill: {
    backgroundColor: 'rgba(242, 210, 126, 0.34)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  progressText: {
    color: '#5f674e',
    fontSize: 11,
    fontWeight: '900',
  },
  progressTrack: {
    backgroundColor: 'rgba(79, 105, 73, 0.1)',
    borderRadius: 999,
    height: 7,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: 'rgba(91, 124, 74, 0.78)',
    borderRadius: 999,
    height: 7,
  },
  stepsList: {
    gap: 9,
  },
  stepRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(248, 246, 239, 0.82)',
    borderColor: 'rgba(93, 112, 80, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  stepRowDone: {
    backgroundColor: 'rgba(236, 244, 230, 0.9)',
  },
  checkButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderColor: 'rgba(94, 112, 82, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  checkButtonDone: {
    backgroundColor: '#5d7c4f',
    borderColor: '#5d7c4f',
  },
  checkButtonText: {
    color: '#637259',
    fontSize: 12,
    fontWeight: '900',
  },
  checkButtonTextDone: {
    color: '#ffffff',
  },
  stepCopy: {
    flex: 1,
  },
  stepTitle: {
    color: '#253421',
    fontSize: 14,
    fontWeight: '900',
  },
  stepDescription: {
    color: '#697363',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: 'rgba(94, 112, 82, 0.13)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  actionButtonText: {
    color: '#53684e',
    fontSize: 11,
    fontWeight: '900',
  },
  hintBox: {
    backgroundColor: 'rgba(242, 210, 126, 0.24)',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  hintText: {
    color: '#657052',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
});
