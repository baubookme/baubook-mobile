import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  labelForDangerType,
  formatSafetyCreatedAt,
  type DangerType,
  type SafetyAlertModel,
} from "../../shared/api/safety";
import { baubookImages } from "../../shared/assets/images";
import { useAuthAccount } from "../../shared/auth/AuthProvider";
import { AppButton } from "../../shared/components/AppButton";
import { AppCard } from "../../shared/components/AppCard";
import { IconBubble } from "../../shared/components/IconBubble";
import { Screen } from "../../shared/components/Screen";
import { SectionHeader } from "../../shared/components/SectionHeader";
import { Tag } from "../../shared/components/Tag";
import { moderationChecklist } from "../../shared/data/mockData";
import { useSafetyBoard } from "../../shared/hooks/useSafetyBoard";
import { useSupabasePlaces } from "../../shared/hooks/useSupabasePublicData";
import { colors, radius, spacing, typography } from "../../shared/theme/theme";

const lostTtlOptions = [6, 24, 48];
const dangerTtlOptions = [2, 6, 24, 72];
const lastSeenOptions = [15, 30, 60, 180];
const severityOptions = [1, 2, 3, 4, 5];

const dangerTypeOptions: Array<{ type: DangerType; label: string }> = [
  { type: "suspected_poison", label: "Bocconi sospetti" },
  { type: "loose_dog", label: "Animale vagante" },
  { type: "unsafe_area", label: "Zona poco sicura" },
  { type: "traffic", label: "Traffico rischioso" },
  { type: "broken_fence", label: "Recinzione rotta" },
  { type: "other", label: "Altro" },
];

const lostDisclaimer = [
  "L’area è indicativa e non è un tracciamento in tempo reale.",
  "Non pubblico indirizzi privati, telefoni personali o dati sensibili nel testo.",
  "BauBook non sostituisce emergenze, veterinario, autorità o associazioni: se serve, contatto i canali appropriati.",
  "Chiuderò l’alert appena il cane sarà recuperato o l’informazione non sarà più utile.",
];

const dangerDisclaimer = [
  "Segnalo solo fatti osservati o ragionevolmente verificabili, senza accuse a persone identificabili.",
  "La segnalazione ha TTL e può essere rimossa/moderata se abusiva, falsa o non più utile.",
  "Non tocco oggetti sospetti e tengo il cane lontano dalla zona indicata.",
  "Se c’è un rischio immediato, uso anche i canali ufficiali o di emergenza appropriati.",
];

const sightingDisclaimer = [
  "Invio solo informazioni utili e non inseguo il cane.",
  "La posizione è approssimata su un luogo BauBook, non un indirizzo privato.",
  "Se dichiaro “recuperato”, lo faccio solo se ho informazioni affidabili.",
];

