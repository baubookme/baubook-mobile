import { useCallback, useEffect, useState } from 'react';

import {
  closeDangerReport,
  closeLostDogAlert,
  createDangerReport,
  createLostDogAlert,
  createLostDogSighting,
  fetchSafetyBoard,
  reportSafetyContent,
  type CreateDangerReportInput,
  type CreateLostDogAlertInput,
  type CreateSightingInput,
  type SafetyAlertModel,
  type SafetyBoardSource,
} from '../api/safety';

export type SafetyResourceStatus = 'idle' | 'loading' | 'success' | 'error';

interface SafetyBoardState {
  status: SafetyResourceStatus;
  source: SafetyBoardSource;
  alerts: SafetyAlertModel[];
  message: string;
  errorMessage?: string;
  actionMessage?: string;
}

function normalizeHookError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : JSON.stringify(error);
}

export function useSafetyBoard(currentProfileId?: string | null) {
  const [state, setState] = useState<SafetyBoardState>({
    status: 'idle',
    source: 'fallback',
    alerts: [],
    message: 'In attesa di caricamento safety.',
  });

  const reload = useCallback(() => {
    let active = true;
    setState((current) => ({ ...current, status: 'loading', errorMessage: undefined }));

    fetchSafetyBoard(currentProfileId)
      .then((result) => {
        if (!active) {
          return;
        }
        setState((current) => ({
          ...current,
          status: 'success',
          source: result.source,
          alerts: result.alerts,
          message: result.message,
          errorMessage: result.errorMessage,
        }));
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setState((current) => ({
          ...current,
          status: 'error',
          source: 'fallback',
          message: 'Errore caricamento safety.',
          errorMessage: normalizeHookError(error),
        }));
      });

    return () => {
      active = false;
    };
  }, [currentProfileId]);

  useEffect(() => reload(), [reload]);

  const createLostAlert = useCallback(async (input: CreateLostDogAlertInput) => {
    setState((current) => ({ ...current, status: 'loading', actionMessage: 'Creo alert smarrimento...' }));
    try {
      await createLostDogAlert(input);
      setState((current) => ({ ...current, actionMessage: 'Segnalazione creata con disclaimer registrato ✔️' }));
      reload();
    }
    catch (error) {
      setState((current) => ({ ...current, status: 'error', actionMessage: 'Creazione segnalazione non riuscita ❗', errorMessage: normalizeHookError(error) }));
    }
  }, [reload]);

  const createDanger = useCallback(async (input: CreateDangerReportInput) => {
    setState((current) => ({ ...current, status: 'loading', actionMessage: 'Creo segnalazione Pericolo...' }));
    try {
      await createDangerReport(input);
      setState((current) => ({ ...current, actionMessage: 'Segnalazione creata con disclaimer registrato ✔️' }));
      reload();
    }
    catch (error) {
      setState((current) => ({ ...current, status: 'error', actionMessage: 'Creazione segnalazione non riuscita ❗', errorMessage: normalizeHookError(error) }));
    }
  }, [reload]);

  const createSighting = useCallback(async (input: CreateSightingInput) => {
    setState((current) => ({ ...current, status: 'loading', actionMessage: 'Invio avvistamento...' }));
    try {
      await createLostDogSighting(input);
      setState((current) => ({ ...current, actionMessage: input.sightingType === 'recovered' ? 'Recupero registrato ✔️' : 'Avvistamento registrato.' }));
      reload();
    }
    catch (error) {
      setState((current) => ({ ...current, status: 'error', actionMessage: 'Avvistamento non riuscito ❗', errorMessage: normalizeHookError(error) }));
    }
  }, [reload]);

  const closeLostAlert = useCallback(async (alertId: string) => {
    setState((current) => ({ ...current, status: 'loading', actionMessage: 'Chiudo alert smarrimento...' }));
    try {
      await closeLostDogAlert(alertId);
      setState((current) => ({ ...current, actionMessage: 'Alert smarrimento dismesso ✔️' }));
      reload();
    }
    catch (error) {
      setState((current) => ({ ...current, status: 'error', actionMessage: 'Chiusura segnalazione non riuscita ❗', errorMessage: normalizeHookError(error) }));
    }
  }, [reload]);

  const closeDanger = useCallback(async (reportId: string) => {
    setState((current) => ({ ...current, status: 'loading', actionMessage: 'Dismettere segnalazione...' }));
    try {
      await closeDangerReport(reportId);
      setState((current) => ({ ...current, actionMessage: 'Segnalazione Pericolo dismessa ✔️' }));
      reload();
    }
    catch (error) {
      setState((current) => ({ ...current, status: 'error', actionMessage: 'Chiusura segnalazione non riuscita ❗', errorMessage: normalizeHookError(error) }));
    }
  }, [reload]);

  const reportContent = useCallback(async (targetType: 'lost_dog_alert' | 'danger_report', targetId: string) => {
    setState((current) => ({ ...current, status: 'loading', actionMessage: 'Invio report abuso...' }));
    try {
      const result = await reportSafetyContent(targetType, targetId);
      setState((current) => ({
        ...current,
        status: 'success',
        alerts: current.alerts.map((alert) =>
          alert.id === targetId ? { ...alert, hasMyAbuseReport: true } : alert,
        ),
        actionMessage: result.alreadyReported
          ? 'Avevi già segnalato questo avviso. Grazie.'
          : 'Report abuso registrato per moderazione ✔️',
      }));
      reload();
    }
    catch (error) {
      setState((current) => ({ ...current, status: 'error', actionMessage: 'Report abuso non riuscito ❗', errorMessage: normalizeHookError(error) }));
    }
  }, [reload]);

  return {
    ...state,
    reload,
    createLostAlert,
    createDanger,
    createSighting,
    closeLostAlert,
    closeDanger,
    reportContent,
  };
}
