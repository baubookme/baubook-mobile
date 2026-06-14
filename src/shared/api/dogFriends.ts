import { hasSupabaseConfig } from '../lib/env';
import { getSupabaseClient } from '../lib/supabase';
import { normalizeError } from './authAccount';

export const MAX_DOG_FRIENDS = 10;

export interface DogFriendModel {
  id: string;
  dogId: string;
  friendOwnerId: string;
  friendDogId: string;
  friendDogName: string;
  friendDogAvatarUrl: string | null;
  friendCityLabel: string | null;
  friendTags: string[];
  createdAt: string;
}

export interface DogFriendSearchResult {
  dogId: string;
  ownerId: string;
  dogName: string;
  avatarUrl: string | null;
  cityLabel: string | null;
  tags: string[];
}

interface RemoteDogFriendRow {
  friendship_id: string;
  dog_id: string;
  friend_owner_id: string;
  friend_dog_id: string;
  friend_dog_name: string;
  friend_dog_avatar_url: string | null;
  friend_city_label: string | null;
  friend_tags: string[] | null;
  created_at: string;
}

interface RemoteDogFriendSearchRow {
  dog_id: string;
  owner_id: string;
  dog_name: string;
  avatar_url: string | null;
  city_label: string | null;
  tags: string[] | null;
}

function assertSupabaseClient() {
  const client = getSupabaseClient();
  if (!hasSupabaseConfig || !client) {
    throw new Error('Supabase non configurato: controlla .env e supabase-doctor.');
  }
  return client;
}

function normalizeTags(tags: string[] | null | undefined): string[] {
  return (tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function remoteFriendToModel(row: RemoteDogFriendRow): DogFriendModel {
  return {
    id: row.friendship_id,
    dogId: row.dog_id,
    friendOwnerId: row.friend_owner_id,
    friendDogId: row.friend_dog_id,
    friendDogName: row.friend_dog_name,
    friendDogAvatarUrl: row.friend_dog_avatar_url,
    friendCityLabel: row.friend_city_label,
    friendTags: normalizeTags(row.friend_tags),
    createdAt: row.created_at,
  };
}

function remoteSearchToModel(row: RemoteDogFriendSearchRow): DogFriendSearchResult {
  return {
    dogId: row.dog_id,
    ownerId: row.owner_id,
    dogName: row.dog_name,
    avatarUrl: row.avatar_url,
    cityLabel: row.city_label,
    tags: normalizeTags(row.tags),
  };
}

export async function fetchDogFriends(dogId: string): Promise<DogFriendModel[]> {
  if (!dogId) {
    return [];
  }

  const client = assertSupabaseClient();
  const { data, error } = await client.rpc('list_dog_friends', {
    dog_id_input: dogId,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }

  return ((data ?? []) as RemoteDogFriendRow[]).map(remoteFriendToModel);
}

export async function searchDogFriendCandidates(input: {
  dogId: string;
  query: string;
  limit?: number;
}): Promise<DogFriendSearchResult[]> {
  const cleanQuery = input.query.trim();

  if (!input.dogId || cleanQuery.length < 2) {
    return [];
  }

  const client = assertSupabaseClient();
  const { data, error } = await client.rpc('search_dog_friend_candidates', {
    dog_id_input: input.dogId,
    query_input: cleanQuery,
    limit_input: input.limit ?? 8,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }

  return ((data ?? []) as RemoteDogFriendSearchRow[]).map(remoteSearchToModel);
}

export async function addDogFriend(input: {
  ownerId: string;
  dogId: string;
  friendOwnerId: string;
  friendDogId: string;
}): Promise<void> {
  const client = assertSupabaseClient();
  const { error } = await client.from('dog_friends').insert({
    owner_id: input.ownerId,
    dog_id: input.dogId,
    friend_owner_id: input.friendOwnerId,
    friend_dog_id: input.friendDogId,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function removeDogFriend(friendshipId: string): Promise<void> {
  if (!friendshipId) {
    return;
  }

  const client = assertSupabaseClient();
  const { error } = await client.from('dog_friends').delete().eq('id', friendshipId);

  if (error) {
    throw new Error(normalizeError(error));
  }
}
