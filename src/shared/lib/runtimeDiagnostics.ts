import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface RuntimeDiagnosticItem {
  label: string;
  value: string;
}

type ConstantsWithOptionalExpoGo = typeof Constants & {
  expoGoConfig?: {
    debuggerHost?: string;
  };
};

function safeString(value: unknown, fallback = 'n/d'): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return String(value);
}

export function getRuntimeDiagnostics(): RuntimeDiagnosticItem[] {
  const constants = Constants as ConstantsWithOptionalExpoGo;
  const expoConfig = constants.expoConfig;
  const hostUri = constants.expoGoConfig?.debuggerHost ?? constants.linkingUri ?? '';

  return [
    { label: 'Runtime', value: safeString(constants.executionEnvironment) },
    { label: 'Piattaforma', value: `${Platform.OS}${Platform.Version ? ` ${Platform.Version}` : ''}` },
    { label: 'Expo SDK', value: safeString(expoConfig?.sdkVersion, 'Expo managed') },
    { label: 'App', value: `${safeString(expoConfig?.name)} · ${safeString(expoConfig?.version)}` },
    { label: 'Metro/Host', value: safeString(hostUri) },
    { label: 'Ultimo errore runtime', value: safeString(globalThis.__BAUBOOK_LAST_RUNTIME_ERROR__, 'nessuno intercettato') },
  ];
}
