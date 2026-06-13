import type { PropsWithChildren, RefObject } from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  View,
} from "react-native";

import { colors, spacing } from "../theme/theme";

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
}

const androidStatusOffset =
    Platform.OS === "android" ? RNStatusBar.currentHeight ?? 0 : 0;

const topPadding = Platform.select({
  android: spacing.sm + androidStatusOffset,
  ios: spacing.md,
  web: spacing.xl,
  default: spacing.md,
});

export function Screen({ children, scroll = true, scrollRef }: ScreenProps) {
  return (
      <SafeAreaView style={styles.safeArea}>
        {scroll ? (
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
        ) : (
            <View style={styles.fixedContent}>{children}</View>
        )}
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: topPadding,
    paddingBottom: Platform.OS === "web" ? 130 : 112,
    gap: spacing.lg,
  },
  fixedContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: topPadding,
    paddingBottom: Platform.OS === "web" ? 130 : 112,
  },
});