import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ImageSourcePropType } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const WELCOME_BOARD_STORAGE_KEY = 'baubook.welcomeBoardSeen.v1';

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

const welcomeSlides = [
 {
  eyebrow: 'Benvenuto',
  title: 'BauBook ti aiuta a orientarti subito',
  text: 'Mappa, profilo e strumenti utili sono pensati per partire leggeri, anche se vuoi solo curiosare.',
  icon: baubookImages.welcome.communityLocal,
  tone: 'teal',
 },
 {
  eyebrow: 'Vicino a te',
  title: 'Posti, presenze e passeggiate',
  text: 'Trova luoghi utili, guarda cosa succede nei dintorni e scopri funzioni pensate per la vita con il tuo cane.',
  icon: baubookImages.welcome.mapWalks,
  tone: 'orange',
 },
 {
  eyebrow: 'Community',
  title: 'Branco e aiuto quando serve',
  text: 'Aggiungi amici BauBook, segnala contenuti non adatti e usa gli alert con calma e responsabilità.',
  icon: baubookImages.welcome.packSafety,
  tone: 'pink',
 },
] satisfies Array<{
 eyebrow: string;
 title: string;
 text: string;
 icon: ImageSourcePropType;
 tone: 'teal' | 'orange' | 'pink';
}>;

type WelcomeBoardStatus = 'checking' | 'show' | 'done';

type WelcomeBoardProps = {

 visible: boolean;

 onDone: () => void;

};

function WelcomeBoard({ visible, onDone }: WelcomeBoardProps) {

 const [slideIndex, setSlideIndex] = useState(0);

 const slide = welcomeSlides[slideIndex];

 const isLastSlide = slideIndex === welcomeSlides.length - 1;

 const heroToneStyle = slide.tone === 'orange'
  ? styles.welcomeHeroOrange
  : slide.tone === 'pink'
   ? styles.welcomeHeroPink
   : styles.welcomeHeroTeal;

 useEffect(() => {

  if (visible) {

   setSlideIndex(0);

  }

 }, [visible]);

 const handleNext = () => {

  if (isLastSlide) {

   onDone();

   return;

  }

  setSlideIndex((current) => Math.min(current + 1, welcomeSlides.length - 1));

 };

 return (

  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>

   <View style={styles.welcomeBackdrop}>

    <View style={styles.welcomeCard}>

     <View style={styles.welcomeTopRow}>

      <Text style={styles.welcomeStepText}>{slideIndex + 1}/{welcomeSlides.length}</Text>

      <Pressable
       onPress={onDone}
       accessibilityRole="button"
       accessibilityLabel="Salta welcome BauBook"
       style={({ pressed }) => [styles.welcomeSkipButton, pressed && styles.welcomeButtonPressed]}
      >

       <Text style={styles.welcomeSkipText}>Salta</Text>

      </Pressable>

     </View>

     <View style={[styles.welcomeHero, heroToneStyle]}>

      <Image source={slide.icon} style={styles.welcomeHeroImage} />

     </View>

     <View style={styles.welcomeCopy}>

      <Text style={styles.welcomeEyebrow}>{slide.eyebrow}</Text>

      <Text style={styles.welcomeTitle}>{slide.title}</Text>

      <Text style={styles.welcomeText}>{slide.text}</Text>

     </View>

     <View style={styles.welcomeDotsRow}>

      {welcomeSlides.map((item, index) => (

       <View key={item.eyebrow} style={[styles.welcomeDot, index === slideIndex && styles.welcomeDotActive]} />

      ))}

     </View>

     <Pressable
      onPress={handleNext}
      accessibilityRole="button"
      accessibilityLabel={isLastSlide ? 'Vai alla scelta accesso' : 'Vai alla prossima slide'}
      style={({ pressed }) => [styles.welcomePrimaryButton, pressed && styles.welcomeButtonPressed]}
     >

      <Text style={styles.welcomePrimaryButtonText}>{isLastSlide ? 'Inizia' : 'Avanti'}</Text>

     </Pressable>

    </View>

   </View>

  </Modal>

 );

}

type StartupAuthPromptProps = {

 onRegister: () => void;

 onDemo: () => void;

 enabled: boolean;

};

function StartupAuthPrompt({ onRegister, onDemo, enabled }: StartupAuthPromptProps) {

 const { status, isSignedIn, isDemoMode, startDemoMode } = useAuthAccount();

 const [visible, setVisible] = useState(false);

 const hasPromptedRef = useRef(false);

 useEffect(() => {

  if (!enabled) {

   setVisible(false);

   return;

  }

  if (isSignedIn || isDemoMode) {

   setVisible(false);

   return;

  }

  if (status === 'signed_out' && !hasPromptedRef.current) {

   hasPromptedRef.current = true;

   setVisible(true);

  }

 }, [enabled, isDemoMode, isSignedIn, status]);

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

     <Text style={styles.authModalEyebrow}>BauBook</Text>

     <Text style={styles.authModalTitle}>Come vuoi entrare?</Text>

     <Text style={styles.authModalText}>

      Accedi per salvare profilo e attività, oppure entra in demo per guardarti intorno prima di registrarti.

     </Text>

     <View style={styles.authModalActions}>

      <Pressable

       onPress={handleRegisterPress}

       accessibilityRole="button"

       accessibilityLabel="Accedi a BauBook"

       style={({ pressed }) => [styles.authModalButton, pressed && styles.authModalButtonPressed]}

      >

       <Text style={styles.authModalButtonText}>Accedi</Text>

      </Pressable>

      <Pressable

       onPress={handleDemoPress}

       accessibilityRole="button"

       accessibilityLabel="Voglio dare un'occhiata"

       style={({ pressed }) => [styles.authModalButton, styles.authModalSecondaryButton, pressed && styles.authModalButtonPressed]}

      >

       <Text style={[styles.authModalButtonText, styles.authModalSecondaryButtonText]}>Voglio dare un'occhiata</Text>

      </Pressable>

     </View>

    </View>

   </View>

  </Modal>

 );

}

