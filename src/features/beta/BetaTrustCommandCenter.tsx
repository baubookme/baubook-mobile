import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BAUBOOK_RELEASE } from '../../shared/version/baubookVersion';

type TrustTile = {
  title: string;
  body: string;
  state: string;
};

const TRUST_TILES: TrustTile[] = [
  {
    title: 'Sicurezza',
    body: 'Aiuto, cane smarrito e pericolo restano il primo controllo operativo della beta.',
    state: 'pronta',
  },
  {
    title: 'Esperienza beta',
    body: 'Toolbar cartoon, Home radar e comandi principali sono raggruppati in modo piu leggibile.',
    state: '2.0',
  },
  {
    title: 'Launch ops',
    body: 'Versioni, baseline, controlli e documentazione sono tracciati per ogni blocco di rilascio.',
    state: 'locked',
  },
];

export function BetaTrustCommandCenter() {
  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>BauBook beta</Text>
          <Text style={styles.title}>Trust Command Center</Text>
          <Text style={styles.subtitle}>
            Blocco {BAUBOOK_RELEASE.baseline} - {BAUBOOK_RELEASE.releaseName}
          </Text>
        </View>
        <View style={styles.versionPill}>
          <Text style={styles.versionText}>{BAUBOOK_RELEASE.appVersion}</Text>
        </View>
      </View>

      <View style={styles.tilesGrid}>
        {TRUST_TILES.map((tile) => (
          <View key={tile.title} style={styles.tile}>
            <View style={styles.tileHeader}>
              <Text style={styles.tileTitle}>{tile.title}</Text>
              <Text style={styles.tileState}>{tile.state}</Text>
            </View>
            <Text style={styles.tileBody}>{tile.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 18,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F2D6A4',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: '#8A5D13',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#2E2416',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  subtitle: {
    color: '#6A5843',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  versionPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#2E2416',
  },
  versionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  tilesGrid: {
    gap: 10,
    marginTop: 16,
  },
  tile: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5E4C4',
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  tileTitle: {
    color: '#2E2416',
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  tileState: {
    color: '#8A5D13',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  tileBody: {
    color: '#6A5843',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
});
