import type { Session, User } from '@supabase/supabase-js';

import { hasSupabaseConfig } from '../lib/env';
import { getAuthRedirectUrl } from '../lib/authRedirect';
import { getSupabaseClient } from '../lib/supabase';

export interface UserProfileModel {
  id: string;
  userId: string;
  displayName: string;
  cityLabel: string;
  isVerifiedEmail: boolean;
  isVerifiedPhone: boolean;
  trustScore: number;
  status: 'active' | 'suspended' | 'banned' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface UserDogModel {
  id: string;
  ownerId: string;
  name: string;
  birthYear: number | null;
  size: 'small' | 'medium' | 'large' | 'giant' | null;
  personalityTags: string[];
  socialityTags: string[];
  walkTags: string[];
  notesPublic: string | null;
  notesPrivate: string | null;
  visibility: 'public' | 'friends' | 'private' | 'shadow_hidden' | 'removed';
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'hidden' | 'escalated' | 'removed';
  createdAt: string;
  updatedAt: string;
}

interface RemoteProfileRow {
  id: string;
  user_id: string;
  display_name: string;
  city_label: string;
  is_verified_email: boolean;
  is_verified_phone: boolean;
  trust_score: number;
  status: UserProfileModel['status'];
  created_at: string;
  updated_at: string;
}

interface RemoteDogRow {
  id: string;
  owner_id: string;
  name: string;
  birth_year: number | null;
  size: UserDogModel['size'];
  personality_tags: string[] | null;
  sociality_tags: string[] | null;
  walk_tags: string[] | null;
  notes_public: string | null;
  notes_private: string | null;
  visibility: UserDogModel['visibility'];
  moderation_status: UserDogModel['moderationStatus'];
  created_at: string;
  updated_at: string;
}

export interface AuthAccountSnapshot {
  session: Session | null;
  user: User | null;
  profile: UserProfileModel | null;
  dogs: UserDogModel[];
}

export interface DogDraftInput {
  id?: string;
  name: string;
  birthYear?: number | null;
  size?: UserDogModel['size'];
  personalityTags: string[];
  socialityTags: string[];
  walkTags: string[];
  notesPublic?: string | null;
  notesPrivate?: string | null;
  visibility?: UserDogModel['visibility'];
}

export function normalizeError(error: unknown): string {
  if (!error) {
    return 'Errore sconosciuto';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return JSON.stringify(error);
}

function assertSupabaseClient() {
  const client = getSupabaseClient();
  if (!hasSupabaseConfig || !client) {
    throw new Error('Supabase non configurato: controlla .env e supabase-doctor.');
  }
  return client;
}

function remoteProfileToModel(row: RemoteProfileRow): UserProfileModel {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    cityLabel: row.city_label,
    isVerifiedEmail: row.is_verified_email,
    isVerifiedPhone: row.is_verified_phone,
    trustScore: row.trust_score,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function remoteDogToModel(row: RemoteDogRow): UserDogModel {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    birthYear: row.birth_year,
    size: row.size,
    personalityTags: row.personality_tags ?? [],
    socialityTags: row.sociality_tags ?? [],
    walkTags: row.walk_tags ?? [],
    notesPublic: row.notes_public,
    notesPrivate: row.notes_private,
    visibility: row.visibility,
    moderationStatus: row.moderation_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCurrentSession(): Promise<Session | null> {
  const client = assertSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw new Error(normalizeError(error));
  }
  return data.session;
}

export async function sendEmailLogin(email: string): Promise<string> {
  const client = assertSupabaseClient();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Inserisci una email valida.');
  }

  const { error } = await client.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) {
    throw new Error(normalizeError(error));
  }

  return `Email inviata a ${cleanEmail}. Usa il link magico o inserisci il codice OTP se il template email lo mostra.`;
}

export async function verifyEmailOtp(email: string, token: string): Promise<Session | null> {
  const client = assertSupabaseClient();
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim().replace(/\s+/g, '');

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Inserisci la stessa email usata per richiedere il codice.');
  }

  if (cleanToken.length < 4) {
    throw new Error('Inserisci il codice OTP ricevuto via email.');
  }

  const { data, error } = await client.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: 'email',
  });

  if (error) {
    throw new Error(normalizeError(error));
  }

  return data.session;
}

export async function signOut(): Promise<void> {
  const client = assertSupabaseClient();
  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function ensureCurrentProfile(displayName?: string): Promise<UserProfileModel> {
  const client = assertSupabaseClient();
  const { data, error } = await client.rpc('ensure_current_profile', {
    display_name_input: displayName?.trim() || null,
    city_slug_input: 'venezia-mestre',
  });

  if (error) {
    throw new Error(normalizeError(error));
  }

  if (!data) {
    throw new Error('Profilo non restituito da Supabase.');
  }

  return remoteProfileToModel(data as RemoteProfileRow);
}

export async function fetchMyProfile(userId: string): Promise<UserProfileModel | null> {
  const client = assertSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .select('id, user_id, display_name, city_label, is_verified_email, is_verified_phone, trust_score, status, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(normalizeError(error));
  }

  return data ? remoteProfileToModel(data as RemoteProfileRow) : null;
}

export async function fetchMyDogs(profileId: string): Promise<UserDogModel[]> {
  const client = assertSupabaseClient();
  const { data, error } = await client
    .from('dogs')
    .select('id, owner_id, name, birth_year, size, personality_tags, sociality_tags, walk_tags, notes_public, notes_private, visibility, moderation_status, created_at, updated_at')
    .eq('owner_id', profileId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(normalizeError(error));
  }

  return ((data ?? []) as RemoteDogRow[]).map(remoteDogToModel);
}

export async function fetchAccountSnapshot(): Promise<AuthAccountSnapshot> {
  const session = await getCurrentSession();
  const user = session?.user ?? null;

  if (!user) {
    return { session: null, user: null, profile: null, dogs: [] };
  }

  const profile = (await fetchMyProfile(user.id)) ?? (await ensureCurrentProfile());
  const dogs = await fetchMyDogs(profile.id);

  return { session, user, profile, dogs };
}

export async function saveDog(profileId: string, dog: DogDraftInput): Promise<UserDogModel> {
  const client = assertSupabaseClient();
  const cleanName = dog.name.trim();
  if (!cleanName) {
    throw new Error('Il nome del cane e\' obbligatorio.');
  }

  const payload = {
    owner_id: profileId,
    name: cleanName,
    birth_year: dog.birthYear ?? null,
    size: dog.size ?? null,
    personality_tags: dog.personalityTags,
    sociality_tags: dog.socialityTags,
    walk_tags: dog.walkTags,
    notes_public: dog.notesPublic?.trim() || null,
    notes_private: dog.notesPrivate?.trim() || null,
    visibility: dog.visibility ?? 'public',
    moderation_status: 'approved' as const,
  };

  const query = dog.id
    ? client.from('dogs').update(payload).eq('id', dog.id).select('id, owner_id, name, birth_year, size, personality_tags, sociality_tags, walk_tags, notes_public, notes_private, visibility, moderation_status, created_at, updated_at').single()
    : client.from('dogs').insert(payload).select('id, owner_id, name, birth_year, size, personality_tags, sociality_tags, walk_tags, notes_public, notes_private, visibility, moderation_status, created_at, updated_at').single();

  const { data, error } = await query;

  if (error) {
    throw new Error(normalizeError(error));
  }

  return remoteDogToModel(data as RemoteDogRow);
}
