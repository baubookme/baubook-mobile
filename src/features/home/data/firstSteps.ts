export type FirstStepKey = 'dogProfile' | 'map' | 'safety';

export type FirstStep = {
  key: FirstStepKey;
  id: FirstStepKey;
  title: string;
  description: string;
  actionLabel: string;
  doneLabel: string;
};

export const firstSteps: FirstStep[] = [
  {
    key: 'dogProfile',
    id: 'dogProfile',
    title: 'Completa il profilo 🐾',
    description: 'Aggiungi o controlla i dati principali del tuo 🐾 per rendere BauBook più utile.',
    actionLabel: 'Ho completato il profilo',
    doneLabel: 'Profilo visto'
  },
  {
    key: 'map',
    id: 'map',
    title: 'Esplora la mappa',
    description: 'Guarda aree cani, luoghi dog-friendly e punti utili vicino a te.',
    actionLabel: 'Ho visto la mappa',
    doneLabel: 'Mappa vista'
  },
  {
    key: 'safety',
    id: 'safety',
    title: 'Prova Safety',
    description: "Dai un'occhiata agli strumenti per cane smarrito, pericolo e segnalazioni di zona.",
    actionLabel: 'Ho visto Safety',
    doneLabel: 'Safety vista'
  }
];

export const FIRST_STEPS = firstSteps;
export type FirstStepId = FirstStepKey;