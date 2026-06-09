import { useMemo, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AlertsScreen } from '../features/alerts/AlertsScreen';
import { DogProfileScreen } from '../features/dogs/DogProfileScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { MapScreen } from '../features/map/MapScreen';
import { PackScreen } from '../features/pack/PackScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { WalksScreen } from '../features/walks/WalksScreen';
import { baubookImages } from '../shared/assets/images';
import { AuthProvider } from '../shared/auth/AuthProvider';
import { CartoonTabIcon, type CartoonTone } from '../shared/components/CartoonTabIcon';
import { colors, shadows, spacing } from '../shared/theme/theme';
import type { TabKey } from '../shared/types/domain';

type TabItem = {
  key: TabKey;
  label: string;
  icon: ImageSourcePropType;
  tone: CartoonTone;
  isLogo?: boolean;
};

const tabs: TabItem[] = [
  { key: 'home', label: 'Home', icon: baubookImages.tabHome, tone: 'teal', isLogo: true },
  { key: 'map', label: 'Mappa', icon: baubookImages.icons.map, tone: 'orange' },
  { key: 'dog', label: 'Io sono', icon: baubookImages.icons.dogProfile, tone: 'green' },
  { key: 'walks', label: 'Passeggio', icon: baubookImages.icons.walks, tone: 'teal' },
  { key: 'pack', label: 'Branco', icon: baubookImages.icons.friends, tone: 'pink' },
  { key: 'alerts', label: 'Aiuto', icon: baubookImages.icons.lostDog, tone: 'red' },
  { key: 'profile', label: 'Setup', icon: baubookImages.icons.settings, tone: 'neutral' },
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
        return <WalksScreen />;
      case 'pack':
        return <PackScreen onNavigate={setActiveTab} />;
      case 'alerts':
        return <AlertsScreen />;
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
                  onPress={() => setActiveTab(tab.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Vai a ${tab.label}`}
                  style={({ pressed }) => [
                    styles.tabButton,
                    selected && styles.tabButtonSelected,
                    pressed && styles.tabButtonPressed,
                  ]}
                  hitSlop={6}
                >
                  <CartoonTabIcon
                    icon={tab.icon}
                    label={tab.label}
                    selected={selected}
                    tone={tab.tone}
                    isLogo={tab.isLogo}
                  />
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
    left: spacing.md,
    right: spacing.md,
    bottom: Platform.OS === 'web' ? spacing.md : spacing.sm,
    minHeight: 88,
    borderRadius: 34,
    backgroundColor: colors.navSurface,
    borderWidth: 1,
    borderColor: colors.navBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    paddingVertical: 7,
    ...shadows.card,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    alignSelf: 'stretch',
    borderRadius: 26,
    paddingVertical: 3,
  },
  tabButtonSelected: {
    backgroundColor: colors.navSelected,
  },
  tabButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  tabLabelSelected: {
    color: colors.primaryDark,
  },
});
