import { useCallback, useEffect, useState } from 'react';
import {
  createPresence,
  createWalkPlan,
  endMyPresenceSessions,
  endMyWalkPlan,
  fetchWalksBoard,
  joinWalkPlan,
  updateMyActivePresence,
  updateMyActiveWalkPlan,
  type CreatePresenceInput,
  type CreateWalkPlanInput,
  type LivePresenceModel,
  type LiveWalkPlanModel,
  type UpdatePresenceInput,
  type UpdateWalkPlanInput,
} from '../api/walks';

type ResourceStatus = 'idle' | 'loading' | 'success' | 'error';
type ActionScope = 'walk' | 'presence' | 'general';

interface WalksBoardState {
  status: ResourceStatus;
  source: 'supabase' | 'fallback';
  walks: LiveWalkPlanModel[];
  presences: LivePresenceModel[];
  message: string;
  errorMessage?: string;
  actionMessage?: string;
  actionScope?: ActionScope;
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

  useEffect(() => {
    if (!state.actionMessage || state.status === 'loading') {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setState((current) => {
        if (current.actionMessage !== state.actionMessage || current.actionScope !== state.actionScope) {
          return current;
        }

        return {
          ...current,
          actionMessage: undefined,
          actionScope: undefined,
        };
      });
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [state.actionMessage, state.actionScope, state.status]);

  const createPlan = useCallback(async (input: CreateWalkPlanInput) => {
    setState((current) => ({ ...current, status: 'loading', actionScope: 'walk', actionMessage: 'Creo la passeggiata...' }));

    try {
      await createWalkPlan(input);
      setState((current) => ({ ...current, actionScope: 'walk', actionMessage: 'Passeggiata creata. Bau!' }));
      reload();
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        actionScope: 'walk',
        actionMessage: 'Creazione passeggiata non riuscita.',
        errorMessage: normalizeError(error),
      }));
    }
  }, [reload]);

  const updatePlan = useCallback(async (input: UpdateWalkPlanInput) => {
    setState((current) => ({ ...current, status: 'loading', actionScope: 'walk', actionMessage: 'Aggiorno la passeggiata...' }));

    try {
      await updateMyActiveWalkPlan(input);
      setState((current) => ({ ...current, actionScope: 'walk', actionMessage: 'Passeggiata aggiornata.' }));
      reload();
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        actionScope: 'walk',
        actionMessage: 'Aggiornamento passeggiata non riuscito.',
        errorMessage: normalizeError(error),
      }));
    }
  }, [reload]);

  const endWalkPlan = useCallback(async (walkPlanId: string) => {
    setState((current) => ({
      ...current,
      status: 'loading',
      walks: current.walks.filter((walk) => walk.id !== walkPlanId),
      actionScope: 'walk',
      actionMessage: 'Chiudo la passeggiata...',
    }));

    try {
      const count = await endMyWalkPlan(walkPlanId);
      setState((current) => ({
        ...current,
        actionScope: 'walk',
        actionMessage: count ? 'Passeggiata chiusa. Bentornato a casa.' : 'Nessuna passeggiata attiva da chiudere.',
      }));
      reload();
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        actionScope: 'walk',
        actionMessage: 'Chiusura passeggiata non riuscita.',
        errorMessage: normalizeError(error),
      }));
      reload();
    }
  }, [reload]);

  const joinPlan = useCallback(async (walkPlanId: string, dogId?: string | null) => {
    setState((current) => ({ ...current, status: 'loading', actionScope: 'walk', actionMessage: 'Segno interesse...' }));

    try {
      await joinWalkPlan(walkPlanId, dogId);
      setState((current) => ({ ...current, actionScope: 'walk', actionMessage: 'Interesse registrato. Gli umani annusano la situazione.' }));
      reload();
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        actionScope: 'walk',
        actionMessage: 'Partecipazione non riuscita.',
        errorMessage: normalizeError(error),
      }));
    }
  }, [reload]);

  const startPresence = useCallback(async (input: CreatePresenceInput) => {
    setState((current) => ({ ...current, status: 'loading', actionScope: 'presence', actionMessage: 'Attivo presenza temporanea...' }));

    try {
      await createPresence(input);
      setState((current) => ({ ...current, actionScope: 'presence', actionMessage: 'Presenza temporanea attiva.' }));
      reload();
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        actionScope: 'presence',
        actionMessage: 'Presenza non attivata.',
        errorMessage: normalizeError(error),
      }));
    }
  }, [reload]);

  const updatePresence = useCallback(async (input: UpdatePresenceInput) => {
    setState((current) => ({ ...current, status: 'loading', actionScope: 'presence', actionMessage: 'Aggiorno presenza temporanea...' }));

    try {
      await updateMyActivePresence(input);
      setState((current) => ({ ...current, actionScope: 'presence', actionMessage: 'Presenza temporanea aggiornata.' }));
      reload();
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        actionScope: 'presence',
        actionMessage: 'Aggiornamento presenza non riuscito.',
        errorMessage: normalizeError(error),
      }));
    }
  }, [reload]);

  const endPresence = useCallback(async () => {
    setState((current) => ({
      ...current,
      status: 'loading',
      presences: current.presences.filter((presence) => !presence.isMine),
      actionScope: 'presence',
      actionMessage: 'Chiudo la presenza...',
    }));

    try {
      const count = await endMyPresenceSessions();
      setState((current) => ({
        ...current,
        actionScope: 'presence',
        actionMessage: count ? 'Presenza chiusa. Bentornato a casa.' : 'Nessuna presenza attiva da chiudere.',
      }));
      reload();
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        actionScope: 'presence',
        actionMessage: 'Chiusura presenza non riuscita.',
        errorMessage: normalizeError(error),
      }));
      reload();
    }
  }, [reload]);

  const myActiveWalk = state.walks.find((walk) => walk.isMine) ?? null;
  const myActivePresence = state.presences.find((presence) => presence.isMine) ?? null;

  return {
    ...state,
    myActiveWalk,
    myActivePresence,
    hasMyActiveWalk: Boolean(myActiveWalk),
    hasMyActivePresence: Boolean(myActivePresence),
    reload,
    createPlan,
    updatePlan,
    endWalkPlan,
    joinPlan,
    startPresence,
    updatePresence,
    endPresence,
  };
}
