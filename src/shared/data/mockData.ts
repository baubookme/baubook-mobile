import { baubookImages } from '../assets/images';
import type {
  AlertModel,
  ComingSoonFeatureModel,
  DogProfileDraft,
  FeatureCardModel,
  PlaceModel,
  WalkPlanModel,
} from '../types/domain';

export const heroPromises = [
  'So dove andare col cane.',
  'So chi c\'è o chi va a passeggiare.',
  'Se succede qualcosa, la community locale mi aiuta.',
];

export const mvpFeatures: FeatureCardModel[] = [
  {
    eyebrow: 'Promessa 1',
    title: 'Dove andiamo?',
    description: 'Aree cani, passeggiate e luoghi utili attorno a Venezia-Mestre, con tag pratici e recensioni leggere.',
    icon: baubookImages.icons.map,
    tint: 'teal',
    tab: 'map',
  },
  {
    eyebrow: 'Promessa 2',
    title: 'Cerco amici!',
    description: 'Programma una passeggiata e fai sapere che accetti compagnia, senza condividere posizione live di default.',
    icon: baubookImages.icons.walks,
    tint: 'orange',
    tab: 'walks',
  },
  {
    eyebrow: 'Promessa 3',
    title: 'Mi sono perso! / Pericolo!',
    description: 'Alert locali, avvistamenti, recupero e segnalazioni temporanee con report abuso e audit minimo.',
    icon: baubookImages.icons.safety,
    tint: 'red',
    tab: 'alerts',
  },
];

export const comingSoonFeatures: ComingSoonFeatureModel[] = [
  {
    title: 'Foto, video e story',
    subtitle: 'post leggeri dal profilo del cane',
    icon: baubookImages.icons.stories,
    tone: 'pink',
  },
  {
    title: 'I miei amici',
    subtitle: 'friendly list e messaggi tra umani',
    icon: baubookImages.icons.friends,
    tone: 'teal',
  },
  {
    title: 'Il mio fidanzato/a',
    subtitle: 'profili aggregati e anniversari buffi',
    icon: baubookImages.icons.favorites,
    tone: 'pink',
  },
  {
    title: 'Cerco dog sitter',
    subtitle: 'consigli locali dalla community',
    icon: baubookImages.icons.dogSitter,
    tone: 'orange',
  },
  {
    title: 'Vieni a trovarmi',
    subtitle: 'visite e incontri con privacy forte',
    icon: baubookImages.icons.messages,
    tone: 'green',
  },
  {
    title: 'Dal dottore? Uff!',
    subtitle: 'esperienze sui veterinari di fiducia',
    icon: baubookImages.icons.vet,
    tone: 'red',
  },
  {
    title: 'Andiamo in vacanza',
    subtitle: 'itinerari e luoghi pet-friendly',
    icon: baubookImages.icons.holidays,
    tone: 'teal',
  },
  {
    title: '4Crocche in Padella',
    subtitle: 'preferiti, bleah e consigli dello chef',
    icon: baubookImages.icons.food,
    tone: 'orange',
  },
  {
    title: 'Negozi pet',
    subtitle: 'spesa, snack e luoghi linkati a Maps',
    icon: baubookImages.icons.petShop,
    tone: 'green',
  },
  {
    title: 'Volantini premium',
    subtitle: 'template più curati per emergenze',
    icon: baubookImages.icons.reports,
    tone: 'red',
  },
];

export const demoDog: DogProfileDraft = {
  name: 'Spritz',
  headline: 'Io sono Spritz: esploratore lagunare, annusatore professionista e collaudatore di panchine.',
  personalityTags: ['curioso', 'buffo', 'coccolone', 'furbetto'],
  socialityTags: ['ok cani piccoli', 'saluta piano', 'no folla'],
  walkTags: ['ombra', 'fontanella', 'poca strada'],
  notes: [
    'Non amo i cani troppo irruenti al primo incontro.',
    'Mi piacciono le passeggiate mattutine e le aree tranquille.',
    'Se mi vedi agitato, dammi spazio: poi torno simpatico.',
  ],
};

export const productionSeedPlaces: PlaceModel[] = [
  {
    id: 'parco-san-giuliano-demo',
    name: 'Parco San Giuliano',
    kind: 'walk',
    area: 'Mestre / San Giuliano',
    distanceLabel: 'demo: 2,4 km',
    description: 'Percorso ampio, aria aperta e buono per passeggiate lunghe. Dati demo da verificare in beta.',
    tags: ['passeggiata lunga', 'verde', 'vento laguna'],
    scoreLabel: '4.6 bau',
    icon: baubookImages.icons.route,
    moderationStatus: 'approved',
  },
  {
    id: 'bissuola-demo',
    name: 'Area verde Bissuola',
    kind: 'dog_area',
    area: 'Mestre / Carpenedo',
    distanceLabel: 'demo: 1,8 km',
    description: 'Scheda pronta per recensioni su ombra, pulizia, fontanelle e affollamento.',
    tags: ['area cani', 'ombra', 'fontanella?'],
    scoreLabel: '4.2 bau',
    icon: baubookImages.icons.dogArea,
    moderationStatus: 'pending',
  },
  {
    id: 'veterinario-demo',
    name: 'Veterinario vicino a me',
    kind: 'vet',
    area: 'Venezia-Mestre',
    distanceLabel: 'da Maps',
    description: 'Placeholder per ricerca Google Places: non copiare dati, salva solo Place ID e contenuti BauBook.',
    tags: ['recapiti', 'urgenze', 'esperienze'],
    scoreLabel: 'Maps',
    icon: baubookImages.icons.vet,
    moderationStatus: 'approved',
  },
];

export const demoWalkPlans: WalkPlanModel[] = [
  {
    id: 'walk-1',
    dogName: 'Spritz',
    placeName: 'Parco San Giuliano',
    startsAtLabel: 'Oggi · 18:30',
    message: 'Passeggiata tranquilla, ritmo annusata contemplativa.',
    acceptsCompany: true,
    tags: ['30-45 min', 'ok cani calmi', 'niente live tracking'],
  },
  {
    id: 'walk-2',
    dogName: 'Nina',
    placeName: 'Bissuola',
    startsAtLabel: 'Domani · 08:00',
    message: 'Giro pre-lavoro, se qualcuno passa ci salutiamo.',
    acceptsCompany: true,
    tags: ['mattina', 'cucciola', 'socialità soft'],
  },
];

export const demoAlerts: AlertModel[] = [
  {
    id: 'alert-lost-demo',
    type: 'lost_dog',
    title: 'Mi sono perso! — esempio chiuso',
    area: 'Mestre centro · area indicativa',
    status: 'resolved',
    ttlLabel: 'storico demo',
    description: 'Flusso: crea alert, notifica utenti in raggio, raccogli avvistamenti, chiudi come recuperato.',
    icon: baubookImages.icons.lostDog,
  },
  {
    id: 'alert-danger-demo',
    type: 'danger',
    title: 'Pericolo! — bocconi sospetti',
    area: 'Zona parco · posizione approssimata',
    status: 'active',
    ttlLabel: 'scade tra 6h',
    description: 'Segnalazione temporanea con conferme, report abuso, dismissione automatica e moderazione.',
    icon: baubookImages.icons.danger,
  },
];

export const moderationChecklist = [
  'reports e blocks già previsti nello schema',
  'moderation_status su contenuti UGC',
  'content_visibility per pubblico/amici/privato/rimosso',
  'audit log minimo su alert, report e rimozioni',
  'ban/sospensione utente lato admin',
  'alert delicati solo per utenti verificati',
];
