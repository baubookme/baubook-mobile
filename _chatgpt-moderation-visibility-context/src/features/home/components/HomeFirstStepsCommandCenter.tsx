import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { firstSteps, type FirstStepKey } from '../data/firstSteps';

const STORAGE_KEY = 'baubook_first_steps_done_v3';

export function HomeFirstStepsCommandCenter() {
  const [done, setDone] = useState<Record<FirstStepKey, boolean>>({
    dogProfile: false,
    map: false,
    safety: false,
  });

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!mounted || !value) return;
        setDone((current) => ({ ...current, ...JSON.parse(value) }));
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const completed = useMemo(() => firstSteps.filter((step) => done[step.key]).length, [done]);
  const progress = completed / firstSteps.length;

  async function toggleStep(key: FirstStepKey) {
    const next = { ...done, [key]: !done[key] };
    setDone(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Beta guidata</Text>
          <Text style={styles.title}>Primi passi</Text>
        </View>
        <Text style={styles.counter}>{completed}/{firstSteps.length}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <Text style={styles.intro}>
        Prova le funzioni principali in pochi minuti. Puoi segnare i passaggi completati mentre esplori l'app.
      </Text>

      <View style={styles.stepsWrap}>
        {firstSteps.map((step) => {
          const isDone = done[step.key];

          return (
            <View key={step.key} style={styles.stepRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => toggleStep(step.key)}
                style={[styles.check, isDone && styles.checkDone]}
              >
                <Text style={styles.checkText}>{isDone ? '✓' : ''}</Text>
              </Pressable>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
                <Pressable accessibilityRole="button" onPress={() => toggleStep(step.key)} style={styles.stepAction}>
                  <Text style={styles.stepActionText}>{isDone ? step.doneLabel : step.actionLabel}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: '#f7fbff',
    borderWidth: 1,
    borderColor: '#dbeaf6',
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  eyebrow: {
    color: '#477396',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#1f3345',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 3,
  },
  counter: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#d9ebfa',
    color: '#28506f',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#e2edf6',
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#4f91c4',
  },
  intro: {
    color: '#607589',
    fontSize: 13,
    lineHeight: 19,
  },
  stepsWrap: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#91b7d5',
    backgroundColor: '#fff',
    marginTop: 2,
  },
  checkDone: {
    backgroundColor: '#4f91c4',
    borderColor: '#4f91c4',
  },
  checkText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  stepContent: {
    flex: 1,
    gap: 5,
  },
  stepTitle: {
    color: '#24384a',
    fontSize: 15,
    fontWeight: '900',
  },
  stepDescription: {
    color: '#64788a',
    fontSize: 13,
    lineHeight: 18,
  },
  stepAction: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#e4f0fb',
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 2,
  },
  stepActionText: {
    color: '#2e6590',
    fontSize: 12,
    fontWeight: '900',
  },
});
