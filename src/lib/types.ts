export type SectionType = 'preceding' | 'main' | 'succeeding';

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
