import { useCallback, useEffect, useState } from 'react';

import {
  fetchFeatureFlags,
  fetchPublicPlaces,
  fetchSupabasePublicStatus,
  type SupabaseFeatureFlag,
  type SupabasePlacesResult,
  type SupabasePublicStatus,
} from '../api/supabaseContent';
import { demoPlaces } from '../data/mockData';
import type { PlaceModel } from '../types/domain';

type ResourceStatus = 'idle' | 'loading' | 'success' | 'error';

interface PlacesState {
  status: ResourceStatus;
  source: 'supabase' | 'fallback';
  places: PlaceModel[];
  message: string;
  errorMessage?: string;
}

interface PublicStatusState {
  status: ResourceStatus;
  data: SupabasePublicStatus | null;
  errorMessage?: string;
}

interface FeatureFlagsState {
  status: ResourceStatus;
  flags: SupabaseFeatureFlag[];
  errorMessage?: string;
}

export function useSupabasePlaces() {
  const [state, setState] = useState<PlacesState>({
    status: 'idle',
    source: 'fallback',
    places: demoPlaces,
    message: 'In attesa di caricamento.',
  });

  const reload = useCallback(() => {
    let active = true;

    setState((current) => ({ ...current, status: 'loading' }));

    fetchPublicPlaces()
      .then((result: SupabasePlacesResult) => {
        if (!active) {
          return;
        }
        setState({
          status: 'success',
          source: result.source,
          places: result.places,
          message: result.message,
          errorMessage: result.errorMessage,
        });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        setState({
          status: 'error',
          source: 'fallback',
          places: demoPlaces,
          message: 'Errore non gestito durante il caricamento Supabase: uso dati demo locali.',
          errorMessage,
        });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => reload(), [reload]);

  return { ...state, reload };
}

export function useSupabasePublicStatus() {
  const [state, setState] = useState<PublicStatusState>({ status: 'idle', data: null });

  const reload = useCallback(() => {
    let active = true;

    setState((current) => ({ ...current, status: 'loading' }));

    fetchSupabasePublicStatus()
      .then((data) => {
        if (!active) {
          return;
        }
        setState({ status: 'success', data });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        setState({ status: 'error', data: null, errorMessage });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => reload(), [reload]);

  return { ...state, reload };
}

export function useSupabaseFeatureFlags() {
  const [state, setState] = useState<FeatureFlagsState>({ status: 'idle', flags: [] });

  const reload = useCallback(() => {
    let active = true;

    setState((current) => ({ ...current, status: 'loading' }));

    fetchFeatureFlags()
      .then((flags) => {
        if (!active) {
          return;
        }
        setState({ status: 'success', flags });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        setState({ status: 'error', flags: [], errorMessage });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => reload(), [reload]);

  return { ...state, reload };
}
