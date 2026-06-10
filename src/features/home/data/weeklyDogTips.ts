export type WeeklyDogTip = {
  id: string;
  title: string;
  body: string;
};

export const WEEKLY_DOG_TIPS: WeeklyDogTip[] = [
  {
    id: 'asfalto-caldo',
    title: "Prima della passeggiata, controlla l'asfalto",
    body: 'Se il suolo scotta dopo pochi secondi sul dorso della mano, meglio scegliere ombra, erba o orari piu freschi.'
  },
  {
    id: 'acqua-sempre',
    title: 'Porta acqua anche nelle uscite brevi',
    body: 'Una piccola borraccia può fare la differenza, soprattutto per cuccioli, anziani e cani brachicefali.'
  },
  {
    id: 'guinzaglio-serale',
    title: 'La sera scegli dettagli visibili',
    body: 'Collare, pettorina o luce riflettente aiutano automobilisti, ciclisti e altri proprietari a vedervi prima.'
  },
  {
    id: 'pause-annusata',
    title: 'Lascia spazio alle annusate',
    body: 'Per molti cani annusare è parte essenziale della passeggiata: riduce stress e aumenta appagamento.'
  }
];

export const weeklyDogTips = WEEKLY_DOG_TIPS;

export function getWeeklyDogTip(date: Date = new Date()): WeeklyDogTip {
  const start = new Date(date.getFullYear(), 0, 1);
  const day = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const index = Math.abs(Math.floor(day / 7)) % WEEKLY_DOG_TIPS.length;
  return WEEKLY_DOG_TIPS[index];
}

export const getCurrentWeeklyDogTip = getWeeklyDogTip;