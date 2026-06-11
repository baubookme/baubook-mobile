import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import BauBookIcon from '../../../components/BauBookIcon';

type DogDiaryEventType = 'walk' | 'food' | 'vet' | 'medicine' | 'grooming' | 'note';

type DogDiaryEvent = {
  id: string;
  type: DogDiaryEventType;
  title: string;
  note?: string;
  createdAt: string;
};

const STORAGE_KEY = "baubook.dogDiary.events.v1";

const eventTypes: Array<{ type: DogDiaryEventType; label: string }> = [
  { type: 'walk', label: 'Passeggiata' },
  { type: 'food', label: 'Pappa' },
  { type: 'vet', label: 'Veterinario' },
  { type: 'medicine', label: 'Farmaco' },
  { type: 'grooming', label: 'Toelettatura' },
  { type: 'note', label: 'Nota' }
];

function getEventLabel(type: DogDiaryEventType) {
  return eventTypes.find((item) => item.type === type)?.label || "Nota";
}

function getIconName(type: DogDiaryEventType) {
  if (type === "walk") return "walk";
  if (type === "food") return "food";
  if (type === "vet") return "vet";
  if (type === "medicine") return "medicine";
  if (type === "grooming") return "grooming";
  return "note";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Oggi";
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

export function HomeDogDiaryLite() {
  const [events, setEvents] = useState<DogDiaryEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DogDiaryEventType>('walk');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setEvents(parsed.slice(0, 20));
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const visibleEvents = useMemo(() => events.slice(0, 4), [events]);

  async function persist(next: DogDiaryEvent[]) {
    setEvents(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async function addEvent() {
    const safeTitle = title.trim() || getEventLabel(type);
    const newEvent: DogDiaryEvent = {
      id: Date.now().toString(),
      type,
      title: safeTitle,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    await persist([newEvent, ...events].slice(0, 20));
    setTitle('');
    setNote('');
    setType("walk");
    setOpen(false);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BauBookIcon name="diary" tone="blue" size={22} />
          <View>
            <Text style={styles.eyebrow}>Beta feature</Text>
            <Text style={styles.title}>Dog Diary</Text>
          </View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.addButton}>
          <Text style={styles.addButtonText}>Aggiungi</Text>
        </Pressable>
      </View>

      <Text style={styles.body}>Registra passeggiate, note salute e piccoli eventi quotidiani del tuo cane.</Text>

      {visibleEvents.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nessun evento ancora</Text>
          <Text style={styles.emptyText}>Aggiungi il primo evento per iniziare lo storico del tuo cane.</Text>
        </View>
      ) : (
        <View style={styles.eventList}>
          {visibleEvents.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <BauBookIcon name={getIconName(event.type)} tone="neutral" size={20} />
              <View style={styles.eventTextWrap}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>{getEventLabel(event.type)} · {formatDate(event.createdAt)}</Text>
                {event.note ? <Text style={styles.eventNote}>{event.note}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nuovo evento Dog Diary</Text>
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
                <Text style={styles.closeText}>Chiudi</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {eventTypes.map((item) => {
                const selected = item.type === type;
                return (
                  <Pressable
                    key={item.type}
                    accessibilityRole="button"
                    onPress={() => setType(item.type)}
                    style={[styles.typeChip, selected ? styles.typeChipSelected : null]}
                  >
                    <Text style={[styles.typeChipText, selected ? styles.typeChipTextSelected : null]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Titolo evento"
              style={styles.input}
            />

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Nota facoltativa"
              multiline
              style={[styles.input, styles.textArea]}
            />

            <Pressable accessibilityRole="button" onPress={addEvent} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Salva evento</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default HomeDogDiaryLite;

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#f7fbff',
    borderColor: '#dceafe',
    borderWidth: 1,
    marginBottom: 14
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#557194',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: '#233349'
  },
  body: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#5b6b7f'
  },
  addButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#dceafe'
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#24456e'
  },
  emptyBox: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#ffffff',
    borderColor: '#e6eef8',
    borderWidth: 1
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#233349'
  },
  emptyText: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: '#6f7f92'
  },
  eventList: {
    marginTop: 12,
    gap: 10
  },
  eventRow: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#ffffff',
    borderColor: '#e6eef8',
    borderWidth: 1
  },
  eventTextWrap: {
    flex: 1
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#233349'
  },
  eventMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#6f7f92'
  },
  eventNote: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#4f6075'
  },
  modalBackdrop: {
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
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#233349'
  },
  closeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#557194'
  },
  typeRow: {
    gap: 8,
    paddingBottom: 12
  },
  typeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eef3f9'
  },
  typeChipSelected: {
    backgroundColor: '#24456e'
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#557194'
  },
  typeChipTextSelected: {
    color: '#fff'
  },
  input: {
    borderWidth: 1,
    borderColor: '#dde7f3',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 10,
    color: '#233349',
    backgroundColor: '#f8fbff'
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: 'top'
  },
  saveButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#24456e'
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15
  }
});
