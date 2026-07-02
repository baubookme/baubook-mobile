import type {PropsWithChildren} from 'react';
import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {Linking, Platform} from 'react-native';
import type {Session, User} from '@supabase/supabase-js';

import {
    deactivateDog,
    ensureCurrentProfile,
    fetchAccountSnapshot,
    isStaleAuthSessionError,
    normalizeError,
    saveDog,
    requestEmailOtp,
    requestPasswordReset as requestPasswordResetSupabase,
    sendEmailLogin,
    signInWithGoogleIdToken,
    signInWithPassword as signInWithPasswordSupabase,
    signOut as signOutSupabase,
    signUpWithPassword as signUpWithPasswordSupabase,
    updateAccountPassword,
    verifyEmailOtp,
    type DogDraftInput,
    type SignUpWithPasswordInput,
    type UserDogModel,
    type UserProfileModel,
} from '../api/authAccount';
import {hasSupabaseConfig} from '../lib/env';
import {getSupabaseClient} from '../lib/supabase';
import {getGoogleIdToken, isGoogleSignInAvailable} from './googleSignIn';

type AuthStatus = 'idle' | 'loading' | 'signed_out' | 'signed_in' | 'demo' | 'error';

interface ConsumedAuthUrl {
    message: string;
    passwordRecovery: boolean;
}

interface AuthContextValue {
    status: AuthStatus;
    session: Session | null;
    user: User | null;
    profile: UserProfileModel | null;
    dogs: UserDogModel[];
    message: string;
    errorMessage?: string;
    isConfigured: boolean;
    isSignedIn: boolean;
    isDemoMode: boolean;
    isBusy: boolean;
    isGoogleSignInAvailable: boolean;
    passwordRecoveryPending: boolean;
    startDemoMode: () => void;
    exitDemoMode: () => void;
    signInWithGoogle: () => Promise<void>;
    signInWithPassword: (email: string, password: string) => Promise<void>;
    signUpWithPassword: (input: SignUpWithPasswordInput) => Promise<void>;
    requestPasswordReset: (email: string) => Promise<void>;
    completePasswordReset: (password: string) => Promise<void>;
    requestOtpCode: (email: string) => Promise<void>;
    sendLoginEmail: (email: string) => Promise<void>;
    verifyOtpCode: (email: string, token: string) => Promise<void>;
    refreshAccount: () => Promise<void>;
    saveProfile: (displayName: string) => Promise<void>;
    saveDogProfile: (dog: DogDraftInput) => Promise<UserDogModel | null>;
    removeDogProfile: (dogId: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function extractAuthParams(url: string): Record<string, string> {
    const [, hash = ''] = url.split('#');
    const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
    const params = new URLSearchParams(hash || query);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
        result[key] = value;
    });
    return result;
}

async function consumeAuthUrl(url: string): Promise<ConsumedAuthUrl | null> {
    const client = getSupabaseClient();
    if (!client || !url) {
        return null;
    }

    const params = extractAuthParams(url);

    if (params.error || params.error_description) {
        throw new Error(params.error_description ?? params.error ?? 'Errore nel callback Supabase Auth.');
    }

    if (params.code) {
        const {error} = await client.auth.exchangeCodeForSession(params.code);
        if (error) {
            throw new Error(normalizeError(error));
        }
        const passwordRecovery = params.type === 'recovery';
        return {
            message: passwordRecovery
                ? 'Link recupero confermato: scegli una nuova password BauBook.'
                : 'Link magico confermato: sessione BauBook attiva.',
            passwordRecovery,
        };
    }

    if (params.access_token && params.refresh_token) {
        const {error} = await client.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
        });
        if (error) {
            throw new Error(normalizeError(error));
        }
        const passwordRecovery = params.type === 'recovery';
        return {
            message: passwordRecovery
                ? 'Link recupero confermato: scegli una nuova password BauBook.'
                : 'Sessione BauBook attivata dal link email.',
            passwordRecovery,
        };
    }

    return null;
}

