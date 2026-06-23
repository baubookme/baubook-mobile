import {useEffect, useMemo, useState} from 'react';
import {Alert, Image, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import {baubookImages} from '../../shared/assets/images';
import {useAuthAccount} from '../../shared/auth/AuthProvider';
import {AppButton} from '../../shared/components/AppButton';
import {AppCard} from '../../shared/components/AppCard';
import {Screen} from '../../shared/components/Screen';
import {SectionHeader} from '../../shared/components/SectionHeader';
import {Tag} from '../../shared/components/Tag';
import {colors, radius, spacing, typography} from '../../shared/theme/theme';

const profileTagOptions = [
    'calmo',
    'curioso',
    'socievole',
    'timido',
    'buffo',
    'gentile',
    'coccolone',
    'indipendente',
    'protettivo',
    'giocherellone',
    'tranquillo',
    'vivace',
    'educato',
    'sensibile',
    'testardo',
    'furbetto',
    'dolce',
    'pauroso',
    'coraggioso',
    'attento',
    'ama l’ombra',
    'ama il sole',
    'ama l’acqua',
    'ama correre',
    'ama annusare',
    'ama i bambini',
    'ama gli umani calmi',
    'ama cani piccoli',
    'ama cani grandi',
    'preferisce pochi amici',
    'preferisce passeggiate lente',
    'preferisce zone tranquille',
    'ok guinzaglio',
    'ok area cani',
    'ok bar',
    'ok auto',
    'ok veterinario',
    'no caos',
    'no folla',
    'no rumori forti',
    'no cani invadenti',
    'no giochi bruschi',
    'bisogno di spazio',
    'bisogno di calma',
    'senior',
    'cucciolo',
    'molto energico',
    'molto affettuoso',
    'super annusatore',
    'piccolo esploratore',
    're del divano',
    'spirito libero',
];


function uniqueTags(tags: string[]) {
    const seen = new Set<string>();

    return tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter((tag) => {
            const key = normalizeTag(tag);

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });
}

function normalizeTag(tag: string) {
    return tag
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[’']/g, '')
        .replace(/[^a-z0-9]+/g, '');
}

function hashtagLabel(tag: string) {
    return `#${normalizeTag(tag)}`;
}

function readDogAvatarUri(dog: unknown) {
    const record = dog as
        | {
        avatarUrl?: string | null;
        avatar_url?: string | null;
        photoUrl?: string | null;
        photo_url?: string | null;
        imageUrl?: string | null;
    }
        | null;

    const value = record?.avatarUrl ?? record?.avatar_url ?? record?.photoUrl ?? record?.photo_url ?? record?.imageUrl ?? null;

    if (typeof value === 'string' && value.startsWith('blob:')) {
        return null;
    }

    return value;
}

async function normalizePickedImageUri(uri: string) {
    if (!uri.startsWith('blob:')) {
        return uri;
    }

    const response = await fetch(uri);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
                return;
            }

            reject(new Error('Impossibile leggere la foto selezionata.'));
        };

        reader.onerror = () => reject(reader.error ?? new Error('Errore lettura foto.'));
        reader.readAsDataURL(blob);
    });
}

