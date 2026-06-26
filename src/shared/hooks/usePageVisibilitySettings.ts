import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { getSupabaseClient } from '../lib/supabase';

export const MIN_PAGE_VISIBILITY_RADIUS_KM = 1;
export const MAX_PAGE_VISIBILITY_RADIUS_KM = 20;
export const DEFAULT_PAGE_VISIBILITY_RADIUS_KM = 3;

const PAGE_VISIBILITY_RADIUS_STORAGE_KEY = '@baubook/page_visibility_radius_km_v1';
const PAGE_VISIBILITY_LOCATION_STORAGE_KEY = '@baubook/page_visibility_last_location_v1';

export interface PageVisibilityLocation {
  latitude: number;
  longitude: number;
  label: string;
  savedAtIso: string;
}

export interface PageVisibilityTarget {
  locationLatitude?: unknown;
  locationLongitude?: unknown;
}

interface StoredPageVisibilityLocation {
  latitude?: unknown;
  longitude?: unknown;
  label?: unknown;
  savedAtIso?: unknown;
}

interface ResolveLocationLabelResponse {
  label?: unknown;
  formattedAddress?: unknown;
  source?: unknown;
}

type PageVisibilitySnapshot = {
  radiusKm: number;
  location: PageVisibilityLocation | null;
};

const pageVisibilityListeners = new Set<(snapshot: PageVisibilitySnapshot) => void>();

let pageVisibilitySnapshot: PageVisibilitySnapshot = {
  radiusKm: DEFAULT_PAGE_VISIBILITY_RADIUS_KM,
  location: null,
};

function notifyPageVisibilityListeners() {
  pageVisibilityListeners.forEach((listener) => {
    listener(pageVisibilitySnapshot);
  });
}

function subscribePageVisibility(listener: (snapshot: PageVisibilitySnapshot) => void): () => void {
  pageVisibilityListeners.add(listener);

  return () => {
    pageVisibilityListeners.delete(listener);
  };
}

function setPageVisibilitySnapshot(nextSnapshot: Partial<PageVisibilitySnapshot>) {
  pageVisibilitySnapshot = {
    ...pageVisibilitySnapshot,
    ...nextSnapshot,
  };

  notifyPageVisibilityListeners();
}

function clampRadius(value: number): number {
  return Math.min(MAX_PAGE_VISIBILITY_RADIUS_KM, Math.max(MIN_PAGE_VISIBILITY_RADIUS_KM, Math.round(value)));
}

function parseStoredRadius(value: string | null): number {
  if (!value) {
    return DEFAULT_PAGE_VISIBILITY_RADIUS_KM;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_PAGE_VISIBILITY_RADIUS_KM;
  }

  return clampRadius(parsed);
}

function parseStoredLocation(value: string | null): PageVisibilityLocation | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as StoredPageVisibilityLocation;
    const latitude = Number(parsed.latitude);
    const longitude = Number(parsed.longitude);
    const label = typeof parsed.label === 'string' ? parsed.label.trim() : '';
    const savedAtIso = typeof parsed.savedAtIso === 'string' ? parsed.savedAtIso : new Date().toISOString();

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return null;
    }

    return {
      latitude,
      longitude,
      label: label || 'Posizione salvata',
      savedAtIso,
    };
  } catch {
    return null;
  }
}

export async function savePageVisibilityLocation(location: PageVisibilityLocation): Promise<void> {
  setPageVisibilitySnapshot({ location });
  await AsyncStorage.setItem(PAGE_VISIBILITY_LOCATION_STORAGE_KEY, JSON.stringify(location));
}

export async function getSavedPageVisibilityLocation(): Promise<PageVisibilityLocation | null> {
  const stored = await AsyncStorage.getItem(PAGE_VISIBILITY_LOCATION_STORAGE_KEY);
  return parseStoredLocation(stored);
}

export async function getSavedPageVisibilityRadiusKm(): Promise<number> {
  const stored = await AsyncStorage.getItem(PAGE_VISIBILITY_RADIUS_STORAGE_KEY);
  return parseStoredRadius(stored);
}

