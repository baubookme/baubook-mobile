import { useEffect, useMemo, useRef, useState } from "react";
import type { ScrollView } from "react-native";
import { Easing, Animated, Image, Modal, Pressable, ScrollView as RNScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";

import {
  dangerIconForType,
  formatSafetyCreatedAt,
  type DangerType,
  type SafetyAlertModel,
} from "../../shared/api/safety";
import { baubookImages } from "../../shared/assets/images";
import { useAuthAccount } from "../../shared/auth/AuthProvider";
import { AppButton } from "../../shared/components/AppButton";
import { AppCard } from "../../shared/components/AppCard";
import { Screen } from "../../shared/components/Screen";
import { Tag } from "../../shared/components/Tag";
import { useSafetyBoard } from "../../shared/hooks/useSafetyBoard";
import { getSupabaseClient } from "../../shared/lib/supabase";
import { colors, radius, spacing, typography } from "../../shared/theme/theme";

type LocationMode = "current" | "manual";

interface SafetyLocationPayload {
  locationMode: LocationMode;
  locationLabel: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  manualAddress: string | null;
}

const lostTtlOptions = [6, 24, 48];
const dangerTtlOptions = [2, 6, 24, 72];
const presumedMissingOptions = [15, 30, 60, 180];
const severityOptions = [1, 2, 3, 4, 5];

const LOST_DESCRIPTION_MIN_LENGTH = 15;
const DANGER_DESCRIPTION_MIN_LENGTH = 15;

const dangerTypeOptions: Array<{ type: DangerType; label: string }> = [
  { type: "suspected_poison", label: "Bocconi sospetti" },
  { type: "loose_dog", label: "Animale vagante" },
  { type: "unsafe_area", label: "Zona poco sicura" },
  { type: "traffic", label: "Traffico rischioso" },
  { type: "broken_fence", label: "Recinzione rotta" },
  { type: "other", label: "Altro" },
];

const lostDisclaimer = [
  "Pubblico solo informazioni utili e non dati sensibili.",
  "La posizione è indicativa: non pubblico indirizzi privati o numeri personali.",
  "BauBook non sostituisce autorità, veterinario o canali ufficiali.",
  "Chiuderò l’alert appena non sarà più utile.",
];

const dangerDisclaimer = [
  "Segnalo solo fatti osservati o ragionevolmente verificabili.",
  "Non accuso persone identificabili e non inserisco dati sensibili.",
  "Tengo il cane in sicurezza e uso canali ufficiali se il rischio è immediato.",
  "Chiuderò la segnalazione quando non sarà più utile.",
];

type SafetyNoticeState = {
  title: string;
  message: string;
} | null;

function isLostLimitError(message?: string | null) {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return (
    normalized.includes("limite") &&
    (normalized.includes("smarrimento") ||
      normalized.includes("lost") ||
      normalized.includes("create_lost_dog_alert"))
  );
}

function isDangerLimitError(message?: string | null) {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return (
    normalized.includes("limite beta") &&
    (normalized.includes("pericolo") ||
      normalized.includes("danger") ||
      normalized.includes("create_danger"))
  );
}

function isSafetyLimitError(message?: string | null) {
  return isLostLimitError(message) || isDangerLimitError(message);
}

async function resolveReadableLocationLabel(latitude: number, longitude: number): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  try {
    const { data, error } = await client.functions.invoke("resolve-location-label", {
      body: { latitude, longitude },
    });

    if (error || !data || typeof data.label !== "string") {
      return null;
    }

    const label = data.label.trim();
    return label.length ? label : null;
  } catch {
    return null;
  }
}

function useSafetyLocationDraft(initialLabel: string) {
  const [locationMode, setLocationMode] = useState<LocationMode>("current");
  const [manualAddress, setManualAddress] = useState("");
  const [currentLocationPayload, setCurrentLocationPayload] = useState<SafetyLocationPayload | null>(null);
  const [locationStatusMessage, setLocationStatusMessage] = useState<string | null>(initialLabel);
  const [locationResolving, setLocationResolving] = useState(false);

  const manualAddressValue = manualAddress.trim();
  const manualAddressReady = manualAddressValue.length >= 10;
  const locationReady = locationMode === "current" || manualAddressReady;

  const resolvedLocationLabel =
    locationMode === "current"
      ? currentLocationPayload?.locationLabel ?? "Posizione attuale da rilevare"
      : manualAddressValue || "Indirizzo manuale da inserire";

  const resolveCurrentLocationPayload = async (): Promise<SafetyLocationPayload | null> => {
    setLocationResolving(true);
    setLocationStatusMessage("Rilevo la posizione...");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationStatusMessage("Permesso posizione non concesso. Usa un indirizzo manuale.");
        return null;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const label = (await resolveReadableLocationLabel(latitude, longitude)) ?? "Posizione condivisa";

      const payload: SafetyLocationPayload = {
        locationMode: "current",
        locationLabel: label,
        locationLatitude: latitude,
        locationLongitude: longitude,
        manualAddress: null,
      };

      setCurrentLocationPayload(payload);
      setLocationStatusMessage(`Posizione rilevata: ${label}`);
      return payload;
    } catch {
      setLocationStatusMessage("Non riesco a leggere la posizione. Usa un indirizzo manuale.");
      return null;
    } finally {
      setLocationResolving(false);
    }
  };

  const resolveManualLocationPayload = async (): Promise<SafetyLocationPayload | null> => {
    if (!manualAddressReady) {
      setLocationStatusMessage("Inserisci almeno 10 caratteri per usare l’indirizzo manuale.");
      return null;
    }

    return {
      locationMode: "manual",
      locationLabel: manualAddressValue,
      locationLatitude: null,
      locationLongitude: null,
      manualAddress: manualAddressValue,
    };
  };

  const prepareLocationPayload = async (): Promise<SafetyLocationPayload | null> => {
    if (locationMode === "manual") {
      return resolveManualLocationPayload();
    }
    return currentLocationPayload ?? resolveCurrentLocationPayload();
  };

  return {
    locationMode,
    setLocationMode,
    manualAddress,
    setManualAddress,
    manualAddressValue,
    manualAddressReady,
    locationReady,
    resolvedLocationLabel,
    locationStatusMessage,
    locationResolving,
    resolveCurrentLocationPayload,
    prepareLocationPayload,
  };
}

