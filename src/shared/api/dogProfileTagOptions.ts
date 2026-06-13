import { hasSupabaseConfig } from '../lib/env';
import { getSupabaseClient } from '../lib/supabase';

export interface DogProfileTagOption {
  key: string;
  label: string;
  sortOrder: number;
}

interface RemoteDogProfileTagOptionRow {
  key: string;
  label: string;
  sort_order: number | null;
}

export const fallbackDogProfileTags: DogProfileTagOption[] = [
  { key: 'calmo', label: 'calmo', sortOrder: 10 },
  { key: 'curioso', label: 'curioso', sortOrder: 20 },
  { key: 'coccolone', label: 'coccolone', sortOrder: 30 },
  { key: 'giocherellone', label: 'giocherellone', sortOrder: 40 },
  { key: 'timido', label: 'timido', sortOrder: 50 },
  { key: 'coraggioso', label: 'coraggioso', sortOrder: 60 },
  { key: 'protettivo', label: 'protettivo', sortOrder: 70 },
  { key: 'dolce', label: 'dolce', sortOrder: 80 },
  { key: 'buffo', label: 'buffo', sortOrder: 90 },
  { key: 'vivace', label: 'vivace', sortOrder: 100 },
  { key: 'riflessivo', label: 'riflessivo', sortOrder: 110 },
  { key: 'testardo', label: 'testardo', sortOrder: 120 },
  { key: 'socievole', label: 'socievole', sortOrder: 130 },
  { key: 'selettivo', label: 'selettivo', sortOrder: 140 },
  { key: 'ama umani calmi', label: 'ama umani calmi', sortOrder: 150 },
  { key: 'ama bambini', label: 'ama bambini', sortOrder: 160 },
  { key: 'ok cani piccoli', label: 'ok cani piccoli', sortOrder: 170 },
  { key: 'ok cani grandi', label: 'ok cani grandi', sortOrder: 180 },
  { key: 'meglio al guinzaglio', label: 'meglio al guinzaglio', sortOrder: 190 },
  { key: 'no caos', label: 'no caos', sortOrder: 200 },
  { key: 'pausa sniff', label: 'pausa sniff', sortOrder: 210 },
  { key: 'ama l ombra', label: 'ama l ombra', sortOrder: 220 },
  { key: 'ama il sole', label: 'ama il sole', sortOrder: 230 },
  { key: 'fontanella lover', label: 'fontanella lover', sortOrder: 240 },
  { key: 'passeggiata lenta', label: 'passeggiata lenta', sortOrder: 250 },
  { key: 'passeggiata lunga', label: 'passeggiata lunga', sortOrder: 260 },
  { key: 'parco preferito', label: 'parco preferito', sortOrder: 270 },
  { key: 'area cani sì', label: 'area cani sì', sortOrder: 280 },
  { key: 'area cani no', label: 'area cani no', sortOrder: 290 },
  { key: 'acqua sempre', label: 'acqua sempre', sortOrder: 300 },
  { key: 'pallina dipendente', label: 'pallina dipendente', sortOrder: 310 },
  { key: 'bastoncino fan', label: 'bastoncino fan', sortOrder: 320 },
  { key: 'fiuta tutto', label: 'fiuta tutto', sortOrder: 330 },
  { key: 'saluta tutti', label: 'saluta tutti', sortOrder: 340 },
  { key: 'non ama sorprese', label: 'non ama sorprese', sortOrder: 350 },
  { key: 'sensibile ai rumori', label: 'sensibile ai rumori', sortOrder: 360 },
  { key: 'paura botti', label: 'paura botti', sortOrder: 370 },
  { key: 'veterano', label: 'veterano', sortOrder: 380 },
  { key: 'cucciolo', label: 'cucciolo', sortOrder: 390 },
  { key: 'senior', label: 'senior', sortOrder: 400 },
  { key: 'energia alta', label: 'energia alta', sortOrder: 410 },
  { key: 'energia bassa', label: 'energia bassa', sortOrder: 420 },
  { key: 'cerca amici', label: 'cerca amici', sortOrder: 430 },
  { key: 'preferisce spazio', label: 'preferisce spazio', sortOrder: 440 },
  { key: 'training mode', label: 'training mode', sortOrder: 450 },
  { key: 'premietti ok', label: 'premietti ok', sortOrder: 460 },
  { key: 'allergie', label: 'allergie', sortOrder: 470 },
  { key: 'non condividere cibo', label: 'non condividere cibo', sortOrder: 480 },
  { key: 'zampa delicata', label: 'zampa delicata', sortOrder: 490 },
  { key: 'super annusatore', label: 'super annusatore', sortOrder: 500 },
];

export async function fetchDogProfileTagOptions(): Promise<DogProfileTagOption[]> {
  const client = getSupabaseClient();

  if (!hasSupabaseConfig || !client) {
    return fallbackDogProfileTags;
  }

  const { data, error } = await client
    .from('dog_profile_tag_options')
    .select('key, label, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return fallbackDogProfileTags;
  }

  const options = ((data ?? []) as RemoteDogProfileTagOptionRow[])
    .map((row) => ({
      key: row.key,
      label: row.label,
      sortOrder: row.sort_order ?? 0,
    }))
    .filter((row) => row.key && row.label);

  return options.length ? options : fallbackDogProfileTags;
}
