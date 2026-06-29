import Constants from 'expo-constants';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

type ExpoExtra = {
  googleWebClientId?: string;
  baubook?: {
    googleWebClientId?: string;
  };
};

type SignInResponseShape = {
  type?: string;
  data?: {
    idToken?: string | null;
  } | null;
  idToken?: string | null;
};

type GoogleErrorShape = {
  code?: string;
};

let configured = false;

function getGoogleWebClientId(): string {
  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
  const candidates = [
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    extra?.baubook?.googleWebClientId,
    extra?.googleWebClientId,
  ];

  return candidates.map((value) => value?.trim()).find(Boolean) ?? '';
}

const googleWebClientId = getGoogleWebClientId();

export const isGoogleSignInAvailable = Boolean(googleWebClientId);

function configureGoogleSignIn(): void {
  if (configured) {
    return;
  }

  if (!googleWebClientId) {
    throw new Error('Login Google non configurato: manca googleWebClientId.');
  }

  GoogleSignin.configure({
    webClientId: googleWebClientId,
  });
  configured = true;
}

function getGoogleErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as GoogleErrorShape).code ?? '');
  }
  return '';
}

export async function getGoogleIdToken(): Promise<string | null> {
  configureGoogleSignIn();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.signOut().catch(() => undefined);

    const response = (await GoogleSignin.signIn()) as SignInResponseShape;

    if (response.type === 'cancelled') {
      return null;
    }

    const idToken = response.data?.idToken ?? response.idToken ?? null;
    if (!idToken) {
      throw new Error('Google non ha restituito un token valido. Controlla Web Client ID e provider Supabase.');
    }

    return idToken;
  } catch (error) {
    const code = getGoogleErrorCode(error);

    if (code === statusCodes.SIGN_IN_CANCELLED) {
      return null;
    }

    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services non disponibile o da aggiornare.');
    }

    if (code === statusCodes.IN_PROGRESS) {
      throw new Error('Accesso Google gia in corso.');
    }

    throw error;
  }
}
