import { loadDogDiaryEvents, saveDogDiaryEvents } from '../dogDiaryBackend'; import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import BauBookIcon from '../../../components/BauBookIcon';

type DogDiaryCategory = 'walk' | 'food' | 'vet' | 'medicine' | 'grooming' | 'note';
type DogDiaryFilter = 'all' | 'walks' | 'health' | 'notes';

type DogDiaryEvent = {
  id: string;
  category: DogDiaryCategory;
  note: string;
  createdAt: string;
};

type CategoryConfig = {
  key: DogDiaryCategory;
  label: string;
  icon: string;
};

const CATEGORIES: CategoryConfig[] = [
  { key: 'walk', label: 'Passeggiata', icon: 'walk' },
  { key: 'food', label: 'Pappa', icon: 'food' },
  { key: 'vet', label: 'Veterinario', icon: 'vet' },
  { key: 'medicine', label: 'Farmaco', icon: 'medicine' },
  { key: 'grooming', label: 'Toelettatura', icon: 'grooming' },
  { key: 'note', label: 'Nota', icon: 'note' }
];

const FILTERS: Array<{ key: DogDiaryFilter; label: string }> = [
  { key: 'all', label: 'Tutti' },
  { key: 'walks', label: 'Passeggiate' },
  { key: 'health', label: 'Salute' },
  { key: 'notes', label: 'Note' }
];

function getCategory(category: DogDiaryCategory): CategoryConfig {
  return CATEGORIES.find((item) => item.key === category) || CATEGORIES[CATEGORIES.length - 1];
}

function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Oggi';

  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short'
  });
}

function isWithinLastDays(value: string, days: number): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const diff = Date.now() - date.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function matchesFilter(event: DogDiaryEvent, filter: DogDiaryFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'walks') return event.category === 'walk';
  if (filter === 'health') return event.category === 'vet' || event.category === 'medicine';
  if (filter === 'notes') return event.category === 'note';
  return true;
}

function makeId(): string {
  return 'dog-diary-' + Date.now() + '-' + Math.round(Math.random() * 100000);
}

