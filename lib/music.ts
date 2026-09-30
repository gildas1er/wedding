// Musique d'ambiance de l'invitation.
// music_url en base : NULL = mélodie d'origine, 'none' = sans musique, sinon l'adresse du morceau.

export type Track = {
  id: string;
  title: string;
  composer: string;
  mood: string;
  url: string;
  credit?: string; // mention obligatoire pour les licences CC BY
};

export const DEFAULT_TRACK: Track = {
  id: 'origine',
  title: "Mélodie d'origine",
  composer: 'Musique par défaut',
  mood: 'Utilisée jusqu’ici sur les invitations',
  url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
};

// Enregistrements libres de droits (Wikimedia Commons), licences vérifiées
export const TRACKS: Track[] = [
  DEFAULT_TRACK,
  {
    id: 'canon',
    title: 'Canon en ré',
    composer: 'Pachelbel',
    mood: 'Le grand classique des mariages',
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/c6/Canon_in_D_Major_%28ISRC_USUAN1100301%29.mp3',
    credit: '« Canon in D Major » — Kevin MacLeod (incompetech.com), licence CC BY 3.0',
  },
  {
    id: 'wagner',
    title: 'Marche nuptiale',
    composer: 'Wagner — version piano',
    mood: "L'entrée de la mariée",
    url: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Wagner_Bridal_Chorus_-_piano_%28ISRC_USUAN1100022%29.mp3',
    credit: '« Wagner Bridal Chorus (piano) » — Kevin MacLeod (incompetech.com), licence CC BY 3.0',
  },
  {
    id: 'bach-joie',
    title: 'Jésus que ma joie demeure',
    composer: 'Bach',
    mood: 'Lumineux, recueilli',
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Jesu%2C_Joy_of_Man%27s_Desiring_%28ISRC_USUAN1100189%29.mp3',
    credit: "« Jesu, Joy of Man's Desiring » — Kevin MacLeod (incompetech.com), licence CC BY 3.0",
  },
  {
    id: 'bach-air',
    title: 'Air',
    composer: 'Bach — orchestre à cordes',
    mood: 'Élégant, intemporel',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Air_-_Air_Force_Strings_-_United_States_Air_Force_Band.mp3',
  },
];

export const NO_MUSIC = 'none';

export function resolveMusic(musicUrl: string | null | undefined): { url: string | null; track: Track | null; isCustom: boolean } {
  if (musicUrl === NO_MUSIC) return { url: null, track: null, isCustom: false };
  if (!musicUrl) return { url: DEFAULT_TRACK.url, track: DEFAULT_TRACK, isCustom: false };
  const track = TRACKS.find((t) => t.url === musicUrl) ?? null;
  return { url: musicUrl, track, isCustom: !track };
}
