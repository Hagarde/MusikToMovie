export type SectionType = 'preceding' | 'main' | 'succeeding';

export const GENRES = [
  'Cinématique / Épique',
  'Classique / Orchestral',
  'Science-Fiction',
  'Thriller / Suspense',
  'Drame / Émotion',
  'Action / Aventure',
  'Horreur / Épouvante',
  'Film Noir / Policier',
  'Électronique / Synth',
  'Rock / Metal',
  'Jazz / Blues / Soul',
  'Hip-Hop / Urbain',
  'Western',
  'Fantastique / Fantasy',
  'Animation / Poésie',
  'Romance / Sentimental',
  'Ambiance / Minimaliste',
  'Comédie / Léger',
  'Musiques du Monde / Folk',
  'Expérimental / Avant-Garde',
  'Autre / Inclassable',
];

export interface Track {
  id: string;
  title: string;
  artist: string;
  genre?: string;
  audio_url: string; // URL YouTube ou audio
  youtube_id?: string; // ID de la vidéo YouTube
  thumbnail_url?: string; // Image de couverture YouTube
  duration: number; // in seconds
  default_start_time?: number; // Moment précis de début (en secondes)
  default_end_time?: number; // Moment précis de fin du segment (en secondes)
  created_at: string;
  proposal_count?: number;
}

export interface Scene {
  id?: string;
  proposal_id?: string;
  section_type: SectionType;
  scene_title: string;
  description: string;
  image_data: string;
  start_time: number;
  end_time: number;
  order_index: number;
}

export interface Proposal {
  id: string;
  track_id: string;
  author_name: string;
  movie_title: string;
  genre: string;
  logline: string;
  
  // Nouveau format épuré & centré sur la Scène Clé
  context_before?: string; // Description textuelle de ce qui précède
  context_after?: string;  // Description textuelle de ce qui succède
  
  key_scene_title?: string;
  key_scene_description?: string;
  key_scene_start_time?: number;
  key_scene_end_time?: number;
  frames?: string[]; // Liste des dessins (frames d'animation / flipbook)
  animation_fps?: number; // Vitesse de lecture en images par seconde

  likes_count?: number;
  created_at: string;
  track?: Track;
  scenes?: Scene[];
}

export interface EQSettings {
  bass: number;    // Gain en dB (-12 à +12)
  mid: number;     // Gain en dB (-12 à +12)
  treble: number;  // Gain en dB (-12 à +12)
  volume: number;  // Volume master (0 à 1.5)
}

export interface AudioTrack {
  id: string;
  name: string;
  audio_data: string; // Base64 de l'audio
  duration: number;   // Durée brute en secondes
  trim_start: number; // Rognage début (s) pour éliminer le clic
  trim_end: number;   // Rognage fin (s)
  is_muted: boolean;
  is_solo?: boolean;
  eq_settings: EQSettings;
  waveform?: number[]; // Tableau des crêtes d'amplitude pour la timeline style Audacity
}

export interface MovieToMusikProject {
  id: string;
  title: string;
  creator_name: string;
  genre: string;
  visual_type: 'video' | 'gif' | 'image';
  visual_url: string; // Base64 ou URL de la vidéo / du gif / de l'image
  tracks: AudioTrack[]; // Liste de toutes les pistes audio du projet
  audio_data?: string; // Base64 de secours (rétrocompatibilité)
  duration: number;    // Durée maximale de la composition en secondes
  eq_settings?: EQSettings;
  description?: string;
  likes_count?: number;
  created_at: string;
}

export type StemType = 'vocals' | 'drums' | 'bass' | 'melody';

export type StemSourceChoice = 'A' | 'B' | 'both' | 'none';

export interface StemMixConfig {
  vocals: { source: StemSourceChoice; volumeA: number; volumeB: number; isMuted: boolean };
  drums: { source: StemSourceChoice; volumeA: number; volumeB: number; isMuted: boolean };
  bass: { source: StemSourceChoice; volumeA: number; volumeB: number; isMuted: boolean };
  melody: { source: StemSourceChoice; volumeA: number; volumeB: number; isMuted: boolean };
}

export interface MashupTrackInfo {
  title: string;
  artist: string;
  audio_url: string;
  thumbnail_url?: string;
  youtube_id?: string;
  genre?: string;
}

export interface MusikToMusikProject {
  id: string;
  title: string;
  creator_name: string;
  genre: string;
  trackA: MashupTrackInfo;
  trackB: MashupTrackInfo;
  stem_config: StemMixConfig;
  speed_ratio_B: number; // Ratio tempo (ex: 1.05)
  offset_seconds_B: number; // Décalage (ex: 0.5s)
  recorded_audio_data?: string; // Base64 du mashup mixé
  duration: number;
  description?: string;
  likes_count?: number;
  created_at: string;
}