export function pageVisibilityDistanceKm(
  source: PageVisibilityLocation,
  targetLatitude: number,
  targetLongitude: number,
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const deltaLatitude = toRadians(targetLatitude - source.latitude);
  const deltaLongitude = toRadians(targetLongitude - source.longitude);
  const sourceLatitude = toRadians(source.latitude);
  const targetLatitudeRadians = toRadians(targetLatitude);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(sourceLatitude) *
      Math.cos(targetLatitudeRadians) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

export function isTargetWithinPageVisibilityRadius(
  target: PageVisibilityTarget,
  source: PageVisibilityLocation | null,
  radiusKm: number,
): boolean {
  if (!source) {
    return true;
  }

  const latitude = Number(target.locationLatitude);
  const longitude = Number(target.locationLongitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }

  return pageVisibilityDistanceKm(source, latitude, longitude) <= radiusKm;
}

export async function resolvePageVisibilityLocationLabel(latitude: number, longitude: number): Promise<string | null> {
  const client = getSupabaseClient();

  if (!client) {
    return null;
  }

  try {
    const { data, error } = await client.functions.invoke('resolve-location-label', {
      body: { latitude, longitude },
    });

    if (error || !data) {
      return null;
    }

    const response = data as ResolveLocationLabelResponse;
    const label = typeof response.label === 'string' ? response.label.trim() : '';

    return label.length ? label : null;
  } catch {
    return null;
  }
}

export function usePageVisibilitySettings() {
  const [radiusKm, setRadiusKmState] = useState(pageVisibilitySnapshot.radiusKm);
  const [location, setLocation] = useState<PageVisibilityLocation | null>(pageVisibilitySnapshot.location);
  const [loaded, setLoaded] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    return subscribePageVisibility((snapshot) => {
      setRadiusKmState(snapshot.radiusKm);
      setLocation(snapshot.location);
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const [storedRadius, storedLocation] = await Promise.all([
          AsyncStorage.getItem(PAGE_VISIBILITY_RADIUS_STORAGE_KEY),
          AsyncStorage.getItem(PAGE_VISIBILITY_LOCATION_STORAGE_KEY),
        ]);

        if (!active) {
          return;
        }

        const nextRadius = parseStoredRadius(storedRadius);
        const nextLocation = parseStoredLocation(storedLocation);

        setPageVisibilitySnapshot({
          radiusKm: nextRadius,
          location: nextLocation,
        });

        setRadiusKmState(nextRadius);
        setLocation(nextLocation);
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  const setRadiusKm = useCallback(async (nextRadiusKm: number) => {
    const normalizedRadius = clampRadius(nextRadiusKm);
    setPageVisibilitySnapshot({ radiusKm: normalizedRadius });
    setRadiusKmState(normalizedRadius);
    await AsyncStorage.setItem(PAGE_VISIBILITY_RADIUS_STORAGE_KEY, String(normalizedRadius));
  }, []);

  const detectAndSaveLocation = useCallback(async () => {
    if (detecting) {
      return;
    }

    setDetecting(true);
    setMessage('Rilevo la posizione...');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setMessage('Permesso posizione non concesso.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const label = (await resolvePageVisibilityLocationLabel(latitude, longitude)) ?? 'Posizione salvata';

      const nextLocation: PageVisibilityLocation = {
        latitude,
        longitude,
        label,
        savedAtIso: new Date().toISOString(),
      };

      setLocation(nextLocation);
      await savePageVisibilityLocation(nextLocation);

      if (label === 'Posizione salvata') {
        setMessage('Posizione salvata. Indirizzo non disponibile in questo momento.');
      } else {
        setMessage('✅ Posizione aggiornata');
      }
    } catch {
      setMessage('Non riesco a leggere la posizione. Riprova tra poco.');
    } finally {
      setDetecting(false);
    }
  }, [detecting]);

  return useMemo(
    () => ({
      radiusKm,
      radiusLabel: `${radiusKm} km`,
      hasLocation: Boolean(location),
      location,
      locationLabel: location?.label ?? '',
      loaded,
      detecting,
      message,
      setRadiusKm,
      detectAndSaveLocation,
    }),
    [radiusKm, location, loaded, detecting, message, setRadiusKm, detectAndSaveLocation],
  );
}
