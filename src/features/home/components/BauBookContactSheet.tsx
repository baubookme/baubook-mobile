import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

export type BauBookContactKind = 'partnership' | 'feedback';

type ContactPayload = {
  request_type: BauBookContactKind;
  name?: string;
  city?: string;
  contact_email?: string;
  contact_phone?: string;
  message: string;
  source: string;
  app_version?: string;
  created_at?: string;
};

export type BauBookContactSheetProps = {
  visible?: boolean;
  type?: BauBookContactKind;
  kind?: BauBookContactKind;
  requestType?: BauBookContactKind;
  initialType?: BauBookContactKind;
  source?: string;
  onClose?: () => void;
  onDismiss?: () => void;
  onSubmitted?: () => void;
  [key: string]: unknown;
};

const OUTBOX_KEY = 'baubook.contact.outbox.v1';

function getRequestType(props: BauBookContactSheetProps): BauBookContactKind {
  return props.type || props.kind || props.requestType || props.initialType || 'feedback';
}

function getSupabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL || '';
}

function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
}

async function saveToLocalOutbox(payload: ContactPayload): Promise<void> {
  const raw = await AsyncStorage.getItem(OUTBOX_KEY);
  const current = raw ? JSON.parse(raw) : [];
  current.push({
    ...payload,
    created_at: payload.created_at || new Date().toISOString(),
    pending: true
  });
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(current));
}

async function sendToFunction(payload: ContactPayload): Promise<boolean> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  const endpoint = supabaseUrl.replace(/\/$/, '') + '/functions/v1/contact-request';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + supabaseAnonKey,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return response.ok;
}

async function saveToSupabaseTable(payload: ContactPayload): Promise<boolean> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  const endpoint = supabaseUrl.replace(/\/$/, '') + '/rest/v1/contact_requests';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + supabaseAnonKey,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(payload)
  });

  return response.ok;
}

export function BauBookContactSheet(props: BauBookContactSheetProps) {
  const requestType = getRequestType(props);
  const visible = Boolean(props.visible);
  const close = props.onClose || props.onDismiss || (() => undefined);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'saved' | 'error'>('idle');

  const title = useMemo(() => {
    return requestType === 'partnership' ? 'Richiedi partnership' : 'Invia feedback beta';
  }, [requestType]);

  const helper = useMemo(() => {
    if (requestType === 'partnership') {
      return 'Raccontaci la tua attività dog-friendly. Il telefono è facoltativo.';
    }

    return 'Mandaci un feedback sulla beta. Telefono ed email sono facoltativi.';
  }, [requestType]);

  async function submit() {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setStatus('error');
      return;
    }

    setStatus('sending');

    const payload: ContactPayload = {
      request_type: requestType,
      name: name.trim() || undefined,
      city: city.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      message: trimmedMessage,
      source: String(props.source || 'home'),
      app_version: process.env.EXPO_PUBLIC_APP_VERSION || undefined,
      created_at: new Date().toISOString()
    };

    try {
      const sent = await sendToFunction(payload);
      if (sent) {
        setStatus('sent');
        props.onSubmitted?.();
        return;
      }

      const saved = await saveToSupabaseTable(payload);
      if (saved) {
        setStatus('saved');
        props.onSubmitted?.();
        return;
      }

      await saveToLocalOutbox(payload);
      setStatus('saved');
      props.onSubmitted?.();
    } catch (_error) {
      await saveToLocalOutbox(payload);
      setStatus('saved');
      props.onSubmitted?.();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={close} accessibilityRole="button">
              <Text style={styles.close}>Chiudi</Text>
            </Pressable>
          </View>

          <Text style={styles.helper}>{helper}</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={requestType === 'partnership' ? 'Nome attività o referente' : 'Nome'}
            style={styles.input}
          />

          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Città"
            style={styles.input}
          />

          <TextInput
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="Email per essere ricontattato (facoltativa)"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <TextInput
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="Telefono (facoltativo)"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={requestType === 'partnership' ? 'Messaggio o proposta partnership' : 'Scrivi il tuo feedback'}
            multiline
            style={[styles.input, styles.textArea]}
          />

          {status === 'error' ? (
            <Text style={styles.error}>Scrivi almeno un messaggio prima di inviare.</Text>
          ) : null}

          {status === 'sent' ? (
            <Text style={styles.success}>Messaggio inviato. Grazie!</Text>
          ) : null}

          {status === 'saved' ? (
            <Text style={styles.success}>Messaggio salvato. Verrà inviato appena il canale sarà disponibile.</Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={status === 'sending'}
            style={[styles.button, status === 'sending' ? styles.buttonDisabled : null]}
            accessibilityRole="button"
          >
            {status === 'sending' ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.buttonText}>Invia</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default BauBookContactSheet;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.28)'
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2b241d'
  },
  close: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7a5a36'
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6f6258',
    marginBottom: 14
  },
  input: {
    borderWidth: 1,
    borderColor: '#eadfce',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 10,
    color: '#2b241d',
    backgroundColor: '#fffaf3'
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top'
  },
  button: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f7d46',
    marginTop: 6
  },
  buttonDisabled: {
    opacity: 0.65
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15
  },
  error: {
    color: '#b3261e',
    marginBottom: 8,
    fontWeight: '700'
  },
  success: {
    color: '#2f7d46',
    marginBottom: 8,
    fontWeight: '700'
  }
});