export type SectionType = 'preceding' | 'main' | 'succeeding';

export interface Track {
  id: string;
  title: string;
  artist: string;
  genre?: string;
  audio_url: string;
  duration: number; // in seconds
  default_start_time?: number; // Moment précis de début (en secondes)
  created_at: string;
  proposal_count?: number;
}

export interface Scene {
  id?: string;
  proposal_id?: string;
  section_type: SectionType;
  scene_title: string;
  description: string;
  image_data: string; // Base64 data URL ou URL Supabase Storage
  start_time: number; // in seconds
  end_time: number; // in seconds
  order_index: number;
}

export interface Proposal {
  id: string;
  track_id: string;
  author_name: string;
  movie_title: string;
  genre: string;
  logline: string;
  likes_count?: number;
  created_at: string;
  track?: Track;
  scenes?: Scene[];
}
