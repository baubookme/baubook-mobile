import { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { baubookImages } from '../../shared/assets/images';
import { AppButton } from '../../shared/components/AppButton';
import { AppCard } from '../../shared/components/AppCard';
import { IconBubble } from '../../shared/components/IconBubble';
import { Screen } from '../../shared/components/Screen';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { Tag } from '../../shared/components/Tag';
import { demoDog } from '../../shared/data/mockData';
import { colors, radius, spacing, typography } from '../../shared/theme/theme';

export function DogProfileScreen() {
  const [dogName, setDogName] = useState(demoDog.name);
  const [headline, setHeadline] = useState(demoDog.headline);

  return (
    <Screen>
      <SectionHeader
        eyebrow="Io sono...!"
        title="Profilo cane in prima persona"
        description="Questa schermata è già pensata per diventare CRUD Supabase: avatar, tag, note, visibilità e moderazione."
      />

      <AppCard tone="warm">
        <View style={styles.profileHeader}>
          <View style={styles.avatarFrame}>
            <Image source={baubookImages.avatar} style={styles.avatar} />
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.eyebrow}>Profilo demo</Text>
            <Text style={styles.name}>{dogName}</Text>
            <Text style={styles.visibility}>Visibilità: pubblico beta · moderazione: approved</Text>
          </View>
        </View>
        <Text style={styles.quote}>“{headline}”</Text>
        <View style={styles.actionsRow}>
          <AppButton label="Aggiungi foto" variant="secondary" icon={baubookImages.icons.camera} />
          <AppButton label="Privacy" variant="ghost" icon={baubookImages.icons.privacy} />
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.formHeader}>
          <IconBubble source={baubookImages.icons.dogProfile} size={58} tone="teal" />
          <View style={styles.formHeaderCopy}>
            <Text style={styles.cardTitle}>Campi MVP</Text>
            <Text style={styles.bodyText}>Niente feed infinito all'inizio: solo identità utile per incontri e alert.</Text>
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
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Tag caratteriali</Text>
        <View style={styles.tagsRow}>
          {demoDog.personalityTags.map((tag) => (
            <Tag key={tag} label={tag} tone="orange" />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Socialità</Text>
        <View style={styles.tagsRow}>
          {demoDog.socialityTags.map((tag) => (
            <Tag key={tag} label={tag} tone="teal" />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Passeggiata preferita</Text>
        <View style={styles.tagsRow}>
          {demoDog.walkTags.map((tag) => (
            <Tag key={tag} label={tag} tone="green" />
          ))}
        </View>
      </AppCard>

      <AppCard tone="pink">
        <Text style={styles.cardTitle}>Note utili, non giudicanti</Text>
        <View style={styles.notesList}>
          {demoDog.notes.map((note) => (
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
  actionsRow: {
    flexDirection: 'row',
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
