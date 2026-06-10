export type WeeklyDogTip = {
  id: string;
  title: string;
  body: string;
};

const WEEKLY_DOG_TIPS: WeeklyDogTip[] = [
  {
    id: 'summer-asphalt',
    title: 'Prima della passeggiata, controlla l’asfalto',
    body: 'Se il suolo scotta dopo pochi secondi sul dorso della mano, meglio scegliere ombra, erba o orari più freschi.',
  },
  {
    id: 'water-breaks',
    title: 'Porta acqua anche nelle uscite brevi',
    body: 'Una piccola borraccia e pause frequenti aiutano il cane a recuperare, soprattutto nei percorsi urbani.',
  },
  {
    id: 'dog-area-entry',
    title: 'Area cani: ingresso calmo, uscita serena',
    body: 'Prima di entrare osserva il gruppo, sciogli il guinzaglio solo quando il cane è tranquillo e richiama prima che si stanchi.',
  },
  {
    id: 'microchip-check',
    title: 'Contatti aggiornati: piccolo gesto, grande sicurezza',
    body: 'Verifica periodicamente che recapiti e dati associati al cane siano corretti, così è più facile ritrovarsi in caso di smarrimento.',
  },
  {
    id: 'urban-noise',
    title: 'Rumori improvvisi: lascia una via di fuga emotiva',
    body: 'Se il cane si blocca o tira, aumenta la distanza dallo stimolo e premia il recupero invece di forzare l’avvicinamento.',
  },
  {
    id: 'paw-care',
    title: 'Zampe sotto osservazione dopo parchi e città',
    body: 'Dopo la passeggiata controlla cuscinetti e spazi tra le dita: piccoli fastidi si notano prima che diventino un problema.',
  },
];

function getIsoWeekSeed(date: Date): number {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return utcDate.getUTCFullYear() * 53 + week;
}

export function getWeeklyDogTip(date = new Date()): WeeklyDogTip {
  const index = Math.abs(getIsoWeekSeed(date)) % WEEKLY_DOG_TIPS.length;
  return WEEKLY_DOG_TIPS[index];
}
