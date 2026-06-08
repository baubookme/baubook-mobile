import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { baubookImages } from '../../shared/assets/images';
import { useAuthAccount } from '../../shared/auth/AuthProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { Tag } from '../../shared/components/Tag';
import { useSupabasePlaces } from '../../shared/hooks/useSupabasePublicData';
import { useWalksBoard } from '../../shared/hooks/useWalksBoard';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';

const startOptions = [
  { label: 'Tra 30 min', minutes: 30 },
  { label: 'Tra 1 ora', minutes: 60 },
  { label: 'Tra 2 ore', minutes: 120 },
  { label: 'Domani mattina', minutes: 18 * 60 },
];

const presenceOptions: Array<{ label: string; status: 'available' | 'walking' | 'playing' }> = [
  { label: 'Accetto compagnia', status: 'available' },
  { label: 'Sto passeggiando', status: 'walking' },
  { label: 'Sto giocando', status: 'playing' },
];

export function WalksScreen() {
  const auth = useAuthAccount();
  const placesState = useSupabasePlaces();
  const walksBoard = useWalksBoard(auth.profile?.id);

  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState(60);
  const [acceptsCompany, setAcceptsCompany] = useState(true);
  const [message, setMessage] = useState('Passeggiata tranquilla, annusata contemplativa.');
  const [presenceStatus, setPresenceStatus] = useState<'available' | 'walking' | 'playing'>('walking');

  const livePlaces = useMemo(() => placesState.places.filter((place) => place.moderationStatus !== 'removed'), [placesState.places]);
  const selectedDog = auth.dogs.find((dog) => dog.id === selectedDogId) ?? auth.dogs[0] ?? null;
  const selectedPlace = livePlaces.find((place) => place.id === selectedPlaceId) ?? livePlaces[0] ?? null;
  const canUseLiveWrites = auth.isSignedIn && Boolean(auth.profile) && Boolean(selectedDog) && Boolean(selectedPlace) && placesState.source === 'supabase';

  useEffect(() => {
    if (!selectedDogId && auth.dogs[0]?.id) {
      setSelectedDogId(auth.dogs[0].id);
    }
  }, [auth.dogs, selectedDogId]);

  useEffect(() => {
    if (!selectedPlaceId && livePlaces[0]?.id) {
      setSelectedPlaceId(livePlaces[0].id);
    }
  }, [livePlaces, selectedPlaceId]);

  const startsAtIso = useMemo(() => new Date(Date.now() + selectedMinutes * 60000).toISOString(), [selectedMinutes]);
  const startsAtPreview = useMemo(() => new Date(startsAtIso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }), [startsAtIso]);

  const handleCreateWalk = () => {
    if (!canUseLiveWrites || !selectedDog || !selectedPlace) {
      return;
    }

    void walksBoard.createPlan({
      dogId: selectedDog.id,
      placeId: selectedPlace.id,
      startsAtIso,
      message,
      acceptsCompany,
    });
  };

  const handleStartPresence = () => {
    if (!canUseLiveWrites || !selectedDog || !selectedPlace) {
      return;
    }

    void walksBoard.startPresence({
      dogId: selectedDog.id,
      placeId: selectedPlace.id,
      status: presenceStatus,
      message,
      expiresMinutes: 90,
    });
  };

  return (
    <Screen>
      <SectionHeader
        eyebrow="So chi c'è"
        title="Passeggiate vere, ma senza live tracking invadente"
        description="Ora BauBook crea appuntamenti temporanei su Supabase: luogo, cane, orario, messaggio e presenza soft. Niente posizione continua di default."
      />

      <AppCard tone="warm">
        <View style={styles.headerRow}>
          <IconBubble source={baubookImages.icons.checkin} size={66} tone="plain" />
          <View style={styles.headerCopy}>
            <Text style={styles.cardTitle}>Io sono qui... più o meno.</Text>
            <Text style={styles.bodyText}>La sessione resta persistente. Se chiudi e riapri l'app, Supabase dovrebbe ricaricare automaticamente il tuo account.</Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <Tag label={auth.isSignedIn ? 'utente loggato' : 'login richiesto'} tone={auth.isSignedIn ? 'green' : 'orange'} />
          <Tag label={placesState.source === 'supabase' ? 'luoghi live' : 'luoghi demo'} tone={placesState.source === 'supabase' ? 'green' : 'orange'} />
          <Tag label={walksBoard.source === 'supabase' ? 'passeggiate live' : 'fallback demo'} tone={walksBoard.source === 'supabase' ? 'teal' : 'orange'} />
        </View>
        {walksBoard.errorMessage ? <Text selectable style={styles.errorBox}>{walksBoard.errorMessage}</Text> : null}
        {walksBoard.actionMessage ? <Text style={styles.successBox}>{walksBoard.actionMessage}</Text> : null}
      </AppCard>

      <AppCard tone={canUseLiveWrites ? 'teal' : 'warm'}>
        <Text style={styles.cardTitle}>Creo una passeggiata</Text>
        <Text style={styles.bodyText}>
          {canUseLiveWrites
            ? `Pronto: ${selectedDog?.name ?? 'il cane'} a ${selectedPlace?.name ?? 'un luogo BauBook'} · ${startsAtPreview}`
            : 'Per creare passeggiate reali servono login, almeno un cane e luoghi caricati da Supabase.'}
        </Text>

        {!auth.isSignedIn ? <Text style={styles.helperText}>Vai in Setup e accedi con OTP/magic link.</Text> : null}
        {auth.isSignedIn && !auth.dogs.length ? <Text style={styles.helperText}>Vai in “Io sono...” e salva il primo cane.</Text> : null}
        {placesState.source !== 'supabase' ? <Text style={styles.helperText}>La creazione è disabilitata finché i luoghi non arrivano dal DB live.</Text> : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Cane protagonista</Text>
          <View style={styles.chipRow}>
            {auth.dogs.length ? auth.dogs.map((dog) => (
              <ChoiceChip key={dog.id} label={dog.name} selected={dog.id === selectedDogId} onPress={() => setSelectedDogId(dog.id)} />
            )) : <Tag label="nessun cane salvato" tone="orange" />}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Luogo</Text>
          <View style={styles.chipRow}>
            {livePlaces.slice(0, 6).map((place) => (
              <ChoiceChip key={place.id} label={place.name} selected={place.id === selectedPlace?.id} onPress={() => setSelectedPlaceId(place.id)} />
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Quando</Text>
          <View style={styles.chipRow}>
            {startOptions.map((option) => (
              <ChoiceChip key={option.minutes} label={option.label} selected={selectedMinutes === option.minutes} onPress={() => setSelectedMinutes(option.minutes)} />
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Messaggio del cane</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Tipo: giro morbido, saluto piano, niente cani irruenti"
            multiline
            style={[styles.input, styles.textArea]}
          />
        </View>

        <View style={styles.chipRow}>
          <ChoiceChip label="Accetto compagnia" selected={acceptsCompany} onPress={() => setAcceptsCompany(true)} />
          <ChoiceChip label="Solo annusata zen" selected={!acceptsCompany} onPress={() => setAcceptsCompany(false)} />
        </View>

        <View style={styles.actionRow}>
          <AppButton
            label={walksBoard.status === 'loading' ? 'Creo...' : 'Crea passeggiata'}
            icon={baubookImages.icons.calendar}
            disabled={!canUseLiveWrites || walksBoard.status === 'loading'}
            onPress={handleCreateWalk}
          />
          <AppButton label="Ricarica" variant="ghost" icon={baubookImages.icons.search} onPress={walksBoard.reload} />
        </View>
      </AppCard>

      <AppCard tone="teal">
        <Text style={styles.cardTitle}>Mi sento solo / Divertiamoci</Text>
        <Text style={styles.bodyText}>Presenza temporanea per 90 minuti nel luogo scelto. È una presenza “soft”, non una posizione live continua.</Text>
        <View style={styles.chipRow}>
          {presenceOptions.map((option) => (
            <ChoiceChip key={option.status} label={option.label} selected={presenceStatus === option.status} onPress={() => setPresenceStatus(option.status)} />
          ))}
        </View>
        <View style={styles.actionRow}>
          <AppButton
            label="Attiva presenza"
            icon={baubookImages.icons.notifications}
            disabled={!canUseLiveWrites || walksBoard.status === 'loading'}
            onPress={handleStartPresence}
          />
          <AppButton label="Chiudi presenze" variant="ghost" icon={baubookImages.icons.privacy} disabled={!auth.isSignedIn} onPress={() => void walksBoard.endPresence()} />
        </View>
      </AppCard>

      <View style={styles.walkList}>
        <SectionHeader
          eyebrow="Chi va a passeggiare"
          title={walksBoard.status === 'loading' ? 'Carico la bacheca...' : 'Bacheca passeggiate'}
          description={walksBoard.message}
        />

        {walksBoard.walks.length ? walksBoard.walks.map((plan) => (
          <AppCard key={plan.id}>
            <View style={styles.walkHeader}>
              <IconBubble source={baubookImages.icons.walks} size={58} tone={plan.isMine ? 'teal' : 'warm'} />
              <View style={styles.walkCopy}>
                <Text style={styles.walkTime}>{plan.startsAtLabel}</Text>
                <Text style={styles.walkTitle}>{plan.dogName} va a {plan.placeName}</Text>
                <Text style={styles.walkMessage}>“{plan.message}”</Text>
                <Text style={styles.ownerText}>Umano: {plan.ownerName}</Text>
              </View>
            </View>
            <View style={styles.tagsRow}>
              {plan.tags.map((tag) => <Tag key={tag} label={tag} tone={plan.acceptsCompany ? 'teal' : 'orange'} />)}
              {plan.isMine ? <Tag label="mia" tone="green" /> : null}
            </View>
            <View style={styles.buttonWrap}>
              <AppButton
                label={plan.isMine ? 'È la mia passeggiata' : 'Mi interessa'}
                variant={plan.isMine ? 'ghost' : 'secondary'}
                icon={baubookImages.icons.friends}
                disabled={!auth.isSignedIn || plan.isMine || !plan.acceptsCompany || walksBoard.status === 'loading'}
                onPress={() => void walksBoard.joinPlan(plan.id, selectedDog?.id)}
              />
            </View>
          </AppCard>
        )) : (
          <AppCard>
            <Text style={styles.cardTitle}>Nessuna passeggiata live per ora</Text>
            <Text style={styles.bodyText}>Crea la prima passeggiata BauBook Venezia-Mestre e controlla Table Editor: `walk_plans` e `community_events` si popoleranno.</Text>
          </AppCard>
        )}
      </View>

      <AppCard tone="pink">
        <Text style={styles.cardTitle}>Presenze temporanee attive</Text>
        <Text style={styles.bodyText}>Questa sezione mostra chi ha detto “sono qui per un po'” senza esporre una posizione live permanente.</Text>
        <View style={styles.presenceList}>
          {walksBoard.presences.length ? walksBoard.presences.map((presence) => (
            <View key={presence.id} style={styles.presenceItem}>
              <Text style={styles.walkTitle}>{presence.dogName} · {presence.statusLabel}</Text>
              <Text style={styles.bodyText}>{presence.placeName} · {presence.expiresAtLabel}</Text>
              <Text style={styles.walkMessage}>“{presence.message}”</Text>
              <View style={styles.tagsRow}>{presence.tags.map((tag) => <Tag key={tag} label={tag} tone="pink" />)}</View>
            </View>
          )) : <Text style={styles.helperText}>Nessuna presenza attiva. Bene per la privacy, male per la scodinzolata.</Text>}
        </View>
      </AppCard>
    </Screen>
  );
}

function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.choiceChip, selected && styles.choiceChipSelected, pressed && styles.choiceChipPressed]}>
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  bodyText: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 21,
  },
  helperText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
  },
  label: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  formGroup: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: typography.body,
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  choiceChip: {
    maxWidth: '100%',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  choiceChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.tealSoft,
  },
  choiceChipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  choiceChipText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },
  choiceChipTextSelected: {
    color: colors.primaryDark,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  errorBox: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.redSoft,
    color: colors.danger,
    padding: spacing.md,
    fontSize: typography.small,
    fontWeight: '700',
  },
  successBox: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.greenSoft,
    color: colors.primaryDark,
    padding: spacing.md,
    fontSize: typography.small,
    fontWeight: '800',
  },
  walkList: {
    gap: spacing.md,
  },
  walkHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  walkCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  walkTime: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: '900',
  },
  walkTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  walkMessage: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  ownerText: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  buttonWrap: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  presenceList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  presenceItem: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
