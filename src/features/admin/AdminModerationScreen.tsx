import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  fetchAdminModerationReports,
  fetchAdminModerationStatus,
  updateAdminModerationReportStatus,
  type AdminModerationReport,
  type AdminModerationRole,
  type AdminReportStatus,
} from '../../shared/api/moderation';
import { baubookImages } from '../../shared/assets/images';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'data non disponibile';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'open':
      return 'Aperta';
    case 'reviewing':
      return 'In revisione';
    case 'resolved':
      return 'Risolta';
    case 'dismissed':
      return 'Ignorata';
    case 'actioned':
      return 'Gestita';
    default:
      return status || 'sconosciuto';
  }
}

function reasonLabel(reason: string | null | undefined): string {
  switch (reason) {
    case 'false_alert':
      return 'Falso alert';
    case 'abuse':
      return 'Abuso';
    case 'harassment':
      return 'Molestie';
    case 'privacy_violation':
      return 'Privacy';
    case 'spam':
      return 'Spam';
    case 'scam':
      return 'Truffa';
    case 'dangerous_content':
      return 'Contenuto pericoloso';
    case 'inappropriate':
      return 'Inappropriato';
    case 'other':
      return 'Altro';
    default:
      return reason || 'Motivo non indicato';
  }
}

function roleLabel(role: AdminModerationRole | null): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    case 'moderator':
      return 'Moderatore';
    default:
      return 'Admin';
  }
}

interface ReportCardProps {
  report: AdminModerationReport;
  busy: boolean;
  onAction: (reportId: string, status: AdminReportStatus) => void;
}

function ReportCard({ report, busy, onAction }: ReportCardProps) {
  const targetMeta = [
    report.targetStatus ? `stato ${report.targetStatus}` : null,
    report.targetModerationStatus ? `moderazione ${report.targetModerationStatus}` : null,
    report.targetLocationLabel,
  ].filter(Boolean).join(' · ');

  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeaderRow}>
        <View style={styles.reportHeaderCopy}>
          <Text style={styles.reportTitle}>{report.targetLabel}</Text>
          <Text style={styles.reportMeta}>{formatDateTime(report.createdAt)} · {statusLabel(report.status)}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{reasonLabel(report.reason)}</Text>
        </View>
      </View>

      <Text style={styles.reportText}>Segnalato da {report.reporterName}</Text>
      {targetMeta ? <Text style={styles.reportMeta}>{targetMeta}</Text> : null}
      {report.description ? <Text style={styles.reportText}>Nota abuso: {report.description}</Text> : null}
      {report.targetDescription ? <Text style={styles.targetText}>Contenuto: {report.targetDescription}</Text> : null}

      <View style={styles.reportActionsRow}>
        <AppButton
          label="Prendi in carico"
          size="compact"
          variant="secondary"
          disabled={busy || report.status === 'reviewing'}
          onPress={() => onAction(report.id, 'reviewing')}
        />
        <AppButton
          label="Risolvi"
          size="compact"
          disabled={busy}
          onPress={() => onAction(report.id, 'resolved')}
        />
        <AppButton
          label="Ignora"
          size="compact"
          variant="ghost"
          disabled={busy}
          onPress={() => onAction(report.id, 'dismissed')}
        />
      </View>
    </View>
  );
}

export function AdminModerationScreen() {
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<AdminModerationRole | null>(null);
  const [reports, setReports] = useState<AdminModerationReport[]>([]);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const loadReports = useCallback(async (nextIncludeClosed: boolean) => {
    setIsBusy(true);
    setErrorMessage('');
    try {
      const nextReports = await fetchAdminModerationReports(nextIncludeClosed);
      setReports(nextReports);
      setMessage(nextReports.length ? `${nextReports.length} segnalazioni caricate.` : 'Nessuna segnalazione da gestire.');
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Impossibile caricare la coda moderazione.';
      setErrorMessage(nextMessage);
    } finally {
      setIsBusy(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    setIsChecking(true);
    fetchAdminModerationStatus()
      .then((status) => {
        if (!active) {
          return;
        }
        setIsAdmin(status.isAdmin);
        setRole(status.role);
        if (status.isAdmin) {
          void loadReports(false);
        }
      })
      .catch(() => {
        if (active) {
          setIsAdmin(false);
          setRole(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadReports]);

  const handleToggleClosed = () => {
    const nextValue = !includeClosed;
    setIncludeClosed(nextValue);
    void loadReports(nextValue);
  };

  const handleAction = async (reportId: string, status: AdminReportStatus) => {
    setIsBusy(true);
    setErrorMessage('');
    setMessage('');
    try {
      await updateAdminModerationReportStatus(reportId, status, note);
      setNote('');
      setMessage(`Segnalazione ${statusLabel(status).toLowerCase()}.`);
      await loadReports(includeClosed);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Azione moderazione non riuscita.';
      setErrorMessage(nextMessage);
    } finally {
      setIsBusy(false);
    }
  };

  if (isChecking || !isAdmin) {
    return null;
  }

  return (
    <AppCard tone="teal">
      <View style={styles.headerRow}>
        <IconBubble source={baubookImages.icons.settings} tone="teal" />
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Admin BauBook</Text>
          <Text style={styles.cardTitle}>Moderazione</Text>
          <Text style={styles.bodyText}>Accesso: {roleLabel(role)}. Coda basata sulle segnalazioni abuso rilevate.</Text>
        </View>
      </View>

      <View style={styles.controlsRow}>
        <AppButton label="Aggiorna" size="compact" variant="secondary" disabled={isBusy} onPress={() => void loadReports(includeClosed)} />
        <AppButton
          label={includeClosed ? 'Solo aperte' : 'Anche chiuse'}
          size="compact"
          variant="ghost"
          disabled={isBusy}
          onPress={handleToggleClosed}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Nota admin facoltativa</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Es. verificato manualmente, falso positivo, contenuto gestito..."
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.textArea]}
          multiline
        />
      </View>

      {message ? <Text style={styles.successBox}>{message}</Text> : null}
      {errorMessage ? <Text style={styles.errorBox}>{errorMessage}</Text> : null}

      <View style={styles.reportsStack}>
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} busy={isBusy} onAction={handleAction} />
        ))}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerCopy: {
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
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  formGroup: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  label: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    backgroundColor: colors.surface,
    fontSize: typography.body,
  },
  textArea: {
    minHeight: 78,
    textAlignVertical: 'top',
  },
  successBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.greenSoft,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  errorBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.redSoft,
    color: colors.danger,
    fontWeight: '800',
  },
  reportsStack: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  reportCard: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  reportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  reportHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  reportTitle: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  reportMeta: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
  },
  reportText: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 19,
  },
  targetText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  statusPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.orangeSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  statusPillText: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
  },
  reportActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
