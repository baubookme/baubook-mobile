import type { PropsWithChildren, ReactNode } from 'react';
import { Component } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../shared/theme/theme';

interface AppErrorBoundaryState {
  errorMessage: string | null;
  errorStack: string | null;
  componentStack: string | null;
}

function formatUnknownError(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    return {
      message: `${error.name}: ${error.message}`,
      stack: error.stack ?? null,
    };
  }

  return {
    message: String(error),
    stack: null,
  };
}

export class AppErrorBoundary extends Component<PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    errorMessage: null,
    errorStack: null,
    componentStack: null,
  };

  static getDerivedStateFromError(error: unknown): Partial<AppErrorBoundaryState> {
    const formatted = formatUnknownError(error);
    return {
      errorMessage: formatted.message,
      errorStack: formatted.stack,
    };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    const formatted = formatUnknownError(error);
    const componentStack = info.componentStack ?? null;

    globalThis.__BAUBOOK_LAST_RUNTIME_ERROR__ = [formatted.message, formatted.stack, componentStack]
      .filter(Boolean)
      .join('\n\n');

    console.error('[BauBook render error]', formatted.message, formatted.stack, componentStack);

    this.setState({
      errorMessage: formatted.message,
      errorStack: formatted.stack,
      componentStack,
    });
  }

  reset = () => {
    this.setState({ errorMessage: null, errorStack: null, componentStack: null });
  };

  render(): ReactNode {
    if (this.state.errorMessage) {
      return (
        <View style={styles.wrapper}>
          <ScrollView contentContainerStyle={styles.card}>
            <Text style={styles.eyebrow}>BauBook debug</Text>
            <Text style={styles.title}>L'app si è fermata, ma ora l'errore è leggibile.</Text>
            <Text style={styles.body}>
              Copia il testo qui sotto o mandami uno screenshot. Se il testo non basta, nel terminale Metro vedrai lo stesso errore
              con prefisso [BauBook render error].
            </Text>

            <View style={styles.errorBox}>
              <Text selectable style={styles.errorTitle}>{this.state.errorMessage}</Text>
              {this.state.errorStack ? <Text selectable style={styles.errorText}>{this.state.errorStack}</Text> : null}
              {this.state.componentStack ? <Text selectable style={styles.errorText}>{this.state.componentStack}</Text> : null}
            </View>

            <Pressable onPress={this.reset} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
              <Text style={styles.buttonText}>Riprova render</Text>
            </Pressable>

            <Text style={styles.hint}>
              Comandi utili: npm run typecheck · npm run export:web · .\\baubook.ps1 -Mode web · .\\baubook.ps1 -Mode android-build
            </Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  card: {
    marginTop: spacing.xxl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: typography.h2,
    lineHeight: 27,
    fontWeight: '900',
  },
  body: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  errorBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.redSoft,
    backgroundColor: '#FFF4F2',
    padding: spacing.md,
    gap: spacing.sm,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: typography.body,
    lineHeight: 21,
    fontWeight: '900',
  },
  errorText: {
    color: colors.text,
    fontSize: typography.tiny,
    lineHeight: 16,
    fontWeight: '700',
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: '900',
  },
  hint: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '700',
  },
});
