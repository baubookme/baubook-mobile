import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchDogFriends, type DogFriendModel } from '../../../shared/api/dogFriends';
import { useAuthAccount } from '../../../shared/auth/AuthProvider';
import { getSupabaseClient } from '../../../shared/lib/supabase';
import { colors, radius, shadows, spacing, typography } from '../../../shared/theme/theme';
import type { TabKey } from '../../../shared/types/domain';

const packDiaryIcon = require('../../../../assets/baubook/cartoon-icons/home_today_pilot.png');
const friendFallbackAvatar = require('../../../../assets/baubook/brand/avatar_instagram_round.png');
const recordOpenIcon = require('../../../../assets/baubook/home/pack_diary_record_open.png');

type Relation<T> = T | T[] | null | undefined;

type RelatedDogRow = {
  name?: string | null;
  avatar_url?: string | null;
};

type RelatedPlaceRow = {
  name?: string | null;
};

type RemoteWalkRow = {
  id: string;
  dog_id: string | null;
  owner_id: string | null;
  place_id: string | null;
  starts_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  location_label: string | null;
  message: string | null;
  dogs?: Relation<RelatedDogRow>;
  places?: Relation<RelatedPlaceRow>;
};

type RemotePresenceRow = {
  id: string;
  dog_id: string | null;
  profile_id: string | null;
  place_id: string | null;
  status: string | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  location_label: string | null;
  message: string | null;
  dogs?: Relation<RelatedDogRow>;
  places?: Relation<RelatedPlaceRow>;
};

type LastPackActivity = {
  id: string;
  title: string;
  meta: string;
};

type PackFriendLiveItem = {
  id: string;
  dogId: string;
  dogName: string;
  avatarUrl: string | null;
  kind: 'walk' | 'presence';
};

type PackDiaryState = {
  lastWalk: LastPackActivity | null;
  lastPresence: LastPackActivity | null;
  walkingFriends: PackFriendLiveItem[];
  presentFriends: PackFriendLiveItem[];
  source: 'idle' | 'supabase' | 'empty' | 'fallback';
  message: string;
};

const emptyPackDiaryState: PackDiaryState = {
  lastWalk: null,
  lastPresence: null,
  walkingFriends: [],
  presentFriends: [],
  source: 'idle',
  message: '',
};

function firstRelation<T>(value: Relation<T>): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  if (sameDay(date, today)) {
    return `oggi alle ${time}`;
  }

  if (sameDay(date, yesterday)) {
    return `ieri alle ${time}`;
  }

  return `${date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} alle ${time}`;
}

function formatPlace(locationLabel?: string | null, placeName?: string | null): string {
  return locationLabel?.trim() || placeName?.trim() || 'luogo BauBook';
}

function makeWalkActivity(row: RemoteWalkRow): LastPackActivity {
  const dog = firstRelation(row.dogs);
  const place = firstRelation(row.places);
  const dogName = dog?.name?.trim() || 'Il tuo cane';
  const placeLabel = formatPlace(row.location_label, place?.name);
  const dateLabel = formatDateTime(row.created_at || row.starts_at || row.updated_at);

  return {
    id: row.id,
    title: `${dogName} - ${placeLabel}`,
    meta: dateLabel || 'orario non disponibile',
  };
}

function makePresenceActivity(row: RemotePresenceRow): LastPackActivity {
  const dog = firstRelation(row.dogs);
  const place = firstRelation(row.places);
  const dogName = dog?.name?.trim() || 'Il tuo cane';
  const placeLabel = formatPlace(row.location_label, place?.name);
  const dateLabel = formatDateTime(row.created_at || row.updated_at);

  return {
    id: row.id,
    title: `${dogName} - ${placeLabel}`,
    meta: dateLabel || 'orario non disponibile',
  };
}

function friendFromWalk(row: RemoteWalkRow, friendsByDogId: Map<string, DogFriendModel>): PackFriendLiveItem | null {
  if (!row.dog_id) {
    return null;
  }

  const friend = friendsByDogId.get(row.dog_id);
  const dog = firstRelation(row.dogs);
  const dogName = friend?.friendDogName || dog?.name || 'Bau amico';
  const avatarUrl = friend?.friendDogAvatarUrl || dog?.avatar_url || null;

  return {
    id: row.id,
    dogId: row.dog_id,
    dogName,
    avatarUrl,
    kind: 'walk',
  };
}

function friendFromPresence(row: RemotePresenceRow, friendsByDogId: Map<string, DogFriendModel>): PackFriendLiveItem | null {
  if (!row.dog_id) {
    return null;
  }

  const friend = friendsByDogId.get(row.dog_id);
  const dog = firstRelation(row.dogs);
  const dogName = friend?.friendDogName || dog?.name || 'Bau amico';
  const avatarUrl = friend?.friendDogAvatarUrl || dog?.avatar_url || null;

  return {
    id: row.id,
    dogId: row.dog_id,
    dogName,
    avatarUrl,
    kind: 'presence',
  };
}

