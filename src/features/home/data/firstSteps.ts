export type FirstStepKey = 'dogProfile' | 'map' | 'safety' | 'feedback';

export type FirstStep = {
  key: FirstStepKey;
  order: number;
  title: string;
  description: string;
  actionLabel: string;
  hint: string;
};

export const FIRST_STEPS: FirstStep[] = [
  {
    key: 'dogProfile',
    order: 1,
    title: 'Completa il profilo cane',
    description: 'Nome, foto e informazioni base rendono la beta piu utile e personale.',
    actionLabel: 'Segna fatto',
    hint: 'Apri la sezione del profilo cane dalla barra principale e completa i dati essenziali.',
  },
  {
    key: 'map',
    order: 2,
    title: 'Esplora la mappa',
    description: 'Controlla aree cani, luoghi dog-friendly e marker vicini alla tua zona.',
    actionLabel: 'Ho provato',
    hint: 'Vai nella tab Mappa e verifica se i marker sono coerenti con la tua zona.',
  },
  {
    key: 'safety',
    order: 3,
    title: 'Prova Safety',
    description: 'Guarda come funzionano segnalazioni, radar e messaggi di sicurezza.',
    actionLabel: 'Ho capito',
    hint: 'Apri Safety dalla Home o dalla sezione dedicata e verifica messaggi, disclaimer e stato alert.',
  },
  {
    key: 'feedback',
    order: 4,
    title: 'Invia feedback beta',
    description: 'Segnala cosa non e chiaro, cosa manca o cosa funziona bene.',
    actionLabel: 'Email',
    hint: 'Si apre una email gia indirizzata a admin@baubook.me con oggetto Feedback beta BauBook.',
  },
];