export function DogProfileScreen() {
    const auth = useAuthAccount();
    const firstDog = auth.dogs[0] ?? null;

    const savedTags = useMemo(
        () =>
            uniqueTags([
                ...(firstDog?.personalityTags ?? []),
                ...(firstDog?.socialityTags ?? []),
            ]),
        [firstDog?.id, firstDog?.personalityTags, firstDog?.socialityTags],
    );

    const [isEditing, setIsEditing] = useState(false);
    const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);
    const [isSavingTags, setIsSavingTags] = useState(false);
    const [dogName, setDogName] = useState(firstDog?.name ?? '');
    const [headline, setHeadline] = useState(firstDog?.notesPublic ?? '');
    const [privateNotes, setPrivateNotes] = useState(firstDog?.notesPrivate ?? '');
    const [avatarUri, setAvatarUri] = useState<string | null>(readDogAvatarUri(firstDog));
    const [selectedTags, setSelectedTags] = useState<string[]>(savedTags);

    const displayedTags = selectedTags;
    const canSave = auth.isSignedIn && !auth.isBusy && dogName.trim().length > 0;
    const canEditTags = auth.isSignedIn && Boolean(firstDog) && !auth.isBusy && !isSavingTags;
    const visiblePrivateNotes = privateNotes.split('\n').map((note) => note.trim()).filter(Boolean);

    useEffect(() => {
        if (firstDog) {
            const nextTags = uniqueTags([
                ...(firstDog.personalityTags ?? []),
                ...(firstDog.socialityTags ?? []),
            ]);

            setDogName(firstDog.name);
            setHeadline(firstDog.notesPublic ?? '');
            setPrivateNotes(firstDog.notesPrivate ?? '');
            setAvatarUri(readDogAvatarUri(firstDog));
            setSelectedTags(nextTags);
            return;
        }

        setDogName('');
        setHeadline('');
        setPrivateNotes('');
        setAvatarUri(null);
        setSelectedTags([]);
        setIsTagEditorOpen(false);
    }, [firstDog?.id]);

    const handleCancelEdit = () => {
        setDogName(firstDog?.name ?? '');
        setHeadline(firstDog?.notesPublic ?? '');
        setPrivateNotes(firstDog?.notesPrivate ?? '');
        setAvatarUri(readDogAvatarUri(firstDog));

        const nextTags = uniqueTags([
            ...(firstDog?.personalityTags ?? []),
            ...(firstDog?.socialityTags ?? []),
        ]);

        setSelectedTags(nextTags);
        setIsEditing(false);
    };

    const handlePickPhoto = async () => {
        if (!auth.isSignedIn) {
            Alert.alert('Accesso richiesto', 'Accedi nel tab Setup per salvare la foto del 🐶.');
            return;
        }

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert('Permesso foto necessario', 'Autorizza l’accesso alla libreria foto per scegliere l’avatar del tuo 🐶.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });

        if (result.canceled || !result.assets?.[0]?.uri) {
            return;
        }

        const normalizedUri = await normalizePickedImageUri(result.assets[0].uri);
        setAvatarUri(normalizedUri);
    };

    const saveTagsOnTheFly = async (nextTags: string[], previousTags: string[]) => {
        if (!firstDog || !canEditTags) {
            return;
        }

        setIsSavingTags(true);

        try {
            const savedDog = await auth.saveDogProfile({
                id: firstDog.id,
                name: firstDog.name,
                personalityTags: nextTags,
                socialityTags: [],
                walkTags: [],
                notesPublic: firstDog.notesPublic ?? '',
                notesPrivate: firstDog.notesPrivate ?? '',
                visibility: 'public',
                avatarUrl: readDogAvatarUri(firstDog) ?? undefined,
            });

            if (!savedDog) {
                setSelectedTags(previousTags);
            }
        } finally {
            setIsSavingTags(false);
        }
    };

    const handleToggleTag = (tag: string) => {
        if (!canEditTags) {
            return;
        }

        setSelectedTags((current) => {
            const normalized = normalizeTag(tag);
            const exists = current.some((item) => normalizeTag(item) === normalized);
            const nextTags = exists
                ? current.filter((item) => normalizeTag(item) !== normalized)
                : uniqueTags([...current, tag]);

            void saveTagsOnTheFly(nextTags, current);
            return nextTags;
        });
    };

    const handleSave = async () => {
        if (!canSave) {
            return;
        }

        const payload = {
            id: firstDog?.id,
            name: dogName.trim(),
            personalityTags: selectedTags,
            socialityTags: [],
            walkTags: [],
            notesPublic: headline,
            notesPrivate: privateNotes,
            visibility: 'public',
            avatarUrl: avatarUri ?? undefined,
            avatar_url: avatarUri ?? undefined,
        } as Parameters<typeof auth.saveDogProfile>[0] & {
            avatarUrl?: string;
            avatar_url?: string;
        };

        await auth.saveDogProfile(payload);

        setIsEditing(false);
    };

    return (
        <Screen>
            <SectionHeader
                eyebrow="Io sono...!"
                title="Il mio profilo a 4 zampe"
            />

            <AppCard tone={auth.isSignedIn ? 'teal' : 'warm'}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarFrame}>
                        <Image source={avatarUri ? {uri: avatarUri} : baubookImages.avatar} style={styles.avatar}/>
                    </View>

                    <View style={styles.profileCopy}>
                        <Text style={styles.eyebrow}>
                            {firstDog ? 'Profilo peloso 🐾' : auth.isSignedIn ? 'Nuovo peloso 🐾' : 'Profilo da creare'}
                        </Text>
                        <Text style={styles.name}>{firstDog ? dogName || 'Il mio amico' : 'Crea il profilo del tuo cane'}</Text>
                        <Text style={styles.visibility}>
                            {firstDog && auth.isSignedIn
                                ? 'Visibilità: pubblico · moderazione: approved ✔️'
                                : auth.isSignedIn
                                    ? 'Salva il primo profilo per usare Branco, Passeggiate e Presenze.'
                                    : 'Accedi nel tab Setup per salvare davvero'}
                        </Text>
                    </View>
                </View>

                <Text style={styles.quote}>
                    “{firstDog
                        ? headline || 'Scrivi la mia carta d’identità.'
                        : 'Aggiungi nome, foto e note utili del tuo amico. Poi potrai aggiungere dei tag.'}”
                </Text>

                <View style={styles.statusRow}>
                    <Tag label={auth.isSignedIn ? 'Account attivo' : 'Servizio non disponibile'}
                         tone={auth.isSignedIn ? 'green' : 'orange'}/>
                    <Tag label={firstDog ? 'Profilo salvato' : 'Profilo non salvato'}
                         tone={firstDog ? 'green' : 'orange'}/>
                    <Tag label={`🐾 ${auth.dogs.length}`} tone="teal"/>
                </View>

                <View style={styles.profileActionsRow}>
                    <AppButton
                        label={isEditing ? 'Chiudi modifica' : firstDog ? 'Modifica' : 'Crea profilo'}
                        variant={isEditing ? 'ghost' : 'primary'}
                        icon={isEditing ? baubookImages.icons.profileGear : baubookImages.icons.profileGearLight}
                        onPress={() => {
                            if (isEditing) {
                                handleCancelEdit();
                                return;
                            }

                            setIsEditing(true);
                        }}
                    />
                </View>

                {auth.errorMessage ? <Text selectable style={styles.errorBox}>{auth.errorMessage}</Text> : null}
            </AppCard>

            {isEditing ? (
                <AppCard>
                    <View style={styles.formHeader}>
                        <View style={styles.editAvatarFrame}>
                            <Image source={avatarUri ? {uri: avatarUri} : baubookImages.avatar}
                                   style={styles.editAvatar}/>
                        </View>
                        <View style={styles.formHeaderCopy}>
                            <Text style={styles.cardTitle}>Modifica profilo</Text>
                            <Text style={styles.bodyText}>
                                Identità utile per incontri, passeggiate e alert. Foto, descrizione e tag aiutano gli
                                altri utenti a capire meglio il tuo 🐶.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Nome</Text>
                        <TextInput
                            value={dogName}
                            onChangeText={setDogName}
                            placeholder="Nome del 🐶"
                            placeholderTextColor={colors.muted}
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>La mia carta d’identità</Text>
                        <TextInput
                            value={headline}
                            onChangeText={setHeadline}
                            placeholder="Io sono..."
                            placeholderTextColor={colors.muted}
                            style={[styles.input, styles.textArea]}
                            multiline
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Note utili 📝</Text>
                        <TextInput
                            value={privateNotes}
                            onChangeText={setPrivateNotes}
                            placeholder="Es. non ama cani grandi, timoroso, anziano..."
                            placeholderTextColor={colors.muted}
                            style={[styles.input, styles.textArea]}
                            multiline
                        />
                    </View>

                    <View style={styles.editActionsContainer}>
                        <View style={styles.editPhotoRow}>
                            <AppButton
                                label="Foto"
                                variant="ghost"
                                icon={baubookImages.icons.camera}
                                disabled={!auth.isSignedIn || auth.isBusy}
                                onPress={() => void handlePickPhoto()}
                            />
                        </View>

                        <View style={styles.editSubmitRow}>
                            <AppButton
                                label={auth.isBusy ? 'Salvo...' : firstDog ? 'Aggiorna' : 'Crea'}
                                icon={baubookImages.icons.profileGearLight}
                                disabled={!canSave}
                                onPress={() => void handleSave()}
                            />
                        </View>
                    </View>

                    {!auth.isSignedIn ? (
                        <Text style={styles.helperText}>
                            Per salvare il 🐾: vai in Setup, invia email OTP/magic link e crea il profilo.
                        </Text>
                    ) : null}
                </AppCard>
            ) : null}

            <AppCard>
                <View style={styles.tagCardHeader}>
                    <View style={styles.tagCardCopy}>
                        <Text style={styles.cardTitle}>Carattere e socialità</Text>
                        <Text style={styles.bodyText}>
                            Tag veloci per raccontare com’è il tuo amico 🐶.
                        </Text>
                    </View>

                    <Pressable
                        onPress={() => setIsTagEditorOpen((current) => !current)}
                        disabled={!auth.isSignedIn || !firstDog || auth.isBusy || isSavingTags}
                        style={({pressed}) => [
                            styles.lockButton,
                            isTagEditorOpen && styles.lockButtonOpen,
                            (!auth.isSignedIn || !firstDog || auth.isBusy || isSavingTags) && styles.lockButtonDisabled,
                            pressed && canEditTags && styles.lockButtonPressed,
                        ]}
                    >
                        <Text style={[styles.lockButtonText, isTagEditorOpen && styles.lockButtonTextOpen]}>
                            {isTagEditorOpen ? '🔓' : '🔒'}
                        </Text>
                    </Pressable>
                </View>

                {firstDog || isEditing ? (
                    <View style={styles.hashtagRow}>
                        {(isTagEditorOpen ? profileTagOptions : displayedTags).map((tag) => {
                            const selected = selectedTags.some((item) => normalizeTag(item) === normalizeTag(tag));

                            return (
                                <HashtagChip
                                    key={normalizeTag(tag)}
                                    tag={tag}
                                    selected={selected}
                                    editable={isTagEditorOpen && canEditTags}
                                    onPress={() => handleToggleTag(tag)}
                                />
                            );
                        })}
                    </View>
                ) : null}

                {!isTagEditorOpen ? (
                    <Text style={styles.helperText}>
                        {firstDog && auth.isSignedIn
                            ? selectedTags.length > 0
                                ? 'Tocca il lucchetto per modificare i tag. Le modifiche saranno salvate subito.'
                                : 'Nessun tag selezionato. Tocca il lucchetto per aggiungere solo quelli giusti per il tuo 🐶.'
                            : isEditing
                                ? 'I tag sono facoltativi: puoi salvarli vuoti o scegliere solo quelli davvero adatti al tuo 🐶.'
                                : 'Crea e salva il primo profilo 🐶 per sbloccare tag, Passeggiate e Branco.'}
                    </Text>
                ) : null}

                {isTagEditorOpen ? (
                    <Text style={styles.helperText}>
                        {isSavingTags
                            ? 'Salvataggio tag...'
                            : 'Tocca un tag per aggiungerlo o rimuoverlo. Le modifiche vengono salvate subito.'}
                    </Text>
                ) : null}
            </AppCard>

            <AppCard tone="pink">
                <Text style={styles.cardTitle}>Consigli utili, zero giudizi 📒</Text>
                {visiblePrivateNotes.length ? (
                    <View style={styles.notesList}>
                        {visiblePrivateNotes.map((note) => (
                            <View key={note} style={styles.noteItem}>
                                <Text style={styles.noteBullet}>•</Text>
                                <Text style={styles.noteText}>{note}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.helperText}>
                        {firstDog
                            ? 'Aggiungi eventuali consigli utili dalla modifica profilo.'
                            : 'Quando salvi il profilo, qui compariranno solo le note che decidi tu.'}
                    </Text>
                )}
            </AppCard>
        </Screen>
    );
}

function HashtagChip({
                         tag,
                         selected,
                         editable,
                         onPress,
                     }: {
    tag: string;
    selected: boolean;
    editable: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={!editable}
            style={({pressed}) => [
                styles.hashtagChip,
                selected && styles.hashtagChipSelected,
                editable && styles.hashtagChipEditable,
                pressed && editable && styles.hashtagChipPressed,
            ]}
        >
            <Text style={[styles.hashtagText, selected && styles.hashtagTextSelected]}>
                {hashtagLabel(tag)}
            </Text>
        </Pressable>
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
        borderWidth: 3,
        borderColor: colors.secondary,
        overflow: 'hidden',
        backgroundColor: colors.surface,
    },
    avatar: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    editAvatarFrame: {
        width: 78,
        height: 78,
        borderRadius: 39,
        borderWidth: 3,
        borderColor: colors.secondary,
        overflow: 'hidden',
        backgroundColor: colors.surface,
    },
    editAvatar: {
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
    profileActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: spacing.sm,
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
    editActionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    editPhotoRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        flexShrink: 0,
    },
    editSubmitRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexShrink: 0,
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
    tagCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    tagCardCopy: {
        flex: 1,
        gap: 4,
    },
    lockButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    lockButtonOpen: {
        borderColor: colors.primary,
        backgroundColor: colors.greenSoft,
    },
    lockButtonDisabled: {
        opacity: 0.45,
    },
    lockButtonPressed: {
        opacity: 0.82,
        transform: [{scale: 0.96}],
    },
    lockButtonText: {
        fontSize: 18,
        fontWeight: '900',
    },
    lockButtonTextOpen: {
        color: colors.primaryDark,
    },
    hashtagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginTop: spacing.md,
    },
    hashtagChip: {
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    hashtagChipEditable: {
        borderColor: colors.secondary,
    },
    hashtagChipSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.greenSoft,
    },
    hashtagChipPressed: {
        opacity: 0.82,
        transform: [{scale: 0.98}],
    },
    hashtagText: {
        color: colors.text,
        fontSize: typography.small,
        fontWeight: '900',
    },
    hashtagTextSelected: {
        color: colors.primaryDark,
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