function uniqueByDog(items: PackFriendLiveItem[]): PackFriendLiveItem[] {
  const seen = new Set<string>();
  const result: PackFriendLiveItem[] = [];

  items.forEach((item) => {
    if (seen.has(item.dogId)) {
      return;
    }
    seen.add(item.dogId);
    result.push(item);
  });

  return result;
}

async function loadPackDiaryState(profileId: string, dogId: string): Promise<PackDiaryState> {
  const client = getSupabaseClient();

  if (!client) {
    return {
      ...emptyPackDiaryState,
      source: 'fallback',
      message: 'Supabase non configurato.',
    };
  }

  const friends = await fetchDogFriends(dogId);
  const friendDogIds = friends.map((friend) => friend.friendDogId).filter(Boolean);
  const friendsByDogId = new Map(friends.map((friend) => [friend.friendDogId, friend]));

  const { data: ownWalkRows, error: ownWalkError } = await client
    .from('walk_plans')
    .select('id,dog_id,owner_id,place_id,starts_at,created_at,updated_at,location_label,message,dogs(name,avatar_url),places(name)')
    .eq('owner_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (ownWalkError) {
    throw ownWalkError;
  }

  const { data: ownPresenceRows, error: ownPresenceError } = await client
    .from('presence_sessions')
    .select('id,dog_id,profile_id,place_id,status,expires_at,created_at,updated_at,location_label,message,dogs(name,avatar_url),places(name)')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (ownPresenceError) {
    throw ownPresenceError;
  }

  let walkingFriends: PackFriendLiveItem[] = [];
  let presentFriends: PackFriendLiveItem[] = [];

  if (friendDogIds.length > 0) {
    const { data: friendWalkRows, error: friendWalkError } = await client
      .from('walk_plans')
      .select('id,dog_id,owner_id,place_id,starts_at,created_at,updated_at,location_label,message,dogs(name,avatar_url),places(name)')
      .in('dog_id', friendDogIds)
      .eq('active', true)
      .order('starts_at', { ascending: false })
      .limit(20);

    if (friendWalkError) {
      throw friendWalkError;
    }

    const { data: friendPresenceRows, error: friendPresenceError } = await client
      .from('presence_sessions')
      .select('id,dog_id,profile_id,place_id,status,expires_at,created_at,updated_at,location_label,message,dogs(name,avatar_url),places(name)')
      .in('dog_id', friendDogIds)
      .eq('active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (friendPresenceError) {
      throw friendPresenceError;
    }

    walkingFriends = uniqueByDog(
      ((friendWalkRows ?? []) as RemoteWalkRow[])
        .map((row) => friendFromWalk(row, friendsByDogId))
        .filter((item): item is PackFriendLiveItem => Boolean(item)),
    );

    presentFriends = uniqueByDog(
      ((friendPresenceRows ?? []) as RemotePresenceRow[])
        .map((row) => friendFromPresence(row, friendsByDogId))
        .filter((item): item is PackFriendLiveItem => Boolean(item)),
    );
  }

  const lastWalkRow = ((ownWalkRows ?? []) as RemoteWalkRow[])[0] ?? null;
  const lastPresenceRow = ((ownPresenceRows ?? []) as RemotePresenceRow[])[0] ?? null;

  return {
    lastWalk: lastWalkRow ? makeWalkActivity(lastWalkRow) : null,
    lastPresence: lastPresenceRow ? makePresenceActivity(lastPresenceRow) : null,
    walkingFriends,
    presentFriends,
    source: 'supabase',
    message: friends.length ? `${friends.length} amici del branco collegati.` : 'Aggiungi amici dal Branco per vedere chi è in giro.',
  };
}

function ActivityLine({ label, activity }: { label: string; activity: LastPackActivity | null }) {
  return (
    <View style={styles.activityBox}>
      <Text style={styles.activityLabel}>{label}</Text>
      <Text style={[styles.activityValue, !activity && styles.activityValueEmpty]}>
        {activity?.title ?? 'Nessun evento da visualizzare'}
      </Text>
      {activity ? <Text style={styles.activityMeta}>{activity.meta}</Text> : null}
    </View>
  );
}

function FriendAvatar({ item }: { item: PackFriendLiveItem }) {
  return (
    <Image
      source={item.avatarUrl ? { uri: item.avatarUrl } : friendFallbackAvatar}
      style={styles.friendAvatar}
    />
  );
}