export function AlertsScreen() {
  const auth = useAuthAccount();
  const placesState = useSupabasePlaces();
  const safetyBoard = useSafetyBoard(auth.profile?.id);

  const livePlaces = useMemo(
    () =>
      placesState.places.filter(
        (place) => place.id && !place.id.endsWith("-demo"),
      ),
    [placesState.places],
  );
  const selectablePlaces = livePlaces.length ? livePlaces : placesState.places;

  const [selectedDogId, setSelectedDogId] = useState<string | null>(
    auth.dogs[0]?.id ?? null,
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    selectablePlaces[0]?.id ?? null,
  );
  const [lostDescription, setLostDescription] = useState(
    "Ultimo avvistamento in zona: se lo vedi, segnala senza inseguirlo.",
  );
  const [dangerDescription, setDangerDescription] = useState(
    "Segnalazione temporanea da verificare: tenere i cani lontani dalla zona.",
  );
  const [sightingNote, setSightingNote] = useState(
    "Avvistato in zona, non inseguito.",
  );
  const [lostTtlHours, setLostTtlHours] = useState(24);
  const [dangerTtlHours, setDangerTtlHours] = useState(6);
  const [lastSeenMinutesAgo, setLastSeenMinutesAgo] = useState(30);
  const [dangerType, setDangerType] = useState<DangerType>("suspected_poison");
  const [severity, setSeverity] = useState(2);
  const [lostAccepted, setLostAccepted] = useState(false);
  const [dangerAccepted, setDangerAccepted] = useState(false);
  const [sightingAccepted, setSightingAccepted] = useState(false);

  useEffect(() => {
    if (!selectedDogId && auth.dogs[0]?.id) {
      setSelectedDogId(auth.dogs[0].id);
    }
  }, [auth.dogs, selectedDogId]);

  useEffect(() => {
    if (!selectedPlaceId && selectablePlaces[0]?.id) {
      setSelectedPlaceId(selectablePlaces[0].id);
    }
  }, [selectablePlaces, selectedPlaceId]);

  const selectedDog =
    auth.dogs.find((dog) => dog.id === selectedDogId) ?? auth.dogs[0] ?? null;
  const selectedPlace =
    selectablePlaces.find((place) => place.id === selectedPlaceId) ??
    selectablePlaces[0] ??
    null;
  const canUseLiveWrites =
    auth.isSignedIn &&
    placesState.source === "supabase" &&
    Boolean(selectedPlace);
  const canCreateLost =
    canUseLiveWrites &&
    Boolean(selectedDog) &&
    lostAccepted &&
    safetyBoard.status !== "loading";
  const canCreateDanger =
    canUseLiveWrites && dangerAccepted && safetyBoard.status !== "loading";
  const canCreateSighting =
    canUseLiveWrites && sightingAccepted && safetyBoard.status !== "loading";

  const handleCreateLost = () => {
    if (!selectedDog || !selectedPlace || !canCreateLost) {
      return;
    }
    void safetyBoard.createLostAlert({
      dogId: selectedDog.id,
      placeId: selectedPlace.id,
      description: lostDescription,
      lastSeenMinutesAgo,
      ttlHours: lostTtlHours,
      disclaimerAccepted: lostAccepted,
    });
  };

  const handleCreateDanger = () => {
    if (!selectedPlace || !canCreateDanger) {
      return;
    }
    void safetyBoard.createDanger({
      placeId: selectedPlace.id,
      dangerType,
      description: dangerDescription,
      severity,
      ttlHours: dangerTtlHours,
      disclaimerAccepted: dangerAccepted,
    });
  };

  const handleSighting = (
    alert: SafetyAlertModel,
    sightingType: "seen" | "recovered",
  ) => {
    if (!selectedPlace || !canCreateSighting) {
      return;
    }
    void safetyBoard.createSighting({
      alertId: alert.id,
      placeId: selectedPlace.id,
      sightingType,
      note: sightingNote,
      disclaimerAccepted: sightingAccepted,
    });
  };

  return (
    <Screen>
      <SectionHeader
        eyebrow="Community locale"
        title="Emergenze vere, ma con cintura di sicurezza"
        description="Mi sono perso! e Pericolo! ora scrivono su Supabase tramite RPC controllate: TTL obbligatorio, disclaimer richiesto, rate limit beta, chiusura esplicita, report abuso e audit minimo."
      />

      <AppCard tone="danger">
        <View style={styles.criticalHeader}>
          <IconBubble
            source={baubookImages.icons.safety}
            size={72}
            tone="plain"
          />
          <View style={styles.criticalCopy}>
            <Text style={styles.eyebrow}>Safety mode</Text>
            <Text style={styles.cardTitle}>Niente panico globale.</Text>
            <Text style={styles.bodyText}>
              Tutti gli alert sono temporanei, geolocalizzati in modo
              approssimativo e segnalabili. Il database rifiuta creazioni senza
              disclaimer.
            </Text>
          </View>
        </View>
        <View style={styles.tagsRow}>
          <Tag
            label={
              auth.isSignedIn ? "utente verificato email" : "login richiesto"
            }
            tone={auth.isSignedIn ? "green" : "orange"}
          />
          <Tag
            label={
              placesState.source === "supabase" ? "luoghi live" : "luoghi demo"
            }
            tone={placesState.source === "supabase" ? "green" : "orange"}
          />
          <Tag
            label={
              safetyBoard.source === "supabase" ? "alert live" : "fallback demo"
            }
            tone={safetyBoard.source === "supabase" ? "teal" : "orange"}
          />
        </View>
        {safetyBoard.errorMessage ? (
          <Text selectable style={styles.errorBox}>
            {safetyBoard.errorMessage}
          </Text>
        ) : null}
        {safetyBoard.actionMessage ? (
          <Text style={styles.successBox}>{safetyBoard.actionMessage}</Text>
        ) : null}
      </AppCard>

      <AppCard tone="warm">
        <Text style={styles.cardTitle}>Contesto comune</Text>
        <Text style={styles.bodyText}>
          Le azioni sotto usano il cane e il luogo selezionati. Per ora l’area è
          costruita attorno a un luogo BauBook, non a un disegno libero su
          mappa.
        </Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Cane</Text>
          <View style={styles.chipRow}>
            {auth.dogs.length ? (
              auth.dogs.map((dog) => (
                <ChoiceChip
                  key={dog.id}
                  label={dog.name}
                  selected={dog.id === selectedDogId}
                  onPress={() => setSelectedDogId(dog.id)}
                />
              ))
            ) : (
              <Tag label="nessun cane salvato" tone="orange" />
            )}
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Zona indicativa</Text>
          <View style={styles.chipRow}>
            {selectablePlaces.slice(0, 8).map((place) => (
              <ChoiceChip
                key={place.id}
                label={place.name}
                selected={place.id === selectedPlace?.id}
                onPress={() => setSelectedPlaceId(place.id)}
              />
            ))}
          </View>
        </View>
        {!auth.isSignedIn ? (
          <Text style={styles.helperText}>
            Vai in Setup e accedi: le funzioni safety richiedono sessione
            utente.
          </Text>
        ) : null}
        {auth.isSignedIn && !auth.dogs.length ? (
          <Text style={styles.helperText}>
            Vai in “Io sono...” e salva il primo cane prima di creare un alert
            smarrimento.
          </Text>
        ) : null}
        {placesState.source !== "supabase" ? (
          <Text style={styles.helperText}>
            Le scritture sono disabilitate finché i luoghi non arrivano da
            Supabase live.
          </Text>
        ) : null}
      </AppCard>

      <AppCard tone="danger">
        <View style={styles.criticalHeader}>
          <IconBubble
            source={baubookImages.icons.lostDog}
            size={72}
            tone="plain"
          />
          <View style={styles.criticalCopy}>
            <Text style={styles.eyebrow}>Mi sono perso!</Text>
            <Text style={styles.cardTitle}>Alert smarrimento con TTL</Text>
            <Text style={styles.bodyText}>
              Default 24h, massimo beta 48h. Un solo alert attivo per cane: se
              lo ritrovi, lo chiudi.
            </Text>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Ultimo avvistamento</Text>
          <View style={styles.chipRow}>
            {lastSeenOptions.map((minutes) => (
              <ChoiceChip
                key={minutes}
                label={`${minutes} min fa`}
                selected={lastSeenMinutesAgo === minutes}
                onPress={() => setLastSeenMinutesAgo(minutes)}
              />
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>TTL alert</Text>
          <View style={styles.chipRow}>
            {lostTtlOptions.map((hours) => (
              <ChoiceChip
                key={hours}
                label={`${hours}h`}
                selected={lostTtlHours === hours}
                onPress={() => setLostTtlHours(hours)}
              />
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Descrizione pubblica prudente</Text>
          <TextInput
            value={lostDescription}
            onChangeText={setLostDescription}
            multiline
            style={[styles.input, styles.textArea]}
          />
        </View>

        <DisclaimerBox
          title="Disclaimer smarrimento"
          items={lostDisclaimer}
          accepted={lostAccepted}
          onToggle={() => setLostAccepted((value) => !value)}
        />

        <View style={styles.actionRow}>
          <AppButton
            label={safetyBoard.status === "loading" ? "Creo..." : "Crea alert"}
            variant="danger"
            icon={baubookImages.icons.lostDog}
            disabled={!canCreateLost}
            onPress={handleCreateLost}
          />
          <AppButton
            label="Ricarica"
            variant="ghost"
            icon={baubookImages.icons.search}
            onPress={safetyBoard.reload}
          />
        </View>
      </AppCard>

      <AppCard tone="warm">
        <View style={styles.criticalHeader}>
          <IconBubble
            source={
              dangerType === "suspected_poison"
                ? baubookImages.icons.suspiciousFood
                : baubookImages.icons.danger
            }
            size={70}
            tone="plain"
          />
          <View style={styles.criticalCopy}>
            <Text style={styles.eyebrow}>Pericolo!</Text>
            <Text style={styles.cardTitle}>Segnalazioni temporanee</Text>
            <Text style={styles.bodyText}>
              TTL 2/6/24/72h, severità 1-5, moderazione iniziale pending ma
              visibile in beta locale.
            </Text>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Tipo pericolo</Text>
          <View style={styles.chipRow}>
            {dangerTypeOptions.map((option) => (
              <ChoiceChip
                key={option.type}
                label={option.label}
                selected={dangerType === option.type}
                onPress={() => setDangerType(option.type)}
              />
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>TTL segnalazione</Text>
          <View style={styles.chipRow}>
            {dangerTtlOptions.map((hours) => (
              <ChoiceChip
                key={hours}
                label={`${hours}h`}
                selected={dangerTtlHours === hours}
                onPress={() => setDangerTtlHours(hours)}
              />
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Severità</Text>
          <View style={styles.chipRow}>
            {severityOptions.map((value) => (
              <ChoiceChip
                key={value}
                label={`${value}`}
                selected={severity === value}
                onPress={() => setSeverity(value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Descrizione pubblica prudente</Text>
          <TextInput
            value={dangerDescription}
            onChangeText={setDangerDescription}
            multiline
            style={[styles.input, styles.textArea]}
          />
        </View>

        <DisclaimerBox
          title="Disclaimer Pericolo"
          items={dangerDisclaimer}
          accepted={dangerAccepted}
          onToggle={() => setDangerAccepted((value) => !value)}
        />

        <View style={styles.actionRow}>
          <AppButton
            label={
              safetyBoard.status === "loading" ? "Creo..." : "Crea Pericolo"
            }
            variant="danger"
            icon={baubookImages.icons.danger}
            disabled={!canCreateDanger}
            onPress={handleCreateDanger}
          />
          <AppButton
            label="Ricarica"
            variant="ghost"
            icon={baubookImages.icons.search}
            onPress={safetyBoard.reload}
          />
        </View>
      </AppCard>

      <AppCard tone="pink">
        <Text style={styles.cardTitle}>Azioni su avvistamenti</Text>
        <Text style={styles.bodyText}>
          Prima di inviare “Avvistato!” o “Recuperato!” serve confermare le
          regole. Il dato resta approssimato al luogo selezionato.
        </Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nota avvistamento</Text>
          <TextInput
            value={sightingNote}
            onChangeText={setSightingNote}
            multiline
            style={[styles.input, styles.textAreaSmall]}
          />
        </View>
        <DisclaimerBox
          title="Disclaimer avvistamento"
          items={sightingDisclaimer}
          accepted={sightingAccepted}
          onToggle={() => setSightingAccepted((value) => !value)}
          compact
        />
      </AppCard>

      <View style={styles.alertList}>
        <SectionHeader
          eyebrow="Bacheca safety"
          title={
            safetyBoard.status === "loading"
              ? "Carico alert..."
              : "Alert attivi"
          }
          description={safetyBoard.message}
        />

        {safetyBoard.alerts.length ? (
          safetyBoard.alerts.map((alert) => (
            <SafetyCard
              key={`${alert.type}-${alert.id}`}
              alert={alert}
              canCreateSighting={canCreateSighting}
              isBusy={safetyBoard.status === "loading"}
              onSeen={() => handleSighting(alert, "seen")}
              onRecovered={() => handleSighting(alert, "recovered")}
              onCloseLost={() => void safetyBoard.closeLostAlert(alert.id)}
              onCloseDanger={() => void safetyBoard.closeDanger(alert.id)}
              onReport={() =>
                void safetyBoard.reportContent(
                  alert.type === "lost_dog"
                    ? "lost_dog_alert"
                    : "danger_report",
                  alert.id,
                )
              }
            />
          ))
        ) : (
          <AppCard>
            <Text style={styles.cardTitle}>Nessun alert attivo</Text>
            <Text style={styles.bodyText}>
              Quando creerai un alert, Table Editor mostrerà `lost_dog_alerts`,
              `danger_reports`, `lost_dog_sightings`, `reports` e `audit_logs`.
            </Text>
          </AppCard>
        )}
      </View>

      <AppCard>
        <View style={styles.moderationHeader}>
          <Image
            source={baubookImages.icons.moderation}
            style={styles.moderationIcon}
          />
          <View style={styles.criticalCopy}>
            <Text style={styles.eyebrow}>Spalle coperte</Text>
            <Text style={styles.cardTitle}>
              Moderazione e audit già agganciati.
            </Text>
          </View>
        </View>
        <View style={styles.checkList}>
          {moderationChecklist.map((item) => (
            <View key={item} style={styles.checkItem}>
              <Text style={styles.checkMark}>✓</Text>
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
          <View style={styles.checkItem}>
            <Text style={styles.checkMark}>✓</Text>
            <Text style={styles.checkText}>
              RPC safety con disclaimer obbligatorio e TTL clampato anche lato
              database.
            </Text>
          </View>
        </View>
      </AppCard>
    </Screen>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
        selected && styles.choiceChipSelected,
        pressed && styles.choiceChipPressed,
      ]}
    >
      <Text
        style={[
          styles.choiceChipText,
          selected && styles.choiceChipTextSelected,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DisclaimerBox({
  title,
  items,
  accepted,
  onToggle,
  compact = false,
}: {
  title: string;
  items: string[];
  accepted: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <View
      style={[styles.disclaimerBox, compact && styles.disclaimerBoxCompact]}
    >
      <Text style={styles.disclaimerTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.disclaimerItem}>
          <Text style={styles.disclaimerBullet}>•</Text>
          <Text style={styles.disclaimerText}>{item}</Text>
        </View>
      ))}
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.acceptRow,
          accepted && styles.acceptRowSelected,
          pressed && styles.choiceChipPressed,
        ]}
      >
        <Text
          style={[styles.acceptMark, accepted && styles.acceptMarkSelected]}
        >
          {accepted ? "✓" : "!"}
        </Text>
        <Text
          style={[styles.acceptText, accepted && styles.acceptTextSelected]}
        >
          Ho letto e accetto prima di pubblicare.
        </Text>
      </Pressable>
    </View>
  );
}

function SafetyCard({
  alert,
  canCreateSighting,
  isBusy,
  onSeen,
  onRecovered,
  onCloseLost,
  onCloseDanger,
  onReport,
}: {
  alert: SafetyAlertModel;
  canCreateSighting: boolean;
  isBusy: boolean;
  onSeen: () => void;
  onRecovered: () => void;
  onCloseLost: () => void;
  onCloseDanger: () => void;
  onReport: () => void;
}) {
  const danger = alert.type === "danger";
  return (
    <AppCard tone={danger ? "warm" : "danger"}>
      <View style={styles.alertHeader}>
        <IconBubble
          source={alert.icon}
          size={62}
          tone={danger ? "danger" : "pink"}
        />
        <View style={styles.alertCopy}>
          <Text style={styles.alertTitle}>{alert.title}</Text>
          <Text style={styles.alertMeta}>
            {alert.placeName} · {alert.ttlLabel} · {alert.radiusLabel}
          </Text>
          <Text style={styles.alertDescription}>{alert.description}</Text>
          <Text style={styles.alertHint}>{alert.actionHint}</Text>
        </View>
      </View>
      <View style={styles.tagsRow}>
        <Tag
          label={alert.status}
          tone={alert.status === "active" ? "red" : "green"}
        />
        <Tag
          label={danger ? "pericolo" : "cane smarrito"}
          tone={danger ? "orange" : "pink"}
        />
        {danger && alert.dangerType ? (
          <Tag label={labelForDangerType(alert.dangerType)} tone="orange" />
        ) : null}
        {danger && alert.severity ? (
          <Tag
            label={`severità ${alert.severity}`}
            tone={alert.severity >= 4 ? "red" : "orange"}
          />
        ) : null}
        <Tag
          label={`mod ${alert.moderationStatus}`}
          tone={alert.moderationStatus === "approved" ? "green" : "orange"}
        />
        {alert.isMine ? <Tag label="mio" tone="green" /> : null}
      </View>
      <Text style={styles.timestampText}>
        Creato: {formatSafetyCreatedAt(alert.createdAtIso)} · da{" "}
        {danger ? alert.reporterName : alert.ownerName}
      </Text>
      <View style={styles.actionRowWrap}>
        {!danger ? (
          <>
            <AppButton
              label="Avvistato"
              variant="secondary"
              icon={baubookImages.icons.sighting}
              disabled={!canCreateSighting || isBusy}
              onPress={onSeen}
            />
            <AppButton
              label="Recuperato"
              variant="ghost"
              icon={baubookImages.icons.recovered}
              disabled={!canCreateSighting || isBusy}
              onPress={onRecovered}
            />
            {alert.isMine ? (
              <AppButton
                label="Chiudi"
                variant="danger"
                icon={baubookImages.icons.privacy}
                disabled={isBusy}
                onPress={onCloseLost}
              />
            ) : null}
          </>
        ) : alert.isMine ? (
          <AppButton
            label="Dismetti"
            variant="ghost"
            icon={baubookImages.icons.privacy}
            disabled={isBusy}
            onPress={onCloseDanger}
          />
        ) : null}
        <AppButton
          label="Segnala abuso"
          variant="ghost"
          icon={baubookImages.icons.reports}
          disabled={isBusy}
          onPress={onReport}
        />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  criticalHeader: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  criticalCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: "900",
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
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  errorBox: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.redSoft,
    color: colors.danger,
    padding: spacing.md,
    fontSize: typography.small,
    fontWeight: "800",
  },
  successBox: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.greenSoft,
    color: colors.success,
    padding: spacing.md,
    fontSize: typography.small,
    fontWeight: "900",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  choiceChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    maxWidth: "100%",
  },
  choiceChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  choiceChipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  choiceChipText: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: "900",
  },
  choiceChipTextSelected: {
    color: "#FFFFFF",
  },
  formGroup: {
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  label: {
    color: colors.ink,
    fontSize: typography.small,
    fontWeight: "900",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  textAreaSmall: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  disclaimerBox: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  disclaimerBoxCompact: {
    padding: spacing.sm,
  },
  disclaimerTitle: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: "900",
  },
  disclaimerItem: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  disclaimerBullet: {
    color: colors.danger,
    fontSize: typography.body,
    fontWeight: "900",
  },
  disclaimerText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: "700",
  },
  acceptRow: {
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.redSoft,
  },
  acceptRowSelected: {
    borderColor: colors.success,
    backgroundColor: colors.greenSoft,
  },
  acceptMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.danger,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 26,
    fontWeight: "900",
  },
  acceptMarkSelected: {
    backgroundColor: colors.success,
  },
  acceptText: {
    flex: 1,
    color: colors.danger,
    fontSize: typography.small,
    fontWeight: "900",
  },
  acceptTextSelected: {
    color: colors.success,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  alertList: {
    gap: spacing.md,
  },
  alertHeader: {
    flexDirection: "row",
    gap: spacing.md,
  },
  alertCopy: {
    flex: 1,
    gap: 4,
  },
  alertTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: "900",
  },
  alertMeta: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: "900",
  },
  alertDescription: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
  },
  alertHint: {
    color: colors.danger,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: "800",
  },
  timestampText: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: typography.tiny,
    fontWeight: "800",
  },
  moderationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  moderationIcon: {
    width: 62,
    height: 62,
    resizeMode: "contain",
  },
  checkList: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  checkItem: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  checkMark: {
    color: colors.success,
    fontSize: typography.body,
    fontWeight: "900",
  },
  checkText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
    fontWeight: "700",
  },
});