export function AuthProvider({children}: PropsWithChildren) {
    const [status, setStatus] = useState<AuthStatus>('idle');
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfileModel | null>(null);
    const [dogs, setDogs] = useState<UserDogModel[]>([]);
    const [message, setMessage] = useState('Auth non ancora verificata.');
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);

    const resetToSignedOut = useCallback((nextMessage: string, nextErrorMessage?: string) => {
        setSession(null);
        setUser(null);
        setProfile(null);
        setDogs([]);
        setPasswordRecoveryPending(false);
        setStatus('signed_out');
        setMessage(nextMessage);
        setErrorMessage(nextErrorMessage);
    }, []);

    const handleStaleAuthSession = useCallback(async () => {
        await signOutSupabase().catch(() => undefined);
        resetToSignedOut('Sessione BauBook scaduta o account non più disponibile. Accedi di nuovo.');
    }, [resetToSignedOut]);

    const applySnapshot = useCallback((snapshot: Awaited<ReturnType<typeof fetchAccountSnapshot>>) => {
        if (snapshot.profile?.accountStatus === 'inactive') {
            void signOutSupabase().catch(() => undefined);
            resetToSignedOut('Account BauBook disattivato.', 'Questo account è stato disattivato dopo una richiesta di cancellazione.');
            return;
        }

        setSession(snapshot.session);
        setUser(snapshot.user);
        setProfile(snapshot.profile);
        setDogs(snapshot.dogs);
        setStatus(snapshot.user ? 'signed_in' : 'signed_out');
        setMessage(snapshot.user ? 'Sessione attiva: profilo BauBook caricato 🟢' : 'Nessuna sessione attiva ⭕');
        setErrorMessage(undefined);
    }, [resetToSignedOut]);

    const refreshAccount = useCallback(async () => {
        if (!hasSupabaseConfig) {
            setStatus('error');
            setMessage('Supabase non configurato.');
            setErrorMessage('Crea .env con URL e publishable key.');
            return;
        }

        try {
            setStatus('loading');
            const snapshot = await fetchAccountSnapshot();
            applySnapshot(snapshot);
        } catch (error) {
            if (isStaleAuthSessionError(error)) {
                await handleStaleAuthSession();
                return;
            }

            setStatus('error');
            setErrorMessage(normalizeError(error));
            setMessage('Errore durante il caricamento account.');
        }
    }, [applySnapshot, handleStaleAuthSession]);

    useEffect(() => {
        void refreshAccount();
    }, [refreshAccount]);

    useEffect(() => {
        const client = getSupabaseClient();
        if (!client) {
            return undefined;
        }

        const {data} = client.auth.onAuthStateChange((event, nextSession) => {
            setSession(nextSession);
            setUser(nextSession?.user ?? null);
            void refreshAccount().then(() => {
                if (event === 'PASSWORD_RECOVERY') {
                    setPasswordRecoveryPending(true);
                    setMessage('Link recupero confermato: scegli una nuova password BauBook.');
                    setErrorMessage(undefined);
                }
            });
        });

        return () => data.subscription.unsubscribe();
    }, [refreshAccount]);

    useEffect(() => {
        const handleUrl = async (url: string | null) => {
            if (!url) {
                return;
            }

            try {
                const authResult = await consumeAuthUrl(url);
                if (authResult) {
                    await refreshAccount();
                    setPasswordRecoveryPending(authResult.passwordRecovery);
                    setMessage(authResult.message);
                    setErrorMessage(undefined);
                }
            } catch (error) {
                setStatus('error');
                setMessage('Link Auth ricevuto, ma non elaborato.');
                setErrorMessage(normalizeError(error));
            }
        };

        if (Platform.OS !== 'web') {
            Linking.getInitialURL().then(handleUrl).catch(() => undefined);
            const subscription = Linking.addEventListener('url', (event) => {
                void handleUrl(event.url);
            });
            return () => subscription.remove();
        }

        if (typeof window !== 'undefined') {
            void handleUrl(window.location.href);
        }

        return undefined;
    }, [refreshAccount]);

    const startDemoMode = useCallback(() => {
        setSession(null);
        setUser(null);
        setProfile(null);
        setDogs([]);
        setPasswordRecoveryPending(false);
        setStatus('demo');
        setMessage('Modalità demo attiva: puoi dare un’occhiata a BauBook per curiosare.🦴');
        setErrorMessage(undefined);
    }, []);

    const exitDemoMode = useCallback(() => {
        resetToSignedOut('Demo chiusa. Accedi o registrati per salvare il profilo e usare BauBook in modo completo.');
    }, [resetToSignedOut]);

    const signInWithPassword = useCallback(async (email: string, password: string) => {
        try {
            setStatus('loading');
            await signInWithPasswordSupabase(email, password);
            await refreshAccount();
            setPasswordRecoveryPending(false);
            setMessage('Accesso completato: sessione BauBook attiva.');
            setErrorMessage(undefined);
        } catch (error) {
            const nextErrorMessage = normalizeError(error);
            setStatus('error');
            setMessage('Accesso con password non riuscito.');
            setErrorMessage(nextErrorMessage);
            throw new Error(nextErrorMessage);
        }
    }, [refreshAccount]);

    const signInWithGoogle = useCallback(async () => {
        try {
            setStatus('loading');
            const idToken = await getGoogleIdToken();

            if (!idToken) {
                setStatus(session ? 'signed_in' : 'signed_out');
                setMessage('Accesso Google annullato.');
                setErrorMessage(undefined);
                return;
            }

            await signInWithGoogleIdToken(idToken);
            await refreshAccount();
            setPasswordRecoveryPending(false);
            setMessage('Accesso con Google completato: sessione BauBook attiva.');
            setErrorMessage(undefined);
        } catch (error) {
            setStatus('error');
            setMessage('Accesso con Google non riuscito.');
            setErrorMessage(normalizeError(error));
        }
    }, [refreshAccount, session]);

    const signUpWithPassword = useCallback(async (input: SignUpWithPasswordInput) => {
        try {
            setStatus('loading');
            const result = await signUpWithPasswordSupabase(input);

            if (result.session) {
                await refreshAccount();
            } else {
                setStatus('signed_out');
            }

            setPasswordRecoveryPending(false);
            setMessage(result.message);
            setErrorMessage(undefined);
        } catch (error) {
            const nextErrorMessage = normalizeError(error);
            setStatus('error');
            setMessage('Registrazione non riuscita.');
            setErrorMessage(nextErrorMessage);
            throw new Error(nextErrorMessage);
        }
    }, [refreshAccount]);

    const requestPasswordReset = useCallback(async (email: string) => {
        try {
            setStatus('loading');
            const nextMessage = await requestPasswordResetSupabase(email);
            setStatus(session ? 'signed_in' : 'signed_out');
            setMessage(nextMessage);
            setErrorMessage(undefined);
        } catch (error) {
            const nextErrorMessage = normalizeError(error);
            setStatus('error');
            setMessage('Invio recupero password non riuscito.');
            setErrorMessage(nextErrorMessage);
            throw new Error(nextErrorMessage);
        }
    }, [session]);

    const completePasswordReset = useCallback(async (password: string) => {
        try {
            setStatus('loading');
            await updateAccountPassword(password);
            setPasswordRecoveryPending(false);
            await refreshAccount();
            setMessage('Password BauBook aggiornata. Dal prossimo accesso puoi usare email e password.');
            setErrorMessage(undefined);
        } catch (error) {
            setStatus('error');
            setMessage('Aggiornamento password non riuscito.');
            setErrorMessage(normalizeError(error));
        }
    }, [refreshAccount]);

    const requestOtpCode = useCallback(async (email: string) => {
        try {
            setStatus('loading');
            const nextMessage = await requestEmailOtp(email);
            setStatus(session ? 'signed_in' : 'signed_out');
            setMessage(nextMessage);
            setErrorMessage(undefined);
        } catch (error) {
            setStatus('error');
            setMessage('Invio codice email non riuscito.');
            setErrorMessage(normalizeError(error));
        }
    }, [session]);

    const sendLoginEmail = useCallback(async (email: string) => {
        try {
            setStatus('loading');
            const nextMessage = await sendEmailLogin(email);
            setStatus(session ? 'signed_in' : 'signed_out');
            setMessage(nextMessage);
            setErrorMessage(undefined);
        } catch (error) {
            setStatus('error');
            setMessage('Invio email Auth non riuscito.');
            setErrorMessage(normalizeError(error));
        }
    }, [session]);

    const verifyOtpCode = useCallback(async (email: string, token: string) => {
        try {
            setStatus('loading');
            await verifyEmailOtp(email, token);
            await refreshAccount();
            setPasswordRecoveryPending(false);
            setMessage('Codice OTP verificato: sessione BauBook attiva.');
        } catch (error) {
            setStatus('error');
            setMessage('Verifica OTP non riuscita.');
            setErrorMessage(normalizeError(error));
        }
    }, [refreshAccount]);

    const saveProfile = useCallback(async (displayName: string) => {
        try {
            setStatus('loading');
            const nextProfile = await ensureCurrentProfile(displayName);
            setProfile(nextProfile);
            setStatus('signed_in');
            setMessage('Profilo utente salvato su BauBook 💾');
            setErrorMessage(undefined);
        } catch (error) {
            if (isStaleAuthSessionError(error)) {
                await handleStaleAuthSession();
                return;
            }

            setStatus('error');
            setMessage('Salvataggio profilo non riuscito.');
            setErrorMessage(normalizeError(error));
        }
    }, [handleStaleAuthSession]);

    const saveDogProfile = useCallback(async (dog: DogDraftInput): Promise<UserDogModel | null> => {
        if (!profile) {
            setStatus('error');
            setMessage('Prima crea o carica il profilo utente BauBook.');
            setErrorMessage('Profilo utente mancante.');
            return null;
        }

        try {
            setStatus('loading');
            const savedDog = await saveDog(profile.id, dog);
            setDogs((current) => {
                const exists = current.some((item) => item.id === savedDog.id);
                return exists ? current.map((item) => (item.id === savedDog.id ? savedDog : item)) : [...current, savedDog];
            });
            setStatus('signed_in');
            setMessage('Profilo salvato 🐾. Bau! 💾');
            setErrorMessage(undefined);
            return savedDog;
        } catch (error) {
            if (isStaleAuthSessionError(error)) {
                await handleStaleAuthSession();
                return null;
            }

            setStatus('error');
            setMessage('Salvataggio non riuscito.');
            setErrorMessage(normalizeError(error));
            return null;
        }
    }, [handleStaleAuthSession, profile]);

    const removeDogProfile = useCallback(async (dogId: string) => {
        if (!profile) {
            const nextErrorMessage = 'Profilo utente mancante.';
            setStatus('error');
            setMessage('Prima crea o carica il profilo utente BauBook.');
            setErrorMessage(nextErrorMessage);
            throw new Error(nextErrorMessage);
        }

        try {
            setStatus('loading');
            await deactivateDog(dogId);
            setDogs((current) => current.filter((dog) => dog.id !== dogId));
            setStatus('signed_in');
            setMessage('Profilo cane rimosso da BauBook. Il tuo profilo utente resta attivo.');
            setErrorMessage(undefined);
        } catch (error) {
            if (isStaleAuthSessionError(error)) {
                await handleStaleAuthSession();
                return;
            }

            const nextErrorMessage = normalizeError(error);
            setStatus('error');
            setMessage('Rimozione profilo cane non riuscita.');
            setErrorMessage(nextErrorMessage);
            throw new Error(nextErrorMessage);
        }
    }, [handleStaleAuthSession, profile]);

    const signOut = useCallback(async () => {
        try {
            setStatus('loading');
            await signOutSupabase();
            setSession(null);
            setUser(null);
            setProfile(null);
            setDogs([]);
            setPasswordRecoveryPending(false);
            setStatus('signed_out');
            setMessage('Logout completato.');
            setErrorMessage(undefined);
        } catch (error) {
            setStatus('error');
            setMessage('Logout non riuscito.');
            setErrorMessage(normalizeError(error));
        }
    }, []);

    const value = useMemo<AuthContextValue>(() => ({
        status,
        session,
        user,
        profile,
        dogs,
        message,
        errorMessage,
        isConfigured: hasSupabaseConfig,
        isSignedIn: Boolean(user),
        isDemoMode: status === 'demo',
        isBusy: status === 'loading',
        isGoogleSignInAvailable,
        passwordRecoveryPending,
        startDemoMode,
        exitDemoMode,
        signInWithGoogle,
        signInWithPassword,
        signUpWithPassword,
        requestPasswordReset,
        completePasswordReset,
        requestOtpCode,
        sendLoginEmail,
        verifyOtpCode,
        refreshAccount,
        saveProfile,
        saveDogProfile,
        removeDogProfile,
        signOut,
    }), [completePasswordReset, dogs, errorMessage, exitDemoMode, message, passwordRecoveryPending, profile, refreshAccount, removeDogProfile, requestOtpCode, requestPasswordReset, saveDogProfile, saveProfile, sendLoginEmail, session, signInWithGoogle, signInWithPassword, signOut, signUpWithPassword, startDemoMode, status, user, verifyOtpCode]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthAccount() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthAccount deve essere usato dentro AuthProvider.');
    }
    return context;
}
