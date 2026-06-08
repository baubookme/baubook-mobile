import { useCallback, useEffect, useState } from 'react';

import {
  createPresence,
  createWalkPlan,
  endMyPresenceSessions,
  fetchWalksBoard,
  joinWalkPlan,
  type CreatePresenceInput,
  type CreateWalkPlanInput,
  type LivePresenceModel,
  type LiveWalkPlanModel,
} from '../api/walks';

type ResourceStatus = 'idle' | 'loading' | 'success' | 'error';

interface WalksBoardState {
  status: ResourceStatus;
  source: 'supabase' | 'fallback';
  walks: LiveWalkPlanModel[];
  presences: LivePresenceModel[];
  message: string;
  errorMessage?: string;
  actionMessage?: string;
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : JSON.stringify(error);
}

export function useWalksBoard(currentProfileId?: string | null) {
  const [state, setState] = useState<WalksBoardState>({
    status: 'idle',
    source: 'fallback',
    walks: [],
    presences: [],
    message: 'In attesa di caricamento passeggiate.',
  });

  const reload = useCallback(() => {
    let active = true;
    setState((current) => ({ ...current, status: 'loading', errorMessage: undefined }));

    fetchWalksBoard(currentProfileId)
      .then((result) => {
        if (!active) {
          return;
        }
        setState((current) => ({
          ...current,
          status: 'success',
          source: result.source,
          walks: result.walks,
          presences: result.presences,
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
          message: 'Errore caricamento passeggiate.',
          errorMessage: normalizeError(error),
        }));
      });

    return () => {
      active = false;
    };
  }, [currentProfileId]);

  useEffect(() => reload(), [reload]);

  const createPlan = useCallback(async (input: CreateWalkPlanInput) => {
    setState((current) => ({ ...current, status: 'loading', actionMessage: 'Creo la passeggiata...' }));
    try {
      await createWalkPlan(input);
      setState((current) => ({ ...current, actionMessage: 'Passeggiata creata. Bau!' }));
      reload();
    }
    catch (error) {
      setState((current) => ({ ...current, status: 'error', actionMessage: 'Creazione passeggiata non riuscita.', errorMessage: normalizeError(error) }));
    }
  }, [reload]);

  const joinPlan = useCallback(async (walkPlanId: string, dogId?: string | null) => {
    setState((current) => ({ ...current, status: 'loading', actionMessage: 'Segno interesse...' }));
    try {
      await joinWalkPlan(walkPlanId, dogId);
      setState((current) => ({ ...current, actionMessage: 'Interesse registrato. Gli umani annusano la situazione.' }));
      reload();
    }
    catch (error) {
      setState((current) => ({ ...current, status: 'error', actionMessage: 'Partecipazione non riuscita.', errorMessage: normalizeError(error) }));
    }
  }, [reload]);

  const startPresence = useCallback(async (input: CreatePresenceInput) => {
    setState((current) => ({ ...current, status: 'loading', actionMessage: 'Attivo presenza temporanea...' }));
    try {
      await createPresence(input);
      setState((current) => ({ ...current, actionMessage: 'Presenza temporanea attiva.' }));
      reload();
    }
    catch (error) {
      setState((current) => ({ ...current, status: 'error', actionMessage: 'Presenza non attivata.', errorMessage: normalizeError(error) }));
    }
  }, [reload]);

  const endPresence = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', actionMessage: 'Chiudo presenze attive...' }));
    try {
      const count = await endMyPresenceSessions();
      setState((current) => ({ ...current, actionMessage: count ? `Presenze chiuse: ${count}.` : 'Nessuna presenza attiva da chiudere.' }));
      reload();
    }
    catch (error) {
      setState((current) => ({ ...current, status: 'error', actionMessage: 'Chiusura presenza non riuscita.', errorMessage: normalizeError(error) }));
    }
  }, [reload]);

  return { ...state, reload, createPlan, joinPlan, startPresence, endPresence };
}