type SafetyLocationDraft = ReturnType<typeof useSafetyLocationDraft>;

export function AlertsScreen() {
  const auth = useAuthAccount();
  const safetyBoard = useSafetyBoard(auth.profile?.id);
  const lastSafetyLimitPopupMessageRef = useRef<string | null>(null);
  const [safetyNotice, setSafetyNotice] = useState<SafetyNoticeState>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTranslateY = useRef(new Animated.Value(80)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const screenScrollRef = useRef<ScrollView | null>(null);

  const [selectedDogId, setSelectedDogId] = useState<string | null>(auth.dogs[0]?.id ?? null);
  const [lostDescription, setLostDescription] = useState(
    "Cane smarrito: se lo vedi, osserva e segnala con prudenza senza inseguirlo.",
  );
  const [dangerDescription, setDangerDescription] = useState(
    "Segnalazione temporanea da verificare: tenere i cani lontani dalla zona.",
  );
  const [lostTtlHours, setLostTtlHours] = useState(24);
  const [dangerTtlHours, setDangerTtlHours] = useState(6);
  const [presumedMissingMinutesAgo, setPresumedMissingMinutesAgo] = useState(30);
  const [dangerType, setDangerType] = useState<DangerType | null>(null);
  const [severity, setSeverity] = useState(2);
  const [lostAccepted, setLostAccepted] = useState(false);
  const lostCreateInFlightRef = useRef(false);
  const [lostCreateInFlight, setLostCreateInFlight] = useState(false);
  const [dangerAccepted, setDangerAccepted] = useState(false);
  const dangerCreateInFlightRef = useRef(false);
  const [dangerCreateInFlight, setDangerCreateInFlight] = useState(false);
  const [dangerDraftExpanded, setDangerDraftExpanded] = useState(false);
  const [lostDraftExpanded, setLostDraftExpanded] = useState(false);

  const lostLocation = useSafetyLocationDraft("Rileva la posizione dello smarrimento o usa un indirizzo manuale.");
  const dangerLocation = useSafetyLocationDraft("Rileva la posizione del pericolo o usa un indirizzo manuale.");
  const sightingLocation = useSafetyLocationDraft("Rileva la posizione dell’avvistamento o usa un indirizzo manuale.");
  const [sightingAlert, setSightingAlert] = useState<SafetyAlertModel | null>(null);
  const [sightingNote, setSightingNote] = useState("");
  const [sightingAccepted, setSightingAccepted] = useState(false);
  const [sightingSubmitting, setSightingSubmitting] = useState(false);

  const scrollToSafetyNotice = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        screenScrollRef.current?.scrollTo({ y: 0, animated: true });
      });
    });
  };

  const showLostLimitNotice = () => {
    setSafetyNotice({
      title: "Limite segnalazioni raggiunto ⛔",
      message:
        "Hai già creato 2 alert smarrimento nelle ultime 24 ore per questo profilo.\nRiprova più tardi e ricorda di chiudere le segnalazioni non più utili.",
    });
    scrollToSafetyNotice();
  };

  const showDangerLimitNotice = () => {
    setSafetyNotice({
      title: "Limite segnalazioni raggiunto ⛔",
      message:
        "Hai già creato 3 alert pericolo nelle ultime 24 ore per questo profilo.\nRiprova più tardi e ricorda di chiudere le segnalazioni non più utili.",
    });
    scrollToSafetyNotice();
  };

  useEffect(() => {
    if (!safetyBoard.actionMessage) {
      return;
    }

    setToastMessage(safetyBoard.actionMessage);
    toastTranslateY.setValue(80);
    toastOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timeoutId = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastTranslateY, {
          toValue: 80,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setToastMessage((currentMessage) =>
            currentMessage === safetyBoard.actionMessage ? null : currentMessage,
          );
        }
      });
    }, 3800);

    return () => clearTimeout(timeoutId);
  }, [safetyBoard.actionMessage, toastOpacity, toastTranslateY]);

  useEffect(() => {
    const message = safetyBoard.errorMessage;
    if (!message) {
      lastSafetyLimitPopupMessageRef.current = null;
      return;
    }
    if (lastSafetyLimitPopupMessageRef.current === message) {
      return;
    }
    if (isLostLimitError(message)) {
      lastSafetyLimitPopupMessageRef.current = message;
      showLostLimitNotice();
      return;
    }
    if (isDangerLimitError(message)) {
      lastSafetyLimitPopupMessageRef.current = message;
      showDangerLimitNotice();
    }
  }, [safetyBoard.errorMessage]);

  useEffect(() => {
    if (!selectedDogId && auth.dogs[0]?.id) {
      setSelectedDogId(auth.dogs[0].id);
    }
  }, [auth.dogs, selectedDogId]);

  const selectedDog = auth.dogs.find((dog) => dog.id === selectedDogId) ?? auth.dogs[0] ?? null;

  const userAuthVerified = Boolean(
    auth.isSignedIn &&
      (auth.profile?.isVerifiedEmail ||
        auth.profile?.isVerifiedPhone ||
        auth.user?.email_confirmed_at ||
        auth.user?.phone_confirmed_at ||
        auth.user?.confirmed_at),
  );

  const accountReadOnly = !userAuthVerified;

  const myActiveLostAlert = useMemo(
    () =>
      safetyBoard.alerts.find(
        (alert) => alert.type === "lost_dog" && alert.isMine && alert.dogId === selectedDog?.id,
      ) ?? null,
    [safetyBoard.alerts, selectedDog?.id],
  );

  const myActiveDangerAlert = useMemo(
    () => safetyBoard.alerts.find((alert) => alert.type === "danger" && alert.isMine) ?? null,
    [safetyBoard.alerts],
  );

  const lostReadOnly = accountReadOnly || Boolean(myActiveLostAlert);
  const dangerReadOnly = accountReadOnly || Boolean(myActiveDangerAlert);
  const profileReady = auth.isSignedIn && Boolean(auth.profile);
  const dogReady = Boolean(selectedDog);

  const lostDescriptionReady = lostDescription.trim().length >= LOST_DESCRIPTION_MIN_LENGTH;
  const dangerDescriptionReady = dangerDescription.trim().length >= DANGER_DESCRIPTION_MIN_LENGTH;
  const dangerTypeReady = Boolean(dangerType);
  const displayDangerType = myActiveDangerAlert?.dangerType ?? dangerType;

  const canCreateLost =
    profileReady &&
    userAuthVerified &&
    dogReady &&
    lostAccepted &&
    lostDescriptionReady &&
    lostLocation.locationReady &&
    !lostReadOnly &&
    !lostCreateInFlight &&
    safetyBoard.status !== "loading";

  const canCreateDanger =
    profileReady &&
    userAuthVerified &&
    dangerAccepted &&
    dangerDescriptionReady &&
    dangerTypeReady &&
    dangerLocation.locationReady &&
    !dangerReadOnly &&
    !dangerCreateInFlight &&
    safetyBoard.status !== "loading";

  const handleCreateLost = async () => {
    if (!selectedDog || !canCreateLost || lostCreateInFlightRef.current) {
      return;
    }

    const locationPayload = await lostLocation.prepareLocationPayload();
    if (!locationPayload) {
      return;
    }

    const descriptionToPublish = lostDescription.trim();
    const lastSeen = presumedMissingMinutesAgo;
    const ttlHours = lostTtlHours;
    const disclaimerAccepted = lostAccepted;

    lostCreateInFlightRef.current = true;
    setLostCreateInFlight(true);
    setLostAccepted(false);

    try {
      await safetyBoard.createLostAlert({
        dogId: selectedDog.id,
        placeId: null,
        description: descriptionToPublish,
        lastSeenMinutesAgo: lastSeen,
        ttlHours,
        disclaimerAccepted,
        ...locationPayload,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? "");
      if (isLostLimitError(message)) {
        showLostLimitNotice();
      } else {
        setSafetyNotice({
          title: "Ops, qualcosa non è andato",
          message: "Non sono riuscito a creare l’alert smarrimento.\nRiprova tra poco.",
        });
        scrollToSafetyNotice();
      }
    } finally {
      lostCreateInFlightRef.current = false;
      setLostCreateInFlight(false);
    }
  };

  const handleCreateDanger = async () => {
    if (!canCreateDanger || dangerCreateInFlightRef.current || !dangerType) {
      return;
    }

    const locationPayload = await dangerLocation.prepareLocationPayload();
    if (!locationPayload) {
      return;
    }

    const descriptionToPublish = dangerDescription.trim();
    const disclaimerAccepted = dangerAccepted;

    dangerCreateInFlightRef.current = true;
    setDangerCreateInFlight(true);
    setDangerAccepted(false);

    try {
      await safetyBoard.createDanger({
        placeId: null,
        dangerType,
        description: descriptionToPublish,
        severity,
        ttlHours: dangerTtlHours,
        disclaimerAccepted,
        ...locationPayload,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? "");
      if (isDangerLimitError(message)) {
        showDangerLimitNotice();
      } else {
        setSafetyNotice({
          title: "Ops, qualcosa non è andato",
          message: "Non sono riuscito a creare la segnalazione pericolo.\nRiprova tra poco.",
        });
        scrollToSafetyNotice();
      }
    } finally {
      dangerCreateInFlightRef.current = false;
      setDangerCreateInFlight(false);
    }
  };

  const canUseCommunityActions = profileReady && userAuthVerified;

  const openSightingSheet = (alert: SafetyAlertModel) => {
    if (!canUseCommunityActions || alert.type !== "lost_dog" || alert.isMine) {
      return;
    }
    setSightingAlert(alert);
    setSightingNote("");
    setSightingAccepted(false);
  };

  const closeSightingSheet = () => {
    if (sightingSubmitting) {
      return;
    }
    setSightingAlert(null);
    setSightingNote("");
    setSightingAccepted(false);
  };

  const handleSubmitSighting = async () => {
    if (!sightingAlert || !canUseCommunityActions || !sightingAccepted || sightingSubmitting) {
      return;
    }

    const locationPayload = await sightingLocation.prepareLocationPayload();
    if (!locationPayload) {
      return;
    }

    setSightingSubmitting(true);
    try {
      await safetyBoard.createSighting({
        alertId: sightingAlert.id,
        sightingType: "seen",
        note: sightingNote.trim(),
        disclaimerAccepted: sightingAccepted,
        ...locationPayload,
      });
      setSightingAlert(null);
      setSightingNote("");
      setSightingAccepted(false);
    } finally {
      setSightingSubmitting(false);
    }
  };

  return (
    <View style={styles.screenShell}>
      <Screen scrollRef={screenScrollRef}>
      {safetyNotice ? (
        <SafetyNoticeCard
          title={safetyNotice.title}
          message={safetyNotice.message}
          onClose={() => setSafetyNotice(null)}
        />
      ) : null}

      <View style={styles.hero}>
        <View style={styles.heroTitleRow}>
          <Text style={styles.eyebrow}>AIUTO PER LA COMMUNITY</Text>
          <Tag
            label={userAuthVerified ? "✓ utente verificato" : "* utente non verificato"}
            tone={userAuthVerified ? "green" : "red"}
          />
        </View>

        <Text style={styles.bodyText}>
          Apri solo segnalazioni reali, temporanee e utili alla comunità BauBook. {"\n"}
          Utilizza queste funzioni responsabilmente. ℹ️
        </Text>
      </View>

      {!userAuthVerified ? (
        <AppCard tone="danger">
          <Text style={styles.cardTitle}>Sezione in sola lettura</Text>
          <Text style={styles.bodyText}>
            Per aprire segnalazioni serve un utente verificato via email o OTP. Puoi leggere gli avvisi, ma non puoi crearli o modificarli.
          </Text>
        </AppCard>
      ) : null}

      {safetyBoard.errorMessage && !isSafetyLimitError(safetyBoard.errorMessage) ? (
        <Text style={styles.errorBox}>{safetyBoard.errorMessage}</Text>
      ) : null}

      {!auth.isSignedIn ? (
        <Text style={styles.warningBox}>Vai in Setup e accedi: le funzioni di aiuto richiedono un utente valido.</Text>
      ) : null}

      {auth.isSignedIn && !auth.dogs.length ? (
        <Text style={styles.warningBox}>Vai in “Io sono...” e salva il primo 🐶 prima di creare un alert smarrimento.</Text>
      ) : null}

      <View style={styles.sectionBlock}>
        <Text style={styles.eyebrow}>SAFETY RADAR</Text>
        <Text style={styles.sectionTitle}>Segnalazioni attive</Text>

      </View>

      <View style={styles.alertList}>
        {safetyBoard.alerts.length ? (
          safetyBoard.alerts.map((alert) => (
            <SafetyCard
              key={`${alert.type}-${alert.id}`}
              alert={alert}
              isBusy={safetyBoard.status === "loading"}
              canInteract={canUseCommunityActions}
              onCloseLost={() => void safetyBoard.closeLostAlert(alert.id)}
              onCloseDanger={() => void safetyBoard.closeDanger(alert.id)}
              onOpenSighting={() => openSightingSheet(alert)}
              onReport={() =>
                void safetyBoard.reportContent(alert.type === "lost_dog" ? "lost_dog_alert" : "danger_report", alert.id)
              }
            />
          ))
        ) : (
          <AppCard>
            <Text style={styles.bodyText}>Nessuna segnalazione attiva.</Text>
          </AppCard>
        )}
      </View>

      <AppCard>
        <View style={styles.cardHeader}>
          <Image source={dangerIconForType(displayDangerType ?? "other")} style={styles.cardIcon} />
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>PERICOLO TEMPORANEO</Text>
            <Text style={styles.cardTitle}>Segnalazione pericolo</Text>
            <Text style={styles.bodyText}>Segnala solo situazioni reali e temporanee, con posizione reale o indirizzo manuale.</Text>
          </View>
        </View>

        {myActiveDangerAlert ? (
          <>
            <ReadonlyWarning message="Hai una segnalazione pericolo attiva." />
            <Pressable
              accessibilityRole="button"
              onPress={() => setDangerDraftExpanded((value) => !value)}
              style={({ pressed }) => [styles.collapsibleHeader, pressed && styles.choiceChipPressed]}
            >
              <Text style={styles.collapsibleTitle}>
                {dangerDraftExpanded ? "Nascondi dettagli segnalazione" : "Mostra dettagli segnalazione"}
              </Text>
              <Text style={styles.collapsibleIcon}>{dangerDraftExpanded ? "−" : "+"}</Text>
            </Pressable>
          </>
        ) : null}

        {myActiveDangerAlert && !dangerDraftExpanded ? null : (
          <View style={myActiveDangerAlert ? styles.collapsibleContent : undefined}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tipo pericolo</Text>
              <View style={styles.chipRow}>
                {dangerTypeOptions.map((option) => (
                  <ChoiceChip
                    key={option.type}
                    label={option.label}
                    selected={displayDangerType === option.type}
                    disabled={dangerReadOnly}
                    onPress={() => setDangerType(option.type)}
                  />
                ))}
              </View>
            </View>

            <LocationInputPanel
              draft={dangerLocation}
              disabled={dangerReadOnly}
              title="Da dove segnalo"
              readOnlyLocationLabel={myActiveDangerAlert?.placeName ?? null}
            />

            <View style={styles.formGroup}>
              <Text style={styles.label}>Durata segnalazione</Text>
              <View style={styles.chipRow}>
                {dangerTtlOptions.map((hours) => (
                  <ChoiceChip
                    key={hours}
                    label={`${hours}h`}
                    selected={dangerTtlHours === hours}
                    disabled={dangerReadOnly}
                    onPress={() => setDangerTtlHours(hours)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Gravità</Text>
              <View style={styles.chipRow}>
                {severityOptions.map((value) => (
                  <ChoiceChip
                    key={value}
                    label={`${value}/5`}
                    selected={severity === value}
                    disabled={dangerReadOnly}
                    onPress={() => setSeverity(value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descrizione pubblica nel rispetto della privacy</Text>
              <TextInput
                value={dangerDescription}
                onChangeText={setDangerDescription}
                editable={!dangerReadOnly}
                multiline
                placeholder="Descrivi cosa hai visto e perché è temporaneamente rischioso."
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.textArea, dangerReadOnly && styles.inputReadonly]}
              />
              {!dangerDescriptionReady ? (
                <Text style={styles.helperTextDanger}>
                  Descrizione obbligatoria: almeno {DANGER_DESCRIPTION_MIN_LENGTH} caratteri.
                </Text>
              ) : null}
            </View>

            {!dangerReadOnly ? (
              <DisclaimerBox
                title="Prima di pubblicare"
                items={dangerDisclaimer}
                accepted={dangerAccepted}
                disabled={false}
                onToggle={() => setDangerAccepted((value) => !value)}
              />
            ) : null}

            {!myActiveDangerAlert ? (
              <View style={styles.createActionRow}>
                <AppButton
                  label={dangerCreateInFlight ? "Pubblico..." : "Apri segnalazione"}
                  disabled={!canCreateDanger}
                  onPress={handleCreateDanger}
                  variant="danger"
                />
              </View>
            ) : null}
          </View>
        )}
      </AppCard>

      <AppCard tone="danger">
        <View style={styles.cardHeader}>
          <Image source={baubookImages.safetyCircles.lostHelp} style={styles.cardIcon} />
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>MI SONO PERSO</Text>
            <Text style={styles.cardTitle}>Alert smarrimento</Text>
            <Text style={styles.bodyText}>La posizione viene rilevata o va inserita manualmente.</Text>
          </View>
        </View>

        {myActiveLostAlert ? (
          <>
            <ReadonlyWarning message="Hai un alert smarrimento attivo." />
            <Pressable
              accessibilityRole="button"
              onPress={() => setLostDraftExpanded((value) => !value)}
              style={({ pressed }) => [styles.collapsibleHeader, pressed && styles.choiceChipPressed]}
            >
              <Text style={styles.collapsibleTitle}>
                {lostDraftExpanded ? "Nascondi dettagli smarrimento" : "Mostra dettagli smarrimento"}
              </Text>
              <Text style={styles.collapsibleIcon}>{lostDraftExpanded ? "−" : "+"}</Text>
            </Pressable>
          </>
        ) : null}

        {myActiveLostAlert && !lostDraftExpanded ? null : (
          <View style={myActiveLostAlert ? styles.collapsibleContent : undefined}>
            <View style={styles.formGroup}>
              <View style={styles.chipRow}>
                {auth.dogs.length ? (
                  auth.dogs.map((dog) => (
                    <ChoiceChip
                      key={dog.id}
                      label={dog.name}
                      selected={dog.id === selectedDog?.id}
                      disabled={accountReadOnly || Boolean(myActiveLostAlert)}
                      onPress={() => setSelectedDogId(dog.id)}
                    />
                  ))
                ) : (
                  <Text style={styles.helperText}>Nessun 🐶 salvato nel profilo.</Text>
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ora smarrimento presunta</Text>
              <View style={styles.chipRow}>
                {presumedMissingOptions.map((minutes) => (
                  <ChoiceChip
                    key={minutes}
                    label={minutes < 60 ? `${minutes} min fa` : `${Math.round(minutes / 60)} h fa`}
                    selected={presumedMissingMinutesAgo === minutes}
                    disabled={lostReadOnly}
                    onPress={() => setPresumedMissingMinutesAgo(minutes)}
                  />
                ))}
              </View>
            </View>

            <LocationInputPanel
              draft={lostLocation}
              disabled={lostReadOnly}
              title="Da dove segnalo"
              readOnlyLocationLabel={myActiveLostAlert?.placeName ?? null}
            />

            <View style={styles.formGroup}>
              <Text style={styles.label}>Durata alert</Text>
              <View style={styles.chipRow}>
                {lostTtlOptions.map((hours) => (
                  <ChoiceChip
                    key={hours}
                    label={`${hours}h`}
                    selected={lostTtlHours === hours}
                    disabled={lostReadOnly}
                    onPress={() => setLostTtlHours(hours)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descrizione pubblica nel rispetto della privacy</Text>
              <TextInput
                value={lostDescription}
                onChangeText={setLostDescription}
                editable={!lostReadOnly}
                multiline
                placeholder="Cosa è successo? Colore, pettorina, comportamento, direzione..."
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.textArea, lostReadOnly && styles.inputReadonly]}
              />
              {!lostDescriptionReady ? (
                <Text style={styles.helperTextDanger}>
                  Descrizione smarrimento obbligatoria: almeno {LOST_DESCRIPTION_MIN_LENGTH} caratteri.
                </Text>
              ) : null}
            </View>

            {!lostReadOnly ? (
              <DisclaimerBox
                title="Prima di pubblicare"
                items={lostDisclaimer}
                accepted={lostAccepted}
                disabled={false}
                onToggle={() => setLostAccepted((value) => !value)}
              />
            ) : null}

            {!myActiveLostAlert ? (
              <View style={styles.createActionRow}>
                <AppButton
                  label={lostCreateInFlight ? "Pubblico..." : "Apri segnalazione"}
                  disabled={!canCreateLost}
                  onPress={handleCreateLost}
                  variant="danger"
                />
              </View>
            ) : null}
          </View>
        )}
      </AppCard>      </Screen>
      <SightingBottomSheet
        alert={sightingAlert}
        draft={sightingLocation}
        note={sightingNote}
        accepted={sightingAccepted}
        submitting={sightingSubmitting}
        canSubmit={Boolean(sightingAlert && sightingAccepted && sightingLocation.locationReady && !sightingSubmitting)}
        onChangeNote={setSightingNote}
        onToggleAccepted={() => setSightingAccepted((value) => !value)}
        onSubmit={() => void handleSubmitSighting()}
        onClose={closeSightingSheet}
      />
      {toastMessage ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastOverlay,
            { opacity: toastOpacity, transform: [{ translateY: toastTranslateY }] },
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

function SafetyNoticeCard({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <AppCard tone="danger">
      <View style={styles.safetyNoticeHeader}>
        <Text style={styles.safetyNoticeTitle}>{title}</Text>
        <Text style={styles.safetyNoticeMessage}>{message}</Text>
      </View>
      <View style={styles.actionRowEnd}>
        <AppButton label="Ho capito" variant="danger" onPress={onClose} />
      </View>
    </AppCard>
  );
}

function LocationInputPanel({
  draft,
  disabled,
  title,
  readOnlyLocationLabel,
}: {
  draft: SafetyLocationDraft;
  disabled: boolean;
  title: string;
  readOnlyLocationLabel?: string | null;
}) {
  const readonlySummary = readOnlyLocationLabel?.trim() || draft.resolvedLocationLabel;

  if (disabled) {
    return (
      <View style={styles.formGroup}>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.locationSummary}>Posizione: {readonlySummary}</Text>
      </View>
    );
  }

  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{title}</Text>
      <View style={styles.locationModeRow}>
        <ChoiceChip
          label="Posizione attuale"
          selected={draft.locationMode === "current"}
          disabled={false}
          onPress={() => {
            draft.setLocationMode("current");
            void draft.resolveCurrentLocationPayload();
          }}
        />
        <ChoiceChip
          label="Indirizzo manuale"
          selected={draft.locationMode === "manual"}
          disabled={false}
          onPress={() => draft.setLocationMode("manual")}
        />
      </View>

      {draft.locationMode === "manual" ? (
        <View style={styles.manualAddressBlock}>
          <TextInput
            value={draft.manualAddress}
            onChangeText={draft.setManualAddress}
            editable
            placeholder="Es. Via Roma 10, Mestre"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Text style={draft.manualAddressReady || draft.manualAddressValue.length === 0 ? styles.helperText : styles.helperTextDanger}>
            Inserisci almeno 10 caratteri per usare l’indirizzo manuale.
          </Text>
        </View>
      ) : (
        <View style={styles.currentLocationBox}>
          <Text style={styles.helperText}>
            {draft.locationStatusMessage ?? "Rileva la posizione attuale per una segnalazione utile."}
          </Text>
          <AppButton
            label={draft.locationResolving ? "Rilevo..." : "Rileva posizione"}
            disabled={draft.locationResolving}
            onPress={() => void draft.resolveCurrentLocationPayload()}
            variant="secondary"
          />
        </View>
      )}

      <Text style={styles.locationSummary}>Posizione: {draft.resolvedLocationLabel}</Text>
    </View>
  );
}
function ChoiceChip({
  label,
  selected,
  disabled = false,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
        selected && styles.choiceChipSelected,
        disabled && styles.choiceChipDisabled,
        pressed && !disabled && styles.choiceChipPressed,
      ]}
    >
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected, disabled && styles.choiceChipTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

function DisclaimerBox({
  title,
  items,
  accepted,
  disabled,
  onToggle,
}: {
  title: string;
  items: string[];
  accepted: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.disclaimerBox}>
      <Text style={styles.disclaimerTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.disclaimerItem}>
          <Text style={styles.disclaimerBullet}>•</Text>
          <Text style={styles.disclaimerText}>{item}</Text>
        </View>
      ))}
      <Pressable
        disabled={disabled}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.acceptRow,
          accepted && styles.acceptRowSelected,
          disabled && styles.acceptRowDisabled,
          pressed && !disabled && styles.choiceChipPressed,
        ]}
      >
        <Text style={[styles.acceptMark, accepted && styles.acceptMarkSelected]}>{accepted ? "✓" : "!"}</Text>
        <Text style={[styles.acceptText, accepted && styles.acceptTextSelected]}>
          Ho letto e accetto prima di pubblicare.
        </Text>
      </Pressable>
    </View>
  );
}

function ReadonlyWarning({ message }: { message: string }) {
  return (
    <View style={styles.readonlyWarning}>
      <Text style={styles.readonlyWarningText}>⚠️ {message}</Text>
    </View>
  );
}

function formatSightingLabel(sightingType: string): string {
  switch (sightingType) {
    case "recovered":
      return "Recupero";
    case "maybe_seen":
      return "Forse visto";
    case "seen":
    default:
      return "Avvistato";
  }
}

function SightingActionButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sightingActionButton,
        disabled && styles.sightingActionButtonDisabled,
        pressed && !disabled && styles.choiceChipPressed,
      ]}
    >
      <Image source={baubookImages.safety.sightingBadge} style={styles.sightingActionIcon} />
      <Text style={styles.sightingActionText}>Avvistato!</Text>
    </Pressable>
  );
}

function SightingsPreview({ alert }: { alert: SafetyAlertModel }) {
  const [expanded, setExpanded] = useState(false);
  const [openSightingId, setOpenSightingId] = useState<string | null>(null);
  const sightings = alert.sightings ?? [];

  if (!sightings.length) {
    return null;
  }

  return (
    <View style={styles.sightingsBox}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [styles.sightingsHeader, pressed && styles.choiceChipPressed]}
      >
        <View style={styles.sightingsHeaderLeft}>
          <Image source={baubookImages.safety.sightingBadge} style={styles.sightingSmallIcon} />
          <Text style={styles.sightingsTitle}>Avvistamenti ({sightings.length})</Text>
        </View>
        <Text style={styles.collapsibleIcon}>{expanded ? "−" : "+"}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.sightingsGrid}>
          {sightings.map((sighting) => {
            const isOpen = openSightingId === sighting.sightingId;
            return (
              <Pressable
                key={sighting.sightingId}
                accessibilityRole="button"
                onPress={() => setOpenSightingId((current) => (current === sighting.sightingId ? null : sighting.sightingId))}
                style={({ pressed }) => [styles.sightingCard, pressed && styles.choiceChipPressed]}
              >
                <View style={styles.sightingCardHeader}>
                  <Text style={styles.sightingCardTitle}>{formatSafetyCreatedAt(sighting.sightingAtIso)}</Text>
                  <Text style={styles.sightingCardPlace}>{sighting.locationLabel}</Text>
                </View>
                {isOpen ? (
                  <View style={styles.sightingDetail}>
                    <Text style={styles.sightingDetailText}>Tipo: {formatSightingLabel(sighting.sightingType)}</Text>
                    <Text style={styles.sightingDetailText}>Segnalato da: {sighting.reporterName}</Text>
                    {sighting.note ? <Text style={styles.sightingDetailText}>Nota: {sighting.note}</Text> : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function SightingBottomSheet({
  alert,
  draft,
  note,
  accepted,
  submitting,
  canSubmit,
  onChangeNote,
  onToggleAccepted,
  onSubmit,
  onClose,
}: {
  alert: SafetyAlertModel | null;
  draft: SafetyLocationDraft;
  note: string;
  accepted: boolean;
  submitting: boolean;
  canSubmit: boolean;
  onChangeNote: (value: string) => void;
  onToggleAccepted: () => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  if (!alert) {
    return null;
  }

  return (
    <Modal transparent visible animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={styles.sightingOverlay}>
        <Pressable style={styles.sightingBackdrop} onPress={onClose} />
        <View style={styles.sightingSheet}>
          <View style={styles.sightingSheetHandle} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chiudi avvistamento"
            hitSlop={12}
            style={({ pressed }) => [styles.sightingCloseButton, pressed && styles.choiceChipPressed]}
            onPress={onClose}
          >
            <Text style={styles.sightingCloseText}>×</Text>
          </Pressable>

          <RNScrollView
            style={styles.sightingSheetScroll}
            contentContainerStyle={styles.sightingSheetContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sightingSheetHeader}>
              <Image source={baubookImages.safety.sighting} style={styles.sightingHeroIcon} />
              <View style={styles.sightingSheetCopy}>
                <Text style={styles.eyebrow}>AVVISTAMENTO</Text>
                <Text style={styles.cardTitle}>Hai visto {alert.dogName ?? "questo cane"}?</Text>
                <Text style={styles.helperText}>Registra un solo avvistamento per questo alert. Se lo aggiorni, sostituisce quello precedente.</Text>
              </View>
            </View>

            <LocationInputPanel draft={draft} disabled={false} title="Dove lo hai visto" />

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nota facoltativa</Text>
              <TextInput
                value={note}
                onChangeText={onChangeNote}
                editable={!submitting}
                multiline
                placeholder="Es. visto dirigersi verso il parco, senza inseguirlo."
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.textArea]}
              />
            </View>

            <DisclaimerBox
              title="Prima di inviare"
              items={[
                "Ho visto o credo di aver visto il cane segnalato.",
                "Non pubblicherò dati sensibili o accuse verso persone.",
                "Non inseguo il cane e non entro in proprietà private.",
              ]}
              accepted={accepted}
              disabled={submitting}
              onToggle={onToggleAccepted}
            />
          </RNScrollView>

          <View style={styles.sheetActionsRow}>
            <AppButton label="Annulla" variant="ghost" disabled={submitting} onPress={onClose} />
            <AppButton
              label={submitting ? "Invio..." : "Registra"}
              variant="danger"
              disabled={!canSubmit}
              onPress={onSubmit}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SafetyCard({
  alert,
  isBusy,
  canInteract,
  onCloseLost,
  onCloseDanger,
  onOpenSighting,
  onReport,
}: {
  alert: SafetyAlertModel;
  isBusy: boolean;
  canInteract: boolean;
  onCloseLost: () => void;
  onCloseDanger: () => void;
  onOpenSighting: () => void;
  onReport: () => void;
}) {
  const danger = alert.type === "danger";
  const reportDisabled = isBusy || alert.isMine || alert.hasMyAbuseReport || !canInteract;
  const canReport = !reportDisabled;
  const canSighting = !danger && !alert.isMine && canInteract && !isBusy;

  return (
    <AppCard tone={danger ? "default" : "danger"}>
      <View style={styles.alertHeader}>
        <View style={styles.alertIconColumn}>
          {danger ? (
            <Image source={dangerIconForType(alert.dangerType ?? "other")} style={styles.alertCircleIcon} />
          ) : (
            <>
              <Image source={baubookImages.safetyCircles.lostHelp} style={styles.alertCircleIcon} />
              {alert.dogAvatarUrl ? (
                <Image source={{ uri: alert.dogAvatarUrl }} style={styles.alertCircleIcon} />
              ) : null}
            </>
          )}
          {danger && alert.severity ? (
            <Tag label={`Gravità ${alert.severity}/5`} tone={alert.severity >= 4 ? "red" : "orange"} />
          ) : null}
        </View>
        <View style={styles.alertCopy}>
          <Text style={styles.alertTitle}>{alert.title}</Text>
          <Text style={styles.alertMeta}>
            {alert.placeName} · {alert.ttlLabel} · {alert.radiusLabel}
          </Text>
          <Text style={styles.alertDescription}>{alert.description}</Text>
          <Text style={styles.alertHint}>{alert.actionHint}</Text>
          <Text style={styles.timestampText}>
            Creato: {formatSafetyCreatedAt(alert.createdAtIso)} · da {danger ? alert.reporterName : alert.ownerName}
          </Text>
        </View>
      </View>

      <View style={styles.alertActionsRow}>
        <View style={styles.alertActionLeft}>
          {!danger && alert.isMine ? (
            <AppButton label="Disattiva 🛑" variant="secondary" disabled={isBusy} onPress={onCloseLost} />
          ) : null}
          {!danger && !alert.isMine ? (
            <SightingActionButton disabled={!canSighting} onPress={onOpenSighting} />
          ) : null}
          {danger && alert.isMine ? (
            <AppButton label="Disattiva 🛑" variant="secondary" disabled={isBusy} onPress={onCloseDanger} />
          ) : null}
        </View>
        <View style={styles.alertActionRight}>
          <AppButton
            label={alert.hasMyAbuseReport ? "Già segnalato" : "Segnala abuso"}
            variant="ghost"
            disabled={!canReport}
            onPress={onReport}
          />
        </View>
      </View>

      {!danger ? <SightingsPreview alert={alert} /> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  screenShell: {
    flex: 1,
  },
  hero: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: typography.tiny,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  screenTitle: {
    color: colors.ink,
    fontSize: typography.h1,
    fontWeight: "900",
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: typography.h2,
    fontWeight: "900",
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
  helperTextDanger: {
    color: colors.danger,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: "800",
  },
  helperText: {
    color: colors.muted,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: "700",
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
  warningBox: {
    borderRadius: radius.md,
    backgroundColor: colors.orangeSoft,
    color: colors.primaryDark,
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
  safetyNoticeHeader: {
    gap: spacing.sm,
  },
  safetyNoticeTitle: {
    color: colors.ink,
    fontSize: typography.h3,
    fontWeight: "900",
  },
  safetyNoticeMessage: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 19,
    fontWeight: "700",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
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
  choiceChipDisabled: {
    opacity: 0.76,
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
  choiceChipTextDisabled: {
    color: colors.ink,
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
  inputReadonly: {
    opacity: 0.88,
    color: colors.text,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  locationModeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  manualAddressBlock: {
    gap: spacing.xs,
  },
  currentLocationBox: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  locationSummary: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: "900",
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
  acceptRowDisabled: {
    opacity: 0.55,
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
  createActionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionRowEnd: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.md,
  },
  actionRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  alertActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  alertActionLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  alertActionRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  sectionBlock: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  collapsibleHeader: {
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  collapsibleTitle: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: "900",
  },
  collapsibleIcon: {
    color: colors.primaryDark,
    fontSize: typography.h3,
    fontWeight: "900",
  },
  collapsibleContent: {
    marginTop: spacing.sm,
  },
  alertList: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  cardIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    resizeMode: "contain",
    flexShrink: 0,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  alertCircleIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    resizeMode: "contain",
    flexShrink: 0,
  },
  alertIconColumn: {
    flexShrink: 0,
    alignItems: "center",
    gap: spacing.xs,
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
  readonlyWarning: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.redSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
  },
  readonlyWarningText: {
    color: colors.danger,
    fontSize: typography.small,
    fontWeight: "900",
  },
  sightingsBox: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  sightingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sightingsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  sightingSmallIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    resizeMode: "contain",
  },
  sightingsTitle: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: "900",
  },
  sightingsGrid: {
    gap: spacing.sm,
  },
  sightingCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
    padding: spacing.sm,
    gap: spacing.xs,
  },
  sightingCardHeader: {
    gap: 2,
  },
  sightingCardTitle: {
    color: colors.ink,
    fontSize: typography.small,
    fontWeight: "900",
  },
  sightingCardPlace: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: "800",
  },
  sightingDetail: {
    marginTop: spacing.xs,
    gap: 2,
  },
  sightingDetailText: {
    color: colors.text,
    fontSize: typography.small,
    lineHeight: 18,
    fontWeight: "700",
  },
  sightingActionButton: {
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    backgroundColor: colors.greenSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  sightingActionButtonDisabled: {
    opacity: 0.55,
  },
  sightingActionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    resizeMode: "contain",
    flexShrink: 0,
  },
  sightingActionText: {
    color: colors.primaryDark,
    fontSize: typography.small,
    fontWeight: "900",
  },
  sightingOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(40, 28, 31, 0.28)",
  },
  sightingBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  sightingSheet: {
    maxHeight: "85%",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  sightingSheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sightingCloseButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.md,
    zIndex: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  sightingCloseText: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "900",
  },
  sightingSheetScroll: {
    flexGrow: 0,
  },
  sightingSheetContent: {
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  sightingSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingRight: 44,
  },
  sightingHeroIcon: {
    width: 88,
    height: 82,
    borderRadius: radius.lg,
    resizeMode: "cover",
    flexShrink: 0,
  },
  sightingSheetCopy: {
    flex: 1,
    gap: 4,
  },
  sheetActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  toastOverlay: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: 120,
    zIndex: 50,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  toastText: {
    color: colors.ink,
    fontSize: typography.small,
    fontWeight: "900",
    textAlign: "center",
  },
});
