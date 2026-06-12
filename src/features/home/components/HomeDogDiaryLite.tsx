import { deleteDogDiaryEvent, loadDogDiaryEvents, saveDogDiaryEvents } from '../dogDiaryBackend';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
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

type DogDiaryEventRowProps = {
  event: DogDiaryEvent;
  category: CategoryConfig;
  deleting: boolean;
  onDelete: () => void;
};

const DELETE_ACTION_WIDTH = 104;

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

function DogDiaryEventRow({ event, category, deleting, onDelete }: DogDiaryEventRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);

  const panResponder = useMemo(
      () =>
          PanResponder.create({
            onMoveShouldSetPanResponder: (_evt, gesture) => {
              return Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
            },
            onPanResponderMove: (_evt, gesture) => {
              const start = openRef.current ? -DELETE_ACTION_WIDTH : 0;
              const next = Math.max(-DELETE_ACTION_WIDTH, Math.min(0, start + gesture.dx));
              translateX.setValue(next);
            },
            onPanResponderRelease: (_evt, gesture) => {
              const shouldOpen = gesture.dx < -32 || gesture.vx < -0.45;
              const shouldClose = gesture.dx > 24 || gesture.vx > 0.45;
              const nextOpen = shouldClose ? false : shouldOpen ? true : openRef.current;

              openRef.current = nextOpen;

              Animated.spring(translateX, {
                toValue: nextOpen ? -DELETE_ACTION_WIDTH : 0,
                useNativeDriver: true,
                friction: 9,
                tension: 80
              }).start();
            },
            onPanResponderTerminate: () => {
              Animated.spring(translateX, {
                toValue: openRef.current ? -DELETE_ACTION_WIDTH : 0,
                useNativeDriver: true,
                friction: 9,
                tension: 80
              }).start();
            }
          }),
      [translateX]
  );

  return (
      <View style={styles.swipeClip}>
        <View style={styles.deleteBehind}>
          <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Elimina evento ${category.label}`}
              disabled={deleting}
              onPress={onDelete}
              style={({ pressed }) => [
                styles.deleteAction,
                pressed ? styles.deleteActionPressed : null,
                deleting ? styles.deleteActionDisabled : null
              ]}
          >
            <Text style={styles.deleteActionText}>{deleting ? '...' : 'Elimina'}</Text>
          </Pressable>
        </View>

        <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.eventRow,
              {
                transform: [{ translateX }]
              }
            ]}
        >
          <View style={styles.eventIcon}>
            <BauBookIcon name={category.icon} size={18} />
          </View>
          <View style={styles.eventTextWrap}>
            <Text style={styles.eventTitle} numberOfLines={1}>{category.label}</Text>
            <Text style={styles.eventNote} numberOfLines={1}>{event.note}</Text>
          </View>
          <Text style={styles.eventDate} numberOfLines={1}>{formatDay(event.createdAt)}</Text>
        </Animated.View>
      </View>
  );
}

export function HomeDogDiaryLite() {
  const [events, setEvents] = useState<DogDiaryEvent[]>([]);
  const [filter, setFilter] = useState<DogDiaryFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DogDiaryCategory>('walk');
  const [note, setNote] = useState('');
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

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

  async function removeEvent(eventId: string) {
    if (deletingEventId) {
      return;
    }

    const previousEvents = events;
    const nextEvents = events.filter((event) => event.id !== eventId);

    setDeletingEventId(eventId);
    setEvents(nextEvents);

    try {
      await deleteDogDiaryEvent(eventId);
    } catch {
      setEvents(previousEvents);
    } finally {
      setDeletingEventId(null);
    }
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
        <View style={[styles.headerRow, styles.diaryHeaderAligned]}>
          <View style={styles.titleWrap}>
            <View style={styles.iconBubble}>
              <BauBookIcon name="diary" size={22} />
            </View>
            <View style={styles.titleTextWrap}>
              <Text style={styles.eyebrow}>Dog Diary</Text>
              <Text style={styles.title} numberOfLines={2}>
                Piccole cose.. il mio diario smart!
              </Text>
            </View>
          </View>

          <Pressable accessibilityRole="button" onPress={() => setModalOpen(true)} style={[styles.addButton, styles.addButtonAligned]}>
            <Text style={styles.addButtonText}>+ Evento</Text>
          </Pressable>
        </View>

        <View style={styles.summaryBox}>
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
                const deleting = deletingEventId === event.id;

                return (
                    <DogDiaryEventRow
                        key={event.id}
                        event={event}
                        category={category}
                        deleting={deleting}
                        onDelete={() => void removeEvent(event.id)}
                    />
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
  titleTextWrap: {
    flex: 1,
    minWidth: 0
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
    fontSize: 13,
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
  swipeClip: {
    position: 'relative',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden'
  },
  deleteBehind: {
    ...StyleSheet.absoluteFill,
    alignItems: 'flex-end',
    backgroundColor: '#ffffff'
  },
  eventRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 0,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 16,
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
    flex: 1,
    minWidth: 0
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
    minWidth: 58,
    marginLeft: 8,
    color: '#7a5a36',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right'
  },
  deleteAction: {
    width: DELETE_ACTION_WIDTH,
    height: '100%',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#ef4a3f'
  },
  deleteActionPressed: {
    opacity: 0.82
  },
  deleteActionDisabled: {
    opacity: 0.55
  },
  deleteActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900'
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
  },
  diaryHeaderAligned: {
    alignItems: 'center'
  },
  addButtonAligned: {
    alignSelf: 'center',
    justifyContent: 'center',
    minHeight: 34,
    marginTop: 0,
    paddingHorizontal: 16
  }
});