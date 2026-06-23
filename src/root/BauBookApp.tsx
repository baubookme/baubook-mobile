import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ImageSourcePropType } from 'react-native';

import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AlertsScreen } from '../features/alerts/AlertsScreen';

import { DogProfileScreen } from '../features/dogs/DogProfileScreen';

import { HomeScreen } from '../features/home/HomeScreen';

import { MapScreen } from '../features/map/MapScreen';
import { PackScreen } from '../features/pack/PackScreen';

import { ProfileScreen } from '../features/profile/ProfileScreen';

import { WalksScreen } from '../features/walks/WalksScreen';

import { baubookImages } from '../shared/assets/images';

import { AuthProvider, useAuthAccount } from '../shared/auth/AuthProvider';

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

 { key: 'home', label: 'Home', icon: baubookImages.homeTabAvatar, tone: 'teal', isLogo: true },

 { key: 'map', label: 'Mappa', icon: baubookImages.icons.map, tone: 'orange' },

 { key: 'dog', label: 'Io sono', icon: baubookImages.icons.dogProfile, tone: 'green' },
 { key: 'walks', label: 'Passeggio', icon: baubookImages.icons.walks, tone: 'teal' },

 { key: 'pack', label: 'Branco', icon: baubookImages.icons.friends, tone: 'pink' },

 { key: 'alerts', label: 'Aiuto', icon: baubookImages.icons.lostDog, tone: 'red' },

 { key: 'profile', label: 'Setup', icon: baubookImages.icons.settings, tone: 'neutral' },

];

type StartupAuthPromptProps = {

 onRegister: () => void;

 onDemo: () => void;

};

function StartupAuthPrompt({ onRegister, onDemo }: StartupAuthPromptProps) {

 const { status, isSignedIn, isDemoMode, startDemoMode } = useAuthAccount();

 const [visible, setVisible] = useState(false);

 const hasPromptedRef = useRef(false);

 useEffect(() => {

  if (isSignedIn || isDemoMode) {

   setVisible(false);

   return;

  }

  if (status === 'signed_out' && !hasPromptedRef.current) {

   hasPromptedRef.current = true;

   setVisible(true);

  }

 }, [isDemoMode, isSignedIn, status]);

 const handleRegisterPress = () => {

  setVisible(false);

  onRegister();

 };

 const handleDemoPress = () => {

  setVisible(false);

  startDemoMode();

  onDemo();

 };

 return (

  <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>

   <View style={styles.authModalBackdrop}>

    <View style={styles.authModalCard}>

     <Text style={styles.authModalEyebrow}>Accesso richiesto</Text>

     <Text style={styles.authModalTitle}>Non sei registrato 👤</Text>

     <Text style={styles.authModalText}>

      Accedi o registrati per salvare il profilo, il tuo amico 🐾 e usare BauBook in modo completo. Oppure dai prima un’occhiata in modalità demo.

     </Text>

     <View style={styles.authModalActions}>

      <Pressable

       onPress={handleRegisterPress}

       accessibilityRole="button"

       accessibilityLabel="Registrati o accedi"

       style={({ pressed }) => [styles.authModalButton, pressed && styles.authModalButtonPressed]}

      >

       <Text style={styles.authModalButtonText}>Registrati / Accedi</Text>

      </Pressable>

      <Pressable

       onPress={handleDemoPress}

       accessibilityRole="button"

       accessibilityLabel="Vorrei dare un'occhiata"

       style={({ pressed }) => [styles.authModalButton, styles.authModalSecondaryButton, pressed && styles.authModalButtonPressed]}

      >

       <Text style={[styles.authModalButtonText, styles.authModalSecondaryButtonText]}>Vorrei dare un’occhiata</Text>

      </Pressable>

     </View>

    </View>

   </View>

  </Modal>

 );

}

function BauBookShell() {

 const { status, isSignedIn, isDemoMode } = useAuthAccount();

 const [activeTab, setActiveTab] = useState<TabKey>('home');

 const registrationLocked = status === 'signed_out' && !isSignedIn && !isDemoMode;

 useEffect(() => {

  if (registrationLocked && activeTab !== 'profile') {

   setActiveTab('profile');

  }

 }, [activeTab, registrationLocked]);

 const handleNavigate = useCallback((nextTab: TabKey) => {

  if (registrationLocked && nextTab !== 'profile') {

   return;

  }

  setActiveTab(nextTab);

 }, [registrationLocked]);

 const handleRegister = useCallback(() => {

  setActiveTab('profile');

 }, []);

 const handleDemo = useCallback(() => {

  setActiveTab('home');

 }, []);

 const screen = useMemo(() => {

 switch (activeTab) {
 case 'home':

 return <HomeScreen onNavigate={handleNavigate} />;

 case 'map':

 return <MapScreen />;

 case 'dog':

 return <DogProfileScreen />;

 case 'walks':

 return <WalksScreen />;

 case 'pack':

 return <PackScreen onNavigate={handleNavigate} />;

 case 'alerts':

 return <AlertsScreen />;

 case 'profile':

 return <ProfileScreen />;

 default:

 return <HomeScreen onNavigate={handleNavigate} />;

 }

 }, [activeTab, handleNavigate]);

 return (

 <>
 <StartupAuthPrompt onRegister={handleRegister} onDemo={handleDemo} />

 <View style={styles.appRoot}>
 <View style={styles.deviceShell}>

 <View style={styles.content}>{screen}</View>

 <View style={styles.tabBar}>

 {tabs.map((tab) => {

 const selected = tab.key === activeTab;

 const tabDisabled = registrationLocked && tab.key !== 'profile';

 return (

 <Pressable

 key={tab.key}

 onPress={() => handleNavigate(tab.key)}

 disabled={tabDisabled}

 accessibilityRole="button"

 accessibilityState={{ selected, disabled: tabDisabled }}

 accessibilityLabel={`Vai a ${tab.label}`}

 style={({ pressed }) => [

 styles.tabButton,

 selected && styles.tabButtonSelected,

 tabDisabled && styles.tabButtonDisabled,

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

 <Text

 style={[

 styles.tabLabel,

 selected && styles.tabLabelSelected,

 tabDisabled && styles.tabLabelDisabled,

 ]}

 numberOfLines={1}

 >

 {tab.label}

 </Text>

 </Pressable>

 );

 })}

 </View>

 </View>
 </View>
 </>

 );

}

export function BauBookApp() {

 return (

 <AuthProvider>
 <BauBookShell />
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

 tabButtonDisabled: {

 opacity: 0.34,

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

 tabLabelDisabled: {

 color: colors.muted,

 },

 authModalBackdrop: {

 flex: 1,

 alignItems: 'center',

 justifyContent: 'center',

 padding: spacing.lg,

 backgroundColor: 'rgba(39, 28, 16, 0.38)',

 },

 authModalCard: {

 width: '100%',

 maxWidth: 420,

 borderRadius: 30,

 borderWidth: 1,

 borderColor: colors.navBorder,

 backgroundColor: colors.navSurface,

 padding: spacing.lg,

 ...shadows.card,

 },

 authModalEyebrow: {

 color: colors.muted,

 fontSize: 12,

 fontWeight: '900',

 letterSpacing: 0.5,

 textTransform: 'uppercase',

 marginBottom: spacing.xs,

 },

 authModalTitle: {

 color: colors.primaryDark,

 fontSize: 24,

 fontWeight: '900',

 marginBottom: spacing.sm,

 },

 authModalText: {

 color: colors.muted,

 fontSize: 15,

 lineHeight: 22,

 fontWeight: '700',

 marginBottom: spacing.lg,

 },

 authModalActions: {

  gap: spacing.sm,

 },

 authModalButton: {

 minHeight: 52,

 borderRadius: 22,

 alignItems: 'center',

 justifyContent: 'center',

 backgroundColor: colors.primaryDark,

 paddingHorizontal: spacing.lg,

 },

 authModalButtonPressed: {

 opacity: 0.86,

 transform: [{ scale: 0.98 }],

 },

 authModalSecondaryButton: {

 backgroundColor: colors.surface,

 borderWidth: 1,

 borderColor: colors.border,

 },

 authModalButtonText: {

 color: colors.navSurface,

 fontSize: 16,

 fontWeight: '900',

 },

 authModalSecondaryButtonText: {

 color: colors.primaryDark,

 },

});
