import { Image, StyleSheet, Text, View } from 'react-native';

import { baubookImages } from '../../shared/assets/images';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { Tag } from '../../shared/components/Tag';
import { hasGoogleMapsConfig, hasSupabaseConfig } from '../../shared/lib/env';
import { getRuntimeDiagnostics } from '../../shared/lib/runtimeDiagnostics';
import { colors, spacing, typography } from '../../shared/theme/theme';

const setupSteps = [
  'Browser: .\\baubook.ps1 -Mode web',
  'Android: .\\baubook.ps1 -Mode android-build',
  'Dopo la build: .\\baubook.ps1 -Mode android-dev',
  'Git: inizializza repository e primo commit pulito.',
  'Supabase: crea progetto e lancia 0001_initial_schema.sql.',
];

export function ProfileScreen() {
  const diagnostics = getRuntimeDiagnostics();

  return (
    <Screen>
      <SectionHeader
        eyebrow="Setup sviluppatore"
        title="BauBook! è pronto per essere collegato ai servizi"
        description="Questa pagina e' una checklist tecnica interna. Da ora il flusso stabile e': browser per UI, Development Build per Android."
      />

      <AppCard tone="warm">
        <View style={styles.identityHeader}>
          <Image source={baubookImages.appIcon} style={styles.appIcon} />
          <View style={styles.identityCopy}>
            <Text style={styles.eyebrow}>BauBook! Venezia-Mestre</Text>
            <Text style={styles.cardTitle}>MVP locale</Text>
            <Text style={styles.bodyText}>Dominio: baubook.me · handle: @baubook_me</Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <Tag label={hasSupabaseConfig ? 'Supabase configurato' : 'Supabase non configurato'} tone={hasSupabaseConfig ? 'green' : 'orange'} />
          <Tag label={hasGoogleMapsConfig ? 'Maps configurato' : 'Maps non configurato'} tone={hasGoogleMapsConfig ? 'green' : 'orange'} />
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.headerRow}>
          <IconBubble source={baubookImages.icons.phoneVerify} size={58} tone="teal" />
          <View style={styles.headerCopy}>
            <Text style={styles.cardTitle}>Verifica account</Text>
            <Text style={styles.bodyText}>Email/OTP per tutti. Telefono obbligatorio solo per funzioni ad alto rischio, come alert smarrimento.</Text>
          </View>
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.headerRow}>
          <IconBubble source={baubookImages.icons.privacy} size={58} tone="pink" />
          <View style={styles.headerCopy}>
            <Text style={styles.cardTitle}>Privacy by default</Text>
            <Text style={styles.bodyText}>Niente home address, niente live location predefinita, visibilità contenuti esplicita e blocco utente sempre disponibile.</Text>
          </View>
        </View>
      </AppCard>



      <AppCard tone="pink">
        <View style={styles.headerRow}>
          <IconBubble source={baubookImages.icons.settings} size={58} tone="plain" />
          <View style={styles.headerCopy}>
            <Text style={styles.cardTitle}>Debug parlante</Text>
            <Text style={styles.bodyText}>Questi dati aiutano a capire subito runtime, piattaforma, host Metro e ultimo errore intercettato.</Text>
          </View>
        </View>
        <View style={styles.diagnosticsList}>
          {diagnostics.map((item) => (
            <View key={item.label} style={styles.diagnosticRow}>
              <Text style={styles.diagnosticLabel}>{item.label}</Text>
              <Text selectable style={styles.diagnosticValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard tone="teal">
        <Text style={styles.cardTitle}>Prossimi comandi</Text>
        <View style={styles.stepsList}>
          {setupSteps.map((step, index) => (
            <View key={step} style={styles.stepItem}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
        <View style={styles.buttonWrap}>
          <AppButton label="Apri docs/RUN_WEB_ANDROID.md" variant="ghost" icon={baubookImages.icons.settings} />
        </View>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  appIcon: {
    width: 78,
    height: 78,
    resizeMode: 'contain',
  },
  identityCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  bodyText: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  diagnosticsList: {
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  diagnosticRow: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  diagnosticLabel: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  diagnosticValue: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '700',
  },
  stepsList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  stepItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: colors.primary,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '700',
  },
  buttonWrap: {
    marginTop: spacing.lg,
  },
});