function BauBookShell() {

 const { status, isSignedIn, isDemoMode } = useAuthAccount();

 const insets = useSafeAreaInsets();
 const tabBarBottomOffset = Platform.OS === 'web' ? spacing.md : Math.max(insets.bottom, spacing.sm);
 const contentBottomPadding = 108 + tabBarBottomOffset;

 const [activeTab, setActiveTab] = useState<TabKey>('home');
 const [welcomeBoardStatus, setWelcomeBoardStatus] = useState<WelcomeBoardStatus>('checking');

 const registrationLocked = status === 'signed_out' && !isSignedIn && !isDemoMode;

 useEffect(() => {

  if (isSignedIn || isDemoMode) {

   setWelcomeBoardStatus('done');

   return;

  }

  if (status !== 'signed_out') {

   return;

  }

  let active = true;

  AsyncStorage.getItem(WELCOME_BOARD_STORAGE_KEY)
   .then((value) => {
    if (active) {
     setWelcomeBoardStatus(value === 'true' ? 'done' : 'show');
    }
   })
   .catch(() => {
    if (active) {
     setWelcomeBoardStatus('show');
    }
   });

  return () => {
   active = false;
  };

 }, [isDemoMode, isSignedIn, status]);

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

 const handleWelcomeBoardDone = useCallback(() => {

  setWelcomeBoardStatus('done');
  void AsyncStorage.setItem(WELCOME_BOARD_STORAGE_KEY, 'true').catch(() => undefined);

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
 <WelcomeBoard visible={registrationLocked && welcomeBoardStatus === 'show'} onDone={handleWelcomeBoardDone} />
 <StartupAuthPrompt onRegister={handleRegister} onDemo={handleDemo} enabled={welcomeBoardStatus === 'done'} />

 <View style={styles.appRoot}>
 <View style={styles.deviceShell}>

 <View style={[styles.content, { paddingBottom: contentBottomPadding }]}>{screen}</View>

 <View style={[styles.tabBar, { bottom: tabBarBottomOffset }]}>

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

 welcomeBackdrop: {

 flex: 1,

 alignItems: 'center',

 justifyContent: 'center',

 padding: spacing.lg,

 backgroundColor: 'rgba(39, 28, 16, 0.32)',

 },

 welcomeCard: {

 width: '100%',

 maxWidth: 430,

 borderRadius: 32,

 borderWidth: 1,

 borderColor: colors.navBorder,

 backgroundColor: colors.navSurface,

 padding: spacing.lg,

 gap: spacing.md,

 ...shadows.card,

 },

 welcomeTopRow: {

 flexDirection: 'row',

 alignItems: 'center',

 justifyContent: 'space-between',

 },

 welcomeStepText: {

 color: colors.muted,

 fontSize: 12,

 fontWeight: '900',

 },

 welcomeSkipButton: {

 minHeight: 36,

 borderRadius: 18,

 paddingHorizontal: spacing.md,

 alignItems: 'center',

 justifyContent: 'center',

 backgroundColor: colors.surface,

 borderWidth: 1,

 borderColor: colors.border,

 },

 welcomeSkipText: {

 color: colors.primaryDark,

 fontSize: 13,

 fontWeight: '900',

 },

 welcomeHero: {

 aspectRatio: 16 / 9,

 borderRadius: 28,

 alignItems: 'center',

 justifyContent: 'center',

 borderWidth: 1,

 borderColor: colors.border,

 overflow: 'hidden',

 },

 welcomeHeroTeal: {

 backgroundColor: colors.tealSoft,

 },

 welcomeHeroOrange: {

 backgroundColor: colors.orangeSoft,

 },

 welcomeHeroPink: {

 backgroundColor: colors.pinkSoft,

 },

 welcomeHeroImage: {

 width: '100%',

 height: '100%',

 resizeMode: 'cover',

 },

 welcomeCopy: {

 gap: spacing.xs,

 },

 welcomeEyebrow: {

 color: colors.primaryDark,

 fontSize: 12,

 fontWeight: '900',

 letterSpacing: 0.8,

 textTransform: 'uppercase',

 },

 welcomeTitle: {

 color: colors.ink,

 fontSize: 25,

 lineHeight: 30,

 fontWeight: '900',

 },

 welcomeText: {

 color: colors.muted,

 fontSize: 15,

 lineHeight: 22,

 fontWeight: '700',

 },

 welcomeDotsRow: {

 flexDirection: 'row',

 justifyContent: 'center',

 alignItems: 'center',

 gap: spacing.xs,

 },

 welcomeDot: {

 width: 8,

 height: 8,

 borderRadius: 4,

 backgroundColor: colors.border,

 },

 welcomeDotActive: {

 width: 24,

 backgroundColor: colors.primary,

 },

 welcomePrimaryButton: {

 minHeight: 52,

 borderRadius: 26,

 alignItems: 'center',

 justifyContent: 'center',

 backgroundColor: colors.primary,

 paddingHorizontal: spacing.lg,

 },

 welcomePrimaryButtonText: {

 color: colors.navSurface,

 fontSize: 16,

 fontWeight: '900',

 },

 welcomeButtonPressed: {

 opacity: 0.86,

 transform: [{ scale: 0.98 }],

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