export function HomeDogDiaryLite() {
  const [events, setEvents] = useState<DogDiaryEvent[]>([]);
  const [filter, setFilter] = useState<DogDiaryFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DogDiaryCategory>('walk');
  const [note, setNote] = useState('');

  useEffect(() => {
    let mounted = true;

    loadDogDiaryEvents<DogDiaryEvent>()
      .then((loadedEvents) => {
        if (mounted) {
          setEvents(loadedEvents);
        }
      })
      .catch(() => {
        if (mounted) {
          setEvents([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function persist(nextEvents: DogDiaryEvent[]) {
    const savedEvents = await saveDogDiaryEvents<DogDiaryEvent>(nextEvents);
    setEvents(savedEvents);
  }

  async function addEvent() {
    const category = getCategory(selectedCategory);
    const cleanNote = note.trim();

    const newEvent: DogDiaryEvent = {
      id: makeId(),
      category: selectedCategory,
      note: cleanNote || category.label,
      createdAt: new Date().toISOString()
    };

    const nextEvents = [newEvent, ...events].slice(0, 30);
    await persist(nextEvents);
    setNote('');
    setSelectedCategory('walk');
    setModalOpen(false);
  }

  const summary = useMemo(() => {
    const last7Days = events.filter((event) => isWithinLastDays(event.createdAt, 7));
    const lastEvent = events[0];
    const lastWalk = events.find((event) => event.category === 'walk');
    const lastHealth = events.find((event) => event.category === 'vet' || event.category === 'medicine');

    return {
      last7DaysCount: last7Days.length,
      lastEvent,
      lastWalk,
      lastHealth
    };
  }, [events]);

  const visibleEvents = useMemo(() => {
    return events.filter((event) => matchesFilter(event, filter)).slice(0, 6);
  }, [events, filter]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.iconBubble}>
            <BauBookIcon name="diary" size={22} />
          </View>
          <View>
            <Text style={styles.eyebrow}>Dog Diary</Text>
            <Text style={styles.title}>Il diario leggero del tuo cane</Text>
          </View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => setModalOpen(true)} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Evento</Text>
        </Pressable>
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Smart Summary</Text>
        <Text style={styles.summaryLine}>{summary.last7DaysCount} eventi negli ultimi 7 giorni</Text>
        <Text style={styles.summaryLine}>
          Ultimo evento: {summary.lastEvent ? getCategory(summary.lastEvent.category).label + ' - ' + formatDay(summary.lastEvent.createdAt) : 'nessun evento registrato'}
        </Text>
        <Text style={styles.summaryLine}>
          Ultima passeggiata: {summary.lastWalk ? formatDay(summary.lastWalk.createdAt) : 'non ancora registrata'}
        </Text>
        <Text style={styles.summaryLine}>
          Salute: {summary.lastHealth ? getCategory(summary.lastHealth.category).label + ' - ' + formatDay(summary.lastHealth.createdAt) : 'nessuna nota salute recente'}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = item.key === filter;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => setFilter(item.key)}
              style={[styles.filterChip, active ? styles.filterChipActive : null]}
            >
              <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {visibleEvents.length ? (
        <View style={styles.eventList}>
          {visibleEvents.map((event) => {
            const category = getCategory(event.category);
            return (
              <View key={event.id} style={styles.eventRow}>
                <View style={styles.eventIcon}>
                  <BauBookIcon name={category.icon} size={18} />
                </View>
                <View style={styles.eventTextWrap}>
                  <Text style={styles.eventTitle}>{category.label}</Text>
                  <Text style={styles.eventNote}>{event.note}</Text>
                </View>
                <Text style={styles.eventDate}>{formatDay(event.createdAt)}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nessun evento in questo filtro</Text>
          <Text style={styles.emptyText}>Aggiungi una passeggiata, una nota salute o un evento per iniziare.</Text>
        </View>
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Aggiungi evento</Text>
              <Pressable accessibilityRole="button" onPress={() => setModalOpen(false)}>
                <Text style={styles.closeText}>Chiudi</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Categoria</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((category) => {
                const active = category.key === selectedCategory;
                return (
                  <Pressable
                    key={category.key}
                    accessibilityRole="button"
                    onPress={() => setSelectedCategory(category.key)}
                    style={[styles.categoryChip, active ? styles.categoryChipActive : null]}
                  >
                    <BauBookIcon name={category.icon} size={16} />
                    <Text style={[styles.categoryText, active ? styles.categoryTextActive : null]}>{category.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Nota</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Scrivi una nota breve"
              multiline
              style={styles.noteInput}
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
    marginBottom: 14,
    backgroundColor: '#fffaf3',
    borderWidth: 1,
    borderColor: '#eadfce'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    marginBottom: 14
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3e6d4'
  },
  eyebrow: {
    color: '#7a5a36',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  title: {
    color: '#2b241d',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2
  },
  addButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2f7d46'
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900'
  },
  summaryBox: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#f7efe3',
    marginBottom: 12
  },
  summaryTitle: {
    color: '#2b241d',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6
  },
  summaryLine: {
    color: '#66584d',
    fontSize: 13,
    lineHeight: 19
  },
  filterRow: {
    gap: 8,
    paddingBottom: 10
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#f3eadf'
  },
  filterChipActive: {
    backgroundColor: '#2f7d46'
  },
  filterText: {
    color: '#6c5b4c',
    fontSize: 12,
    fontWeight: '800'
  },
  filterTextActive: {
    color: '#fff'
  },
  eventList: {
    gap: 8
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 10,
    backgroundColor: '#ffffff'
  },
  eventIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef8f0'
  },
  eventTextWrap: {
    flex: 1
  },
  eventTitle: {
    color: '#2b241d',
    fontSize: 14,
    fontWeight: '900'
  },
  eventNote: {
    color: '#6c5b4c',
    fontSize: 13,
    marginTop: 2
  },
  eventDate: {
    color: '#7a5a36',
    fontSize: 12,
    fontWeight: '800'
  },
  emptyBox: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#ffffff'
  },
  emptyTitle: {
    color: '#2b241d',
    fontSize: 14,
    fontWeight: '900'
  },
  emptyText: {
    color: '#6c5b4c',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  },
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  sheetTitle: {
    color: '#2b241d',
    fontSize: 20,
    fontWeight: '900'
  },
  closeText: {
    color: '#7a5a36',
    fontSize: 14,
    fontWeight: '900'
  },
  inputLabel: {
    color: '#2b241d',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f3eadf'
  },
  categoryChipActive: {
    backgroundColor: '#dff1e3'
  },
  categoryText: {
    color: '#6c5b4c',
    fontSize: 12,
    fontWeight: '800'
  },
  categoryTextActive: {
    color: '#24452d'
  },
  noteInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#eadfce',
    borderRadius: 14,
    padding: 12,
    color: '#2b241d',
    backgroundColor: '#fffaf3',
    textAlignVertical: 'top',
    marginBottom: 14
  },
  saveButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f7d46'
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900'
  }
});
