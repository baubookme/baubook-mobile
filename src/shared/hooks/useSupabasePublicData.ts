import { useCallback, useEffect, useState } from 'react';

import {
  fetchFeatureFlags,
  fetchPublicPlaces,
  fetchSupabasePublicStatus,
  type SupabaseFeatureFlag,
  type SupabasePlacesResult,
  type SupabasePublicStatus,
} from '../api/supabaseContent';
import type { PlaceModel } from '../types/domain';
import { supabase } from '../lib/supabase';

type ResourceStatus = 'idle' | 'loading' | 'success' | 'error';


export type PlacesRealtimeStatus = 'idle' | 'connecting' | 'subscribed' | 'polling' | 'disabled' | 'error';

const MAP_REALTIME_POLL_INTERVAL_MS = 30000;
const MAP_REALTIME_TABLES = ['places', 'presence_sessions', 'walk_plans', 'lost_dog_alerts', 'danger_reports'] as const;

function getMapRealtimeClient(): any {
  try {
    return supabase ?? null;
  } catch {
    return null;
  }
}

interface PlacesState {
  status: ResourceStatus;
  source: 'supabase' | 'empty' | 'unavailable';
  places: PlaceModel[];
  message: string;
  errorMessage?: string;
  realtimeStatus?: PlacesRealtimeStatus;
  lastUpdatedAt?: string | null;
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
    status: 'loading',
    source: 'unavailable',
    places: [],
    message: 'Carico luoghi dal backend...',
    errorMessage: undefined,
    realtimeStatus: 'idle',
    lastUpdatedAt: null,
  });

  const reload = useCallback((reasonOrEvent?: unknown) => {
    const reason = typeof reasonOrEvent === 'string' ? reasonOrEvent : 'manual';

    setState((previous) => ({
      ...previous,
      status: previous.places.length ? previous.status : 'loading',
    }));

    fetchPublicPlaces()
      .then((result: SupabasePlacesResult) => {
        const loadedAt = new Date().toISOString();
        setState((previous) => {
          const realtimeStatus: PlacesRealtimeStatus =
            result.source !== 'supabase'
              ? 'disabled'
              : previous.realtimeStatus === 'subscribed' || reason === 'realtime'
                ? 'subscribed'
                : 'polling';

          return {
            status: 'success',
            source: result.source,
            places: result.places,
            message:
              realtimeStatus === 'subscribed'
                ? `${result.message} Aggiornamento realtime attivo.`
                : realtimeStatus === 'polling'
                  ? `${result.message} Fallback polling attivo.`
                  : result.message,
            errorMessage: result.errorMessage,
            realtimeStatus,
            lastUpdatedAt: loadedAt,
          };
        });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Errore sconosciuto';
        setState({
          status: 'error',
          source: 'unavailable',
          places: [],
          message: 'Luoghi non disponibili dal backend.',
          errorMessage: message,
          realtimeStatus: 'error',
          lastUpdatedAt: new Date().toISOString(),
        });
      });
  }, []);

  useEffect(() => {
    reload('initial');
  }, [reload]);

  useEffect(() => {
    const client = getMapRealtimeClient();

    if (!client || typeof client.channel !== 'function') {
      setState((previous) => ({
        ...previous,
        realtimeStatus: previous.source === 'supabase' ? 'polling' : 'disabled',
      }));
      const pollingId = setInterval(() => reload('polling'), MAP_REALTIME_POLL_INTERVAL_MS);
      return () => clearInterval(pollingId);
    }

    setState((previous) => ({ ...previous, realtimeStatus: 'connecting' }));

    const channel = client.channel('baubook-map-realtime-2-0-2');

    MAP_REALTIME_TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => reload('realtime'),
      );
    });

    channel.subscribe((subscriptionStatus: string) => {
      if (subscriptionStatus === 'SUBSCRIBED') {
        setState((previous) => ({ ...previous, realtimeStatus: 'subscribed' }));
      }

      if (
        subscriptionStatus === 'CHANNEL_ERROR' ||
        subscriptionStatus === 'TIMED_OUT' ||
        subscriptionStatus === 'CLOSED'
      ) {
        setState((previous) => ({
          ...previous,
          realtimeStatus: previous.source === 'supabase' ? 'polling' : 'error',
        }));
      }
    });

    const pollingId = setInterval(() => reload('polling'), MAP_REALTIME_POLL_INTERVAL_MS);

    return () => {
      clearInterval(pollingId);
      if (typeof client.removeChannel === 'function') {
        client.removeChannel(channel);
      } else if (typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      }
    };
  }, [reload]);

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

