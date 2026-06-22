import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { baubookImages } from '../../shared/assets/images';
import { requestAccountDeletion, fetchPendingAccountDeletionRequest } from '../../shared/api/launchReadiness';
import { useAuthAccount } from '../../shared/auth/AuthProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { hasSupabaseConfig } from '../../shared/lib/env';
import { getSupabaseClient } from '../../shared/lib/supabase';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';

const APP_VERSION = '0.7.0';

function readableError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Qualcosa non ha funzionato. Riprova tra poco.';
}

export function ProfileScreen() {
  const auth = useAuthAccount();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionMessage, setDeletionMessage] = useState('');
  const [deletionError, setDeletionError] = useState('');
  const [deletionPendingRequest, setDeletionPendingRequest] = useState<{ id: string; status: string; requestedAt: string } | null>(null);

  useEffect(() => {
    setDisplayName(auth.profile?.displayName ?? '');
  }, [auth.profile?.displayName]);

  useEffect(() => {
    const profileName = auth.profile?.displayName?.trim() ?? '';
    if (profileName && !feedbackName.trim()) {
      setFeedbackName(profileName);
    }
  }, [auth.profile?.displayName, feedbackName]);

  useEffect(() => {
    const accountEmail = auth.user?.email?.trim() ?? '';
    if (accountEmail && !feedbackEmail.trim()) {
      setFeedbackEmail(accountEmail);
    }
  }, [auth.user?.email, feedbackEmail]);

  useEffect(() => {
    let active = true;

    if (!auth.isSignedIn || !auth.user?.id) {
      setDeletionPendingRequest(null);
      return () => {
        active = false;
      };
    }

    fetchPendingAccountDeletionRequest(auth.user.id)
      .then((request) => {
        if (active) {
          setDeletionPendingRequest(request);
        }
      })
      .catch(() => {
        if (active) {
          setDeletionPendingRequest(null);
        }
      });

    return () => {
      active = false;
    };
  }, [auth.isSignedIn, auth.user?.id]);

  const deletionRequestPending = Boolean(deletionPendingRequest);

  const handleFeedbackSubmit = async () => {
    setFeedbackSuccess('');
    setFeedbackError('');

    const message = feedbackMessage.trim();
    if (!message) {
      setFeedbackError('Scrivi un messaggio prima di inviare il feedback.');
      return;
    }

    const client = getSupabaseClient();
    if (!hasSupabaseConfig || !client) {
      setFeedbackError('Connessione non disponibile: riprova quando BauBook è online.');
      return;
    }

    setIsSendingFeedback(true);
    try {
      const { error } = await client.functions.invoke('contact-request', {
        body: {
          request_type: 'feedback',
          name: feedbackName.trim() || auth.profile?.displayName || null,
          contact_email: feedbackEmail.trim() || auth.user?.email || null,
          message,
          source: 'setup-beta-feedback',
          app_version: APP_VERSION,
        },
      });

      if (error) {
        throw error;
      }

      setFeedbackSuccess('Feedback inviato, grazie! Lo useremo per migliorare BauBook.');
      setFeedbackMessage('');
      setFeedbackExpanded(false);
    } catch (error) {
      setFeedbackError(readableError(error));
    } finally {
      setIsSendingFeedback(false);
    }
  };

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
      setDeletionMessage('Richiesta ricevuta. Ti aggiorneremo appena sarà stata presa in carico.');
      setDeletionPendingRequest(result);
      setDeletionReason('');
    } catch (error) {
      setDeletionError(readableError(error));
    }
  };

  return (
    <Screen>
      <AppCard tone="warm">
        <View style={styles.headerRow}>
          <IconBubble source={baubookImages.icons.messages} tone="teal" />
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Beta BauBook</Text>
            <Text style={styles.cardTitle}>Invia feedback beta!</Text>
          </View>
        </View>
        <Text style={styles.bodyText}>Raccontaci cosa funziona, cosa non è chiaro o cosa ti piacerebbe trovare in BauBook.</Text>

        <View style={styles.feedbackToggleRow}>
          <AppButton
            label={feedbackExpanded ? "Chiudi modulo feedback" : "Apri modulo feedback"}
            variant={feedbackExpanded ? "ghost" : "secondary"}
            onPress={() => setFeedbackExpanded((value) => !value)}
          />
        </View>

        {feedbackExpanded ? (
        <View style={styles.formStack}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              value={feedbackName}
              onChangeText={setFeedbackName}
              placeholder="Il tuo nome"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email per eventuale risposta</Text>
            <TextInput
              value={feedbackEmail}
              onChangeText={setFeedbackEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="nome@email.it"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Messaggio</Text>
            <TextInput
              value={feedbackMessage}
              onChangeText={setFeedbackMessage}
              placeholder="Scrivi qui il tuo feedback..."
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.feedbackTextArea]}
              multiline
            />
          </View>
          <View style={styles.feedbackSubmitRow}>
            <AppButton label="Invia feedback" disabled={isSendingFeedback} onPress={() => void handleFeedbackSubmit()} />
          </View>
        </View>
        ) : null}
        {feedbackSuccess ? <Text style={styles.successBox}>{feedbackSuccess}</Text> : null}
        {feedbackError ? <Text style={styles.errorBox}>{feedbackError}</Text> : null}
      </AppCard>

      <AppCard>
        <View style={styles.headerRow}>
          <IconBubble source={baubookImages.icons.settings} tone="teal" />
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Account BauBook</Text>
            <Text style={styles.cardTitle}>{auth.isSignedIn ? 'Il tuo account' : 'Accedi a BauBook'}</Text>
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
            <AppButton label="Invia link di accesso" disabled={auth.isBusy} onPress={() => void auth.sendLoginEmail(email)} />
            <View style={styles.formGroup}>
              <Text style={styles.label}>Codice ricevuto via email</Text>
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
            <AppButton label="Entra con codice" variant="secondary" disabled={auth.isBusy} onPress={() => void auth.verifyOtpCode(email, otp)} />
            <Text style={styles.helperText}>Per ora l'accesso avviene via email. Se non trovi il messaggio, controlla anche spam o posta indesiderata.</Text>
          </View>
        ) : (
          <View style={styles.formStack}>
            <View style={styles.metricGrid}>
              <Metric label="Email" value={auth.user?.email ?? 'non disponibile'} />
              <Metric label="Nome visibile" value={auth.profile?.displayName || 'da completare'} />
              <Metric label="Pelosi salvati" value={String(auth.dogs.length)} />
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
          eyebrow="Privacy e condizioni"
          title="Come usiamo i dati"
        />
        <View style={styles.legalStack}>
          <LegalBlock title="Dati in app" body="Usiamo email, profilo utente, profilo 🐾, contenuti e presenze temporanee solo per far funzionare la community locale." />
          <LegalBlock title="Localizzazione" body="La posizione viene usata solo quando scegli funzioni di prossimità, come passeggiate, presenze, mappa o segnalazioni." />
          <LegalBlock title="Cancellazione account" body="Puoi richiedere la cancellazione account direttamente dall'app. La richiesta resta tracciata per poterla gestire correttamente." />
        </View>
      </AppCard>

      <AppCard>
        <SectionHeader eyebrow="Gestione account" title="Gestione account" />
        <Text style={styles.deletionTitle}>Richiesta cancellazione account</Text>
        <View style={styles.formStack}>
          <TextInput
            value={deletionReason}
            onChangeText={setDeletionReason}
            placeholder={deletionRequestPending ? "Richiesta già inviata" : "Motivo facoltativo"}
            placeholderTextColor={colors.muted}
            editable={!deletionRequestPending}
            style={[styles.input, styles.textArea, deletionRequestPending ? styles.inputDisabled : null]}
            multiline
          />
          <AppButton
            label={deletionRequestPending ? 'Richiesta già inviata' : 'Richiedi cancellazione account'}
            variant="danger"
            disabled={!auth.isSignedIn || auth.isBusy || deletionRequestPending}
            onPress={() => void handleDeletionRequest()}
          />
          {!auth.isSignedIn ? <Text style={styles.helperText}>Effettua il login per inviare una richiesta.</Text> : null}
          {deletionRequestPending ? <Text style={styles.helperText}>La richiesta è in attesa di gestione.</Text> : null}
          {deletionMessage ? <Text style={styles.successBox}>{deletionMessage}</Text> : null}
          {deletionError ? <Text style={styles.errorBox}>{deletionError}</Text> : null}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  feedbackToggleRow: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  feedbackSubmitRow: {
    alignItems: 'center',
    marginTop: spacing.xs,
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
  inputDisabled: {
    backgroundColor: colors.surface,
    color: colors.muted,
    opacity: 0.6,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  feedbackTextArea: {
    minHeight: 110,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricGrid: {
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
  deletionTitle: {
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: '900',
    marginTop: spacing.md,
  },
  legalTitle: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
});