function CollapsibleFriends({
  title,
  items,
  expanded,
  onToggle,
  onOpenItem,
}: {
  title: string;
  items: PackFriendLiveItem[];
  expanded: boolean;
  onToggle: () => void;
  onOpenItem: (item: PackFriendLiveItem) => void;
}) {
  const count = items.length;

  return (
    <View style={styles.friendsBox}>
      <Pressable onPress={onToggle} style={({ pressed }) => [styles.friendsHeader, pressed && styles.pressed]}>
        <Text style={styles.friendsTitle}>{title}: {count}</Text>
        <Text style={styles.friendsToggle}>{expanded ? 'Nascondi' : 'Mostra'}</Text>
      </Pressable>

      {expanded ? (
        count > 0 ? (
          <View style={styles.friendList}>
            {items.map((item) => (
              <View key={`${item.kind}-${item.id}`} style={styles.friendRow}>
                <FriendAvatar item={item} />
                <Text style={styles.friendName}>{item.dogName}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Apri Passeggiate e Presenze per ${item.dogName}`}
                  hitSlop={8}
                  onPress={() => onOpenItem(item)}
                  style={({ pressed }) => [styles.friendAction, pressed && styles.pressed]}
                >
                  <Image source={recordOpenIcon} style={styles.friendActionIcon} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyInline}>Nessun amico del branco in questo stato.</Text>
        )
      ) : null}
    </View>
  );
}

type HomeDogDiaryLiteProps = {
  onNavigate?: (tab: TabKey) => void;
};

export function HomeDogDiaryLite({ onNavigate }: HomeDogDiaryLiteProps) {
  const auth = useAuthAccount();
  const profileId = auth.profile?.id ?? '';
  const dogId = auth.dogs[0]?.id ?? '';
  const [state, setState] = useState<PackDiaryState>(emptyPackDiaryState);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [walkFriendsOpen, setWalkFriendsOpen] = useState(false);
  const [presenceFriendsOpen, setPresenceFriendsOpen] = useState(false);

  const canLoad = Boolean(profileId && dogId);

  const refresh = useCallback(async () => {
    if (!canLoad) {
      setState({
        ...emptyPackDiaryState,
        source: 'empty',
        message: 'Completa profilo e cane per attivare il Diario smart del branco.',
      });
      setErrorMessage('');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const nextState = await loadPackDiaryState(profileId, dogId);
      setState(nextState);
    } catch (error) {
      setState({
        ...emptyPackDiaryState,
        source: 'fallback',
        message: 'Non riesco a leggere il branco ora.',
      });
      setErrorMessage(error instanceof Error ? error.message : 'Errore temporaneo nel Diario smart del branco.');
    } finally {
      setLoading(false);
    }
  }, [canLoad, dogId, profileId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const statusLabel = useMemo(() => {
    if (loading) {
      return 'Aggiorno il branco...';
    }
    return state.message || 'Il riepilogo live del branco appare qui.';
  }, [loading, state.message]);

  const handleOpenActivity = useCallback(
    (_item: PackFriendLiveItem) => {
      onNavigate?.('walks');
    },
    [onNavigate],
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Image source={packDiaryIcon} style={styles.titleIcon} />

        <View style={styles.headerMain}>
          <View style={styles.titleButtonRow}>
            <Text style={styles.titleText}>{'Diario smart\ndel branco'}</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aggiorna Diario smart del branco"
              disabled={loading}
              onPress={refresh}
              style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed, loading && styles.refreshButtonDisabled]}
            >
              <Text style={styles.refreshText}>{loading ? '...' : 'Aggiorna'}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Text style={styles.statusText}>{statusLabel}</Text>

      <View style={styles.activityGrid}>
        <ActivityLine label="Ultima passeggiata inserita" activity={state.lastWalk} />
        <ActivityLine label="Ultima presenza attivata" activity={state.lastPresence} />
      </View>

      <CollapsibleFriends
        title="Amici del branco in passeggiata"
        items={state.walkingFriends}
        expanded={walkFriendsOpen}
        onToggle={() => setWalkFriendsOpen((current) => !current)}
        onOpenItem={handleOpenActivity}
      />

      <CollapsibleFriends
        title="Amici del branco presenti"
        items={state.presentFriends}
        expanded={presenceFriendsOpen}
        onToggle={() => setPresenceFriendsOpen((current) => !current)}
        onOpenItem={handleOpenActivity}
      />

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

export default HomeDogDiaryLite;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#fffaf3',
    borderWidth: 1,
    borderColor: '#eadfce',
    gap: spacing.md,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleIcon: {
    width: 104,
    height: 104,
    marginLeft: -16,
    marginRight: -8,
    marginVertical: -16,
    resizeMode: 'contain',
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  titleButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleText: {
    flex: 1,
    minWidth: 0,
    color: colors.ink,
    fontSize: 20,
    lineHeight: 23,
    fontWeight: '900',
  },
  refreshButton: {
    minWidth: 108,
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  refreshButtonDisabled: {
    opacity: 0.62,
  },
  refreshText: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  statusText: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '800',
  },
  activityGrid: {
    gap: spacing.sm,
  },
  activityBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: 4,
  },
  activityLabel: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  activityValue: {
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 21,
    fontWeight: '900',
  },
  activityValueEmpty: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '800',
  },
  activityMeta: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '800',
  },
  friendsBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fffdf8',
    overflow: 'hidden',
  },
  friendsHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  friendsTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 21,
    fontWeight: '900',
  },
  friendsToggle: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  friendList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    minHeight: 76,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
    resizeMode: 'cover',
  },
  friendName: {
    flex: 1,
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '900',
  },
  friendAction: {
    width: 84,
    height: 58,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  friendActionIcon: {
    width: 82,
    height: 52,
    resizeMode: 'contain',
  },
  emptyInline: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '800',
    padding: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
