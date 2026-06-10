export const BETA_EMPTY_STATES = {
  dogProfile: {
    icon: '🐶',
    title: 'Aggiungi il tuo primo cane',
    body: 'Crea il profilo del tuo cane per personalizzare passeggiate, mappa e funzioni Safety.',
    actionLabel: 'Aggiungi cane',
  },
  walks: {
    icon: '🦮',
    title: 'Inizia una passeggiata',
    body: 'Quando avvii una passeggiata, BauBook può aiutarti a ritrovare luoghi, aree e segnalazioni utili vicino a te.',
    actionLabel: 'Avvia passeggiata',
  },
  mapPlaces: {
    icon: '🗺️',
    title: 'Stiamo popolando le aree della tua zona',
    body: 'Se non vedi ancora risultati, prova ad allargare il raggio o inviaci un suggerimento per aggiungere nuovi luoghi dog-friendly.',
    actionLabel: 'Suggerisci luogo',
  },
  safety: {
    icon: '🛟',
    title: 'Nessuna segnalazione attiva vicino a te',
    body: 'Ottima notizia: al momento non risultano alert Safety nella tua area. Continua a controllare prima delle uscite.',
  },
} as const;
