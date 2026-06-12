import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { baubookImages } from '../../shared/assets/images';
import { requestAccountDeletion, fetchActiveSponsoredSlots, type SponsoredSlotModel } from '../../shared/api/launchReadiness';
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

const launchChecklist = [
  'Privacy e termini beta visibili in app.',
  'Cancellazione account richiedibile dall\'utente loggato.',
  'Email OTP/magic link come Auth primaria, senza obbligo Google/Apple nella beta.',
  'Sponsored Places Lite nativo: nessun SDK ads, nessun advertising ID, disclosure visibile.',
  'Safety e segnalazioni con disclaimer, report abuso e rate limit DB.',
];

function scoreItem(done: boolean) {
  return done ? 20 : 0;
}

export function ProfileScreen() {
  const diagnostics = getRuntimeDiagnostics();
  const supabaseSummary = getSupabaseConfigSummary();
  const supabaseStatus = useSupabasePublicStatus();
  const liveStatus = supabaseStatus.data;
  const auth = useAuthAccount();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionMessage, setDeletionMessage] = useState('');
  const [deletionError, setDeletionError] = useState('');
  const [sponsoredSlots, setSponsoredSlots] = useState<SponsoredSlotModel[]>([]);

  useEffect(() => {
    setDisplayName(auth.profile?.displayName ?? '');
  }, [auth.profile?.displayName]);

  useEffect(() => {
    let active = true;
    fetchActiveSponsoredSlots('setup')
      .then((slots) => {
        if (active) {
          setSponsoredSlots(slots);
        }
      })
      .catch(() => {
        if (active) {
          setSponsoredSlots([]);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const launchScore = useMemo(() => {
    return (
      scoreItem(hasSupabaseConfig) +
      scoreItem(Boolean(liveStatus?.connected)) +
      scoreItem(auth.isSignedIn) +
      scoreItem(Boolean(auth.profile)) +
      scoreItem(auth.dogs.length > 0)
    );
  }, [auth.dogs.length, auth.isSignedIn, auth.profile, liveStatus?.connected]);

  const readinessTone = launchScore >= 80 ? 'green' : launchScore >= 40 ? 'orange' : 'red';
  const primarySponsoredSlot = sponsoredSlots[0];

  const handleDeletionRequest = async () => {
    setDeletionMessage('');
    setDeletionError('');
    try {
      const result = await requestAccountDeletion({
        userId: auth.user?.id ?? '',
        profileId: auth.profile?.id ?? null,
        email: auth.user?.email ?? null,
        reason: deletionReason,
      });
      setDeletionMessage(`Richiesta cancellazione registrata: ${result.status}.`);
      setDeletionReason('');
    } catch (error) {
      setDeletionError(error instanceof Error ? error.message : JSON.stringify(error));
    }
  };

  return (
    <Screen>


      <AppCard>
        <View style={styles.headerRow}>
          <IconBubble source={baubookImages.icons.settings} tone="teal" />
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Account BauBook</Text>
            <Text style={styles.cardTitle}>{auth.isSignedIn ? 'Sessione attiva' : 'Email OTP / magic link'}</Text>
          </View>
        </View>
        <Text style={styles.bodyText}>{auth.message}</Text>
        {auth.errorMessage ? <Text style={styles.errorBox}>{auth.errorMessage}</Text> : null}

        {!auth.isSignedIn ? (
          <View style={styles.formStack}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="bau@bau.it"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>
            <AppButton label="Invia link magico / OTP" disabled={auth.isBusy} onPress={() => void auth.sendLoginEmail(email)} />
            <View style={styles.formGroup}>
              <Text style={styles.label}>Codice OTP, se presente nella email</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                autoCapitalize="none"
                keyboardType="number-pad"
                placeholder="123456"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>
            <AppButton label="Verifica codice OTP" variant="secondary" disabled={auth.isBusy} onPress={() => void auth.verifyOtpCode(email, otp)} />
            <Text style={styles.helperText}>Per la beta pubblica la registrazione avviene tramite email. Accesso Google/Apple account in progress. ⏳</Text>
          </View>
        ) : (
          <View style={styles.formStack}>
            <View style={styles.metricGrid}>
              <Metric label="Email" value={auth.user?.email ?? 'non disponibile'} />
              <Metric label="Profile ID" value={auth.profile?.id ?? 'profilo in creazione'} />
              <Metric label="Cani salvati" value={String(auth.dogs.length)} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome profilo visibile</Text>
              <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Nome" placeholderTextColor={colors.muted} style={styles.input} />
            </View>
            <View style={styles.actionsRow}>
              <AppButton label="Salva profilo" disabled={auth.isBusy} onPress={() => void auth.saveProfile(displayName)} />
              <AppButton label="Logout" variant="ghost" disabled={auth.isBusy} onPress={() => void auth.signOut()} />
            </View>
          </View>
        )}
      </AppCard>



      <AppCard tone="pink">
        <SectionHeader
          eyebrow="Privacy & Terms"
          title="Trasparenza e condizioni"
        />
        <View style={styles.legalStack}>
          <LegalBlock title="Privacy e dati in-app" body="Raccogliamo email, profilo, profilo cane, contenuti e presenza temporanea solo per far funzionare la community locale." />
          <LegalBlock title="Localizzazione" body="La posizione e' usata solo quando l'utente chiede funzioni di prossimità. BauBook non abilita live tracking continuo di default." />
          <LegalBlock title="Cancellazione account" body="L'utente loggato puo richiedere cancellazione account dall'app. La richiesta resta tracciata per gestione operativa e audit." />
        </View>
      </AppCard>

      <AppCard>
        <SectionHeader eyebrow="Cancellazione account" title="Richiesta cancellazione account" description="Flusso leggero, utile per beta e review store. Richiede login e migration 0008 applicata." />
        <View style={styles.formStack}>
          <TextInput
            value={deletionReason}
            onChangeText={setDeletionReason}
            placeholder="Motivo facoltativo"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.textArea]}
            multiline
          />
          <AppButton
            label="Richiedi cancellazione account"
            variant="danger"
            disabled={!auth.isSignedIn || auth.isBusy}
            onPress={() => void handleDeletionRequest()}
          />
          {!auth.isSignedIn ? <Text style={styles.helperText}>Effettua il login per inviare una richiesta reale.</Text> : null}
          {deletionMessage ? <Text style={styles.successBox}>{deletionMessage}</Text> : null}
          {deletionError ? <Text style={styles.errorBox}>{deletionError}</Text> : null}
        </View>
      </AppCard>


      <AppCard>
        <SectionHeader eyebrow="Supabase live check" title="Backend" description={supabaseStatus.status === 'loading' ? 'Controllo app_config, feature_flags, places, passeggiate, presenze e safety...' : liveStatus?.message ?? supabaseStatus.errorMessage ?? 'In attesa di verifica Supabase.'} />
        <View style={styles.metricGrid}>
          <Metric label="Supabase URL" value={supabaseSummary.url || 'non configurato'} />
          <Metric label="Client key" value={supabaseSummary.keyPrefix || 'non configurata'} />
          <Metric label="Ultimo check" value={liveStatus?.lastCheckedAt ?? 'non ancora eseguito'} />
        </View>
      </AppCard>

      <AppCard>
        <SectionHeader eyebrow="Debug parlante" title="Runtime" description="Dati utili per capire subito piattaforma, Metro, errori e build." />
        <View style={styles.diagnosticsList}>
          {diagnostics.map((item) => (
            <Metric key={item.label} label={item.label} value={item.value} />
          ))}
        </View>
      </AppCard>


    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.diagnosticRow}>
      <Text style={styles.diagnosticLabel}>{label}</Text>
      <Text style={styles.diagnosticValue}>{value}</Text>
    </View>
  );
}

function LegalBlock({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.legalBlock}>
      <Text style={styles.legalTitle}>{title}</Text>
      <Text style={styles.helperText}>{body}</Text>
    </View>
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
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  helperText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '700',
  },
  errorBox: {
    marginTop: spacing.sm,
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
  successBox: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.greenSoft,
    color: colors.text,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricGrid: {
    gap: spacing.xs,
    marginTop: spacing.lg,
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
  progressTrack: {
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  checkList: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  checkItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  checkBullet: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  checkText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 21,
    fontWeight: '700',
  },
  legalStack: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  legalBlock: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  legalTitle: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  sponsorBox: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  sponsorLabel: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sponsorName: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  sponsorTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
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
});
