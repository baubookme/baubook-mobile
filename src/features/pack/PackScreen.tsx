import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { baubookImages } from '../../shared/assets/images';
import { useAuthAccount } from '../../shared/auth/AuthProvider';
import { addDogFriend, fetchDogFriends, MAX_DOG_FRIENDS, removeDogFriend, searchDogFriendCandidates, type DogFriendModel, type DogFriendSearchResult } from '../../shared/api/dogFriends';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { Tag } from '../../shared/components/Tag';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';
import type { TabKey } from '../../shared/types/domain';

interface PackScreenProps {
  onNavigate: (tab: TabKey) => void;
}

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

function avatarSource(uri: string | null | undefined) {
  return uri ? { uri } : baubookImages.avatar;
}

export function PackScreen({ onNavigate }: PackScreenProps) {
  const auth = useAuthAccount();
  const [selectedDogId, setSelectedDogId] = useState<string | null>(auth.dogs[0]?.id ?? null);
  const [friends, setFriends] = useState<DogFriendModel[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DogFriendSearchResult[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [searchStatus, setSearchStatus] = useState<LoadStatus>('idle');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const selectedDog = useMemo(() => auth.dogs.find((dog) => dog.id === selectedDogId) ?? auth.dogs[0] ?? null, [auth.dogs, selectedDogId]);
  const profileReady = auth.isSignedIn && Boolean(auth.profile);
  const dogReady = auth.dogs.length > 0;
  const friendLimitReached = friends.length >= MAX_DOG_FRIENDS;
  const cleanQuery = query.trim();
  const canSearch = Boolean(profileReady && selectedDog && cleanQuery.length >= 2 && searchStatus !== 'loading');

  useEffect(() => {
    if (!auth.dogs.length) {
      setSelectedDogId(null);
      return;
    }

    if (!selectedDogId || !auth.dogs.some((dog) => dog.id === selectedDogId)) {
      setSelectedDogId(auth.dogs[0].id);
    }
  }, [auth.dogs, selectedDogId]);

  const loadFriends = useCallback(async () => {
    if (!selectedDog) {
      setFriends([]);
      setStatus('idle');
      return;
    }

    try {
      setStatus('loading');
      const nextFriends = await fetchDogFriends(selectedDog.id);
      setFriends(nextFriends);
      setStatus('ready');
      setErrorMessage(undefined);
    }
    catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'BauBook friends non caricati.');
    }
  }, [selectedDog]);

  useEffect(() => {
    void loadFriends();
  }, [loadFriends]);

  const handleSearch = useCallback(async () => {
    if (!selectedDog || !canSearch) {
      if (cleanQuery.length > 0 && cleanQuery.length < 2) {
        setMessage('Scrivi almeno 2 caratteri per cercare.');
      }
      return;
    }

    try {
      setSearchStatus('loading');
      setMessage('');
      const nextResults = await searchDogFriendCandidates({ dogId: selectedDog.id, query: cleanQuery, limit: 8 });
      setResults(nextResults);
      setSearchStatus('ready');
      setErrorMessage(undefined);
      setMessage(nextResults.length ? `${nextResults.length} risultato/i trovati.` : 'Nessun BauBook friend trovato con questa ricerca.');
    }
    catch (error) {
      setSearchStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Ricerca BauBook friends non riuscita.');
    }
  }, [canSearch, cleanQuery, selectedDog]);

  const handleAdd = useCallback(async (candidate: DogFriendSearchResult) => {
    if (!auth.profile || !selectedDog) {
      setErrorMessage('Prima completa profilo umano e profilo cane.');
      return;
    }

    if (friendLimitReached) {
      setMessage(`Hai gia ${MAX_DOG_FRIENDS} BauBook friends: rimuovine uno per aggiungerne un altro.`);
      return;
    }

    try {
      setSearchStatus('loading');
      await addDogFriend({
        ownerId: auth.profile.id,
        dogId: selectedDog.id,
        friendOwnerId: candidate.ownerId,
        friendDogId: candidate.dogId,
      });
      setResults((current) => current.filter((item) => item.dogId !== candidate.dogId));
      setMessage(`${candidate.dogName} aggiunto ai BauBook friends.`);
      setErrorMessage(undefined);
      await loadFriends();
      setSearchStatus('ready');
    }
    catch (error) {
      setSearchStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Aggiunta BauBook friend non riuscita.');
    }
  }, [auth.profile, friendLimitReached, loadFriends, selectedDog]);

  const handleRemove = useCallback(async (friend: DogFriendModel) => {
    try {
      setStatus('loading');
      await removeDogFriend(friend.id);
      setFriends((current) => current.filter((item) => item.id !== friend.id));
      setMessage(`${friend.friendDogName} rimosso dai BauBook friends.`);
      setErrorMessage(undefined);
      setStatus('ready');
    }
    catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Rimozione BauBook friend non riuscita.');
    }
  }, []);

  return (
    <Screen>
      <AppCard tone="teal">
        <View style={styles.heroRow}>
          <View style={styles.heroImageFrame}>
            <Image source={baubookImages.pack.dogFriends} style={styles.heroPackImage} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Branco</Text>
            <Text style={styles.title}>{selectedDog ? `Amici del ❤️` : 'Il branco BauBook'}</Text>
            <Text style={styles.bodyText}>Aggiungi fino a {MAX_DOG_FRIENDS} amici BauBook cercando per nome utente o 🐕.</Text>
          </View>
        </View>
      </AppCard>

      {!profileReady || !dogReady ? (
        <AppCard elevated={false}>
          <View style={styles.sectionTitleRow}>
            <IconBubble source={baubookImages.icons.dogProfile} tone="warm" />
            <View style={styles.flexOne}>
              <Text style={styles.cardTitle}>Prima crea il profilo</Text>
              <Text style={styles.bodyText}>Per usare BauBook friends serve un account BauBook attivo e almeno un profilo 🐶.</Text>
            </View>
          </View>
          <View style={styles.quickActions}>
            <AppButton label="Setup" variant="secondary" icon={baubookImages.icons.profileGear} onPress={() => onNavigate('profile')} />
            <AppButton label="Io sono" icon={baubookImages.icons.dogProfile} onPress={() => onNavigate('dog')} />
          </View>
        </AppCard>
      ) : null}

      {dogReady ? (
        <AppCard elevated={false}>
          <View style={styles.sectionTitleRow}>
            <IconBubble source={baubookImages.icons.friends} tone="teal" />
            <View style={styles.flexOne}>
              <Text style={styles.cardTitle}>BauBook friends</Text>
              <Text style={styles.bodyText}>Cerca e gestisci la tua lista amici. Max {MAX_DOG_FRIENDS}.</Text>
            </View>
            <Tag label={`${friends.length}/${MAX_DOG_FRIENDS}`} tone={friendLimitReached ? 'orange' : 'green'} />
          </View>

          {auth.dogs.length > 1 ? (
            <View style={styles.dogSelector}>
              {auth.dogs.map((dog) => {
                const selected = dog.id === selectedDog?.id;
                return (
                  <Pressable key={dog.id} onPress={() => setSelectedDogId(dog.id)} style={({ pressed }) => [styles.dogChip, selected && styles.dogChipSelected, pressed && styles.pressed]}>
                    <Image source={avatarSource(dog.avatarUrl)} style={styles.chipAvatar} />
                    <Text style={[styles.dogChipText, selected && styles.dogChipTextSelected]}>{dog.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={styles.searchBox}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Cerca per nome utente o 🐕"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => void handleSearch()}
              style={styles.input}
            />
            <AppButton label={searchStatus === 'loading' ? 'Cerco...' : 'Cerca'} icon={baubookImages.icons.search} onPress={handleSearch} disabled={!canSearch} />
          </View>

          {friendLimitReached ? (
            <Text style={styles.limitText}>Lista piena: rimuovi un amico per aggiungerne uno nuovo.</Text>
          ) : null}

          {results.length ? (
            <View style={styles.resultList}>
              {results.map((result) => (
                <View key={result.dogId} style={styles.friendRow}>
                  <Image source={avatarSource(result.avatarUrl)} style={styles.friendAvatar} />
                  <View style={styles.friendCopy}>
                    <Text style={styles.friendName}>🐾 {result.dogName}</Text>
                    {result.cityLabel ? <Text style={styles.friendMeta}>📍 {result.cityLabel}</Text> : null}
                    {result.tags.length ? (
                      <View style={styles.tagsRow}>
                        {result.tags.map((tag) => <Tag key={tag} label={tag} tone="teal" />)}
                      </View>
                    ) : null}
                  </View>
                  <AppButton label="Aggiungi" variant="secondary" onPress={() => void handleAdd(result)} disabled={friendLimitReached || searchStatus === 'loading'} />
                </View>
              ))}
            </View>
          ) : null}
        </AppCard>
      ) : null}

      {dogReady ? (
        <AppCard tone="warm">
          <View style={styles.sectionTitleRow}>
            <IconBubble source={baubookImages.icons.favorites} tone="warm" />
            <View style={styles.flexOne}>
              <Text style={styles.cardTitle}>Amici del tuo 🐶</Text>
              <Text style={styles.bodyText}>{status === 'loading' ? 'Caricamento lista...' : friends.length ? 'Il piccolo branco salvato su BauBook.' : 'Nessun BauBook friend ancora aggiunto.'}</Text>
            </View>
          </View>

          <View style={styles.friendList}>
            {friends.map((friend) => (
              <View key={friend.id} style={styles.friendRow}>
                <Image source={avatarSource(friend.friendDogAvatarUrl)} style={styles.friendAvatar} />
                <View style={styles.friendCopy}>
                  <Text style={styles.friendName}>🐾 {friend.friendDogName}</Text>
                  {friend.friendCityLabel ? <Text style={styles.friendMeta}>📍 {friend.friendCityLabel}</Text> : null}
                  {friend.friendTags.length ? (
                    <View style={styles.tagsRow}>
                      {friend.friendTags.map((tag) => <Tag key={tag} label={tag} tone="teal" />)}
                    </View>
                  ) : null}
                </View>
                <AppButton label="Rimuovi" variant="ghost" onPress={() => void handleRemove(friend)} disabled={status === 'loading'} />
              </View>
            ))}
          </View>
        </AppCard>
      ) : null}

      {message ? <Text style={styles.infoText}>{message}</Text> : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  heroImageFrame: {
    width: 112,
    height: 112,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroPackImage: {
    width: 112,
    height: 112,
    resizeMode: 'cover',
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: typography.h1,
    fontWeight: '900',
  },
  bodyText: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  flexOne: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: typography.h2,
    fontWeight: '900',
  },
  quickActions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dogSelector: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dogChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dogChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.tealSoft,
  },
  chipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  dogChipText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  dogChipTextSelected: {
    color: colors.primaryDark,
  },
  searchBox: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '700',
  },
  resultList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  friendList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.76)',
    padding: spacing.md,
  },
  friendAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    resizeMode: 'cover',
  },
  friendCopy: {
    flex: 1,
    gap: 3,
  },
  friendName: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  friendMeta: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '800',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  limitText: {
    marginTop: spacing.sm,
    color: colors.primaryDark,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '900',
  },
  infoText: {
    color: colors.primaryDark,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
});
