import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { baubookImages } from '../../shared/assets/images';
import { useAuthAccount } from '../../shared/auth/AuthProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { Tag } from '../../shared/components/Tag';
import { hasGoogleMapsConfig, hasSupabaseConfig } from '../../shared/lib/env';
import { getSupabaseConfigSummary } from '../../shared/lib/supabase';
import { useSupabasePublicStatus } from '../../shared/hooks/useSupabasePublicData';
import { getRuntimeDiagnostics } from '../../shared/lib/runtimeDiagnostics';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';

const setupSteps = [
  'Web: .\\baubook.ps1 -Mode web',
  'Android build: .\\baubook.ps1 -Mode android-build -CleanPrebuild quando cambiano asset/librerie native.',
  'Android dev: .\\baubook.ps1 -Mode android-dev per sviluppo quotidiano.',
  'Supabase: esegui le migration nuove dal SQL Editor prima di testare feature DB.',
  'Git: commit piccolo dopo ogni baseline funzionante.',
];

export function ProfileScreen() {
  const diagnostics = getRuntimeDiagnostics();
  const supabaseSummary = getSupabaseConfigSummary();
  const supabaseStatus = useSupabasePublicStatus();
  const liveStatus = supabaseStatus.data;
  const auth = useAuthAccount();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    setDisplayName(auth.profile?.displayName ?? '');
  }, [auth.profile?.displayName]);

  return (
    <Screen>
      <SectionHeader
        eyebrow="Setup sviluppatore"
        title="BauBook! ora parla con Supabase"
        description="Questa pagina tiene insieme diagnostica, login email e profilo umano. Il flusso resta prudente: niente dati sensibili, sessione persistente, errori leggibili."
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
          <Tag label={auth.isSignedIn ? 'Sessione attiva' : 'Non loggato'} tone={auth.isSignedIn ? 'green' : 'orange'} />
        </View>
      </AppCard>

      <AppCard tone={auth.isSignedIn ? 'teal' : 'warm'}>
        <View style={styles.headerRow}>
          <IconBubble source={baubookImages.icons.phoneVerify} size={58} tone="teal" />
          <View style={styles.headerCopy}>
            <Text style={styles.cardTitle}>Account BauBook</Text>
            <Text style={styles.bodyText}>{auth.message}</Text>
          </View>
        </View>

        {auth.errorMessage ? <Text selectable style={styles.errorBox}>{auth.errorMessage}</Text> : null}

        {!auth.isSignedIn ? (
          <View style={styles.formStack}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="nome@esempio.it"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
              />
            </View>
            <View style={styles.actionsColumn}>
              <AppButton
                label={auth.isBusy ? 'Invio in corso...' : 'Invia magic link / OTP'}
                icon={baubookImages.icons.notifications}
                disabled={auth.isBusy || !auth.isConfigured}
                onPress={() => void auth.sendLoginEmail(email)}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Codice OTP, se presente nella email</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="123456"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
            <AppButton
              label={auth.isBusy ? 'Verifica...' : 'Verifica codice OTP'}
              variant="secondary"
              icon={baubookImages.icons.phoneVerify}
              disabled={auth.isBusy || !auth.isConfigured}
              onPress={() => void auth.verifyOtpCode(email, otp)}
            />
            <Text style={styles.helperText}>
              Per il test più semplice usa il codice OTP se Supabase lo mostra nella mail. Il link magico richiede anche i Redirect URL in Supabase Auth.
            </Text>
          </View>
        ) : (
          <View style={styles.formStack}>
            <View style={styles.diagnosticsList}>
              <View style={styles.diagnosticRow}>
                <Text style={styles.diagnosticLabel}>Email</Text>
                <Text selectable style={styles.diagnosticValue}>{auth.user?.email ?? 'non disponibile'}</Text>
              </View>
              <View style={styles.diagnosticRow}>
                <Text style={styles.diagnosticLabel}>Profile ID</Text>
                <Text selectable style={styles.diagnosticValue}>{auth.profile?.id ?? 'profilo in creazione'}</Text>
              </View>
              <View style={styles.diagnosticRow}>
                <Text style={styles.diagnosticLabel}>Cani salvati</Text>
                <Text selectable style={styles.diagnosticValue}>{auth.dogs.length}</Text>
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome umano visibile</Text>
              <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Eris e branco BauBook" style={styles.input} />
            </View>
            <View style={styles.actionsRow}>
              <AppButton
                label={auth.isBusy ? 'Salvo...' : 'Salva profilo'}
                icon={baubookImages.icons.settings}
                disabled={auth.isBusy}
                onPress={() => void auth.saveProfile(displayName)}
              />
              <AppButton label="Logout" variant="ghost" icon={baubookImages.icons.privacy} disabled={auth.isBusy} onPress={() => void auth.signOut()} />
            </View>
          </View>
        )}
      </AppCard>

      <AppCard tone={liveStatus?.connected ? 'teal' : 'warm'}>
        <View style={styles.headerRow}>
          <IconBubble source={baubookImages.icons.dogArea} size={58} tone="plain" />
          <View style={styles.headerCopy}>
            <Text style={styles.cardTitle}>Supabase live check</Text>
            <Text style={styles.bodyText}>
              {supabaseStatus.status === 'loading'
                ? 'Controllo app_config, feature_flags, places, passeggiate e presenze...'
                : liveStatus?.message ?? supabaseStatus.errorMessage ?? 'In attesa di verifica Supabase.'}
            </Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <Tag label={liveStatus?.connected ? 'DB raggiungibile' : hasSupabaseConfig ? 'DB da verificare' : 'DB non configurato'} tone={liveStatus?.connected ? 'green' : 'orange'} />
          <Tag label={`config ${liveStatus?.appConfigCount ?? 0}`} tone="teal" />
          <Tag label={`flag ${liveStatus?.featureFlagsCount ?? 0}`} tone="pink" />
          <Tag label={`luoghi ${liveStatus?.placesCount ?? 0}`} tone="green" />
          <Tag label={`walk ${liveStatus?.walkPlansCount ?? 0}`} tone="orange" />
          <Tag label={`presenze ${liveStatus?.presencesCount ?? 0}`} tone="teal" />
        </View>
        <View style={styles.diagnosticsList}>
          <View style={styles.diagnosticRow}>
            <Text style={styles.diagnosticLabel}>Supabase URL</Text>
            <Text selectable style={styles.diagnosticValue}>{supabaseSummary.url || 'non configurato'}</Text>
          </View>
          <View style={styles.diagnosticRow}>
            <Text style={styles.diagnosticLabel}>Client key</Text>
            <Text selectable style={styles.diagnosticValue}>{supabaseSummary.keyPrefix || 'non configurata'}</Text>
          </View>
          <View style={styles.diagnosticRow}>
            <Text style={styles.diagnosticLabel}>Ultimo check</Text>
            <Text selectable style={styles.diagnosticValue}>{liveStatus?.lastCheckedAt ?? 'non ancora eseguito'}</Text>
          </View>
        </View>
        <View style={styles.buttonWrap}>
          <AppButton label="Riprova check Supabase" variant="ghost" icon={baubookImages.icons.settings} onPress={supabaseStatus.reload} />
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.headerRow}>
          <IconBubble source={baubookImages.icons.privacy} size={58} tone="pink" />
          <View style={styles.headerCopy}>
            <Text style={styles.cardTitle}>Privacy by default</Text>
            <Text style={styles.bodyText}>Email/OTP per tutti. Telefono solo per funzioni ad alto rischio. Niente home address, niente live location predefinita.</Text>
          </View>
        </View>
      </AppCard>

      <AppCard tone="pink">
        <View style={styles.headerRow}>
          <IconBubble source={baubookImages.icons.settings} size={58} tone="plain" />
          <View style={styles.headerCopy}>
            <Text style={styles.cardTitle}>Debug parlante</Text>
            <Text style={styles.bodyText}>Dati runtime utili per capire subito piattaforma, Metro, errori e build.</Text>
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
  formStack: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  formGroup: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.body,
  },
  helperText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '700',
  },
  errorBox: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.redSoft,
    color: colors.text,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '800',
  },
  actionsColumn: {
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
