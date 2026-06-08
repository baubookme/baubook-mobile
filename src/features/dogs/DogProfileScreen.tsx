import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { baubookImages } from '../../shared/assets/images';
import { useAuthAccount } from '../../shared/auth/AuthProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { Tag } from '../../shared/components/Tag';
import { demoDog } from '../../shared/data/mockData';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';

const defaultPersonalityTags = ['curioso', 'buffo', 'gentile'];
const defaultSocialityTags = ['ok cani piccoli', 'ama umani calmi', 'no caos'];
const defaultWalkTags = ['ombra', 'fontanella', 'passeggiata lenta'];

export function DogProfileScreen() {
  const auth = useAuthAccount();
  const firstDog = auth.dogs[0] ?? null;
  const [dogName, setDogName] = useState(firstDog?.name ?? demoDog.name);
  const [headline, setHeadline] = useState(firstDog?.notesPublic ?? demoDog.headline);
  const [privateNotes, setPrivateNotes] = useState(firstDog?.notesPrivate ?? '');

  const personalityTags = useMemo(() => firstDog?.personalityTags.length ? firstDog.personalityTags : defaultPersonalityTags, [firstDog]);
  const socialityTags = useMemo(() => firstDog?.socialityTags.length ? firstDog.socialityTags : defaultSocialityTags, [firstDog]);
  const walkTags = useMemo(() => firstDog?.walkTags.length ? firstDog.walkTags : defaultWalkTags, [firstDog]);

  useEffect(() => {
    if (firstDog) {
      setDogName(firstDog.name);
      setHeadline(firstDog.notesPublic ?? demoDog.headline);
      setPrivateNotes(firstDog.notesPrivate ?? '');
    }
  }, [firstDog?.id]);

  const saveLabel = firstDog ? 'Aggiorna cane su Supabase' : 'Crea il mio cane';

  return (
    <Screen>
      <SectionHeader
        eyebrow="Io sono...!"
        title="Profilo cane in prima persona"
        description="Ora questa schermata salva davvero su Supabase quando l'account e' attivo. Il demo resta visibile come fallback."
      />

      <AppCard tone={auth.isSignedIn ? 'teal' : 'warm'}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarFrame}>
            <Image source={baubookImages.avatar} style={styles.avatar} />
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.eyebrow}>{firstDog ? 'Profilo Supabase' : auth.isSignedIn ? 'Nuovo cane' : 'Profilo demo'}</Text>
            <Text style={styles.name}>{dogName || 'Il mio cane'}</Text>
            <Text style={styles.visibility}>
              {auth.isSignedIn ? 'Visibilita: pubblico beta · moderazione: approved' : 'Accedi nel tab Setup per salvare davvero'}
            </Text>
          </View>
        </View>
        <Text style={styles.quote}>“{headline || 'Scrivi una bio in prima persona.'}”</Text>
        <View style={styles.statusRow}>
          <Tag label={auth.isSignedIn ? 'Account attivo' : 'Demo locale'} tone={auth.isSignedIn ? 'green' : 'orange'} />
          <Tag label={firstDog ? 'DB salvato' : 'non salvato'} tone={firstDog ? 'green' : 'orange'} />
          <Tag label={`cani ${auth.dogs.length}`} tone="teal" />
        </View>
        {auth.errorMessage ? <Text selectable style={styles.errorBox}>{auth.errorMessage}</Text> : null}
      </AppCard>

      <AppCard>
        <View style={styles.formHeader}>
          <IconBubble source={baubookImages.icons.dogProfile} size={58} tone="teal" />
          <View style={styles.formHeaderCopy}>
            <Text style={styles.cardTitle}>Campi MVP</Text>
            <Text style={styles.bodyText}>Identita' utile per incontri, passeggiate e alert. Story, gallery e extra arriveranno dopo.</Text>
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nome</Text>
          <TextInput value={dogName} onChangeText={setDogName} placeholder="Nome del cane" style={styles.input} />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Bio in prima persona</Text>
          <TextInput
            value={headline}
            onChangeText={setHeadline}
            placeholder="Io sono..."
            style={[styles.input, styles.textArea]}
            multiline
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Note private MVP</Text>
          <TextInput
            value={privateNotes}
            onChangeText={setPrivateNotes}
            placeholder="Es. non ama cani grandi, timoroso, anziano..."
            style={[styles.input, styles.textArea]}
            multiline
          />
        </View>
        <View style={styles.actionsRow}>
          <AppButton
            label={auth.isBusy ? 'Salvo...' : saveLabel}
            icon={baubookImages.icons.dogProfile}
            disabled={!auth.isSignedIn || auth.isBusy}
            onPress={() => void auth.saveDogProfile({
              id: firstDog?.id,
              name: dogName,
              personalityTags,
              socialityTags,
              walkTags,
              notesPublic: headline,
              notesPrivate: privateNotes,
              visibility: 'public',
            })}
          />
          <AppButton label="Foto dopo" variant="ghost" icon={baubookImages.icons.camera} disabled />
        </View>
        {!auth.isSignedIn ? <Text style={styles.helperText}>Per salvare il cane: vai in Setup, invia email OTP/magic link e crea il profilo umano.</Text> : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Tag caratteriali</Text>
        <View style={styles.tagsRow}>
          {personalityTags.map((tag) => (
            <Tag key={tag} label={tag} tone="orange" />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Socialita'</Text>
        <View style={styles.tagsRow}>
          {socialityTags.map((tag) => (
            <Tag key={tag} label={tag} tone="teal" />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Passeggiata preferita</Text>
        <View style={styles.tagsRow}>
          {walkTags.map((tag) => (
            <Tag key={tag} label={tag} tone="green" />
          ))}
        </View>
      </AppCard>

      <AppCard tone="pink">
        <Text style={styles.cardTitle}>Note utili, non giudicanti</Text>
        <View style={styles.notesList}>
          {(privateNotes ? privateNotes.split('\n').filter(Boolean) : demoDog.notes).map((note) => (
            <View key={note} style={styles.noteItem}>
              <Text style={styles.noteBullet}>•</Text>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </View>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarFrame: {
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 4,
    borderColor: colors.secondary,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileCopy: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.ink,
    fontSize: typography.h1,
    fontWeight: '900',
  },
  visibility: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  quote: {
    marginTop: spacing.lg,
    color: colors.text,
    fontSize: typography.h3,
    lineHeight: 25,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  errorBox: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.redSoft,
    color: colors.text,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  formHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  bodyText: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  helperText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  formGroup: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.body,
  },
  textArea: {
    minHeight: 104,
    textAlignVertical: 'top',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  notesList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  noteItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  noteBullet: {
    color: colors.accent,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  noteText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
