import { useMemo, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AlertsScreen } from '../features/alerts/AlertsScreen';
import { DogProfileScreen } from '../features/dogs/DogProfileScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { PackScreen } from '../features/pack/PackScreen';
import { MapScreen } from '../features/map/MapScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { WalksScreen } from '../features/walks/WalksScreen';
import { baubookImages } from '../shared/assets/images';
import { AuthProvider } from '../shared/auth/AuthProvider';
import { colors, spacing, shadows } from '../shared/theme/theme';
import type { TabKey } from '../shared/types/domain';

const tabs: Array<{ key: TabKey; label: string; icon: ImageSourcePropType; isLogo?: boolean }> = [
  { key: 'home', label: 'Home', icon: baubookImages.tabHome, isLogo: true },
  { key: 'map', label: 'Mappa', icon: baubookImages.icons.map },
  { key: 'dog', label: 'Io sono', icon: baubookImages.icons.dogProfile },
  { key: 'walks', label: 'Passeggio', icon: baubookImages.icons.walks },
  { key: 'pack', label: 'Branco', icon: baubookImages.icons.friends },
  { key: 'alerts', label: 'Aiuto', icon: baubookImages.icons.lostDog },
  { key: 'profile', label: 'Setup', icon: baubookImages.icons.settings },
];

export function BauBookApp() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  const screen = useMemo(() => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigate={setActiveTab} />;
      case 'map':
        return <MapScreen />;
      case 'dog':
        return <DogProfileScreen />;
      case 'walks':
        return <WalksScreen onNavigate={setActiveTab} />;
      case 'pack': return <PackScreen onNavigate={setActiveTab} />; case 'alerts': return <AlertsScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen onNavigate={setActiveTab} />;
    }
  }, [activeTab]);

  return (
    <AuthProvider>
      <View style={styles.appRoot}>
      <View style={styles.deviceShell}>
        <View style={styles.content}>{screen}</View>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const selected = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Apri ${tab.label}`}
                onPress={() => setActiveTab(tab.key)}
                style={({ pressed }) => [styles.tabButton, selected && styles.tabButtonSelected, pressed && styles.tabButtonPressed]}
                hitSlop={6}
              >
                <View style={styles.tabIconWrap}>
                  <Image
                    source={tab.icon}
                    style={[styles.tabIcon, tab.isLogo && styles.tabLogoIcon, selected && styles.tabIconSelected]}
                  />
                </View>
                <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  deviceShell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : undefined,
    backgroundColor: colors.background,
    overflow: 'hidden',
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: colors.navBorder,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: Platform.OS === 'web' ? spacing.md : spacing.sm,
    minHeight: 76,
    borderRadius: 30,
    backgroundColor: colors.navSurface,
    borderWidth: 1,
    borderColor: colors.navBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    paddingVertical: 6,
    ...shadows.card,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    alignSelf: 'stretch',
    borderRadius: 24,
    paddingVertical: 3,
  },
  tabButtonSelected: {
    backgroundColor: colors.navSelected,
  },
  tabButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  tabIconWrap: {
    width: 46,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  tabLogoIcon: {
    width: 46,
    height: 46,
  },
  tabIconSelected: {
    transform: [{ scale: 1.07 }],
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  tabLabelSelected: {
    color: colors.primaryDark,
  },
});
