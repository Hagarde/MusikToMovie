import { createClient } from '@supabase/supabase-js';
import { Track, Proposal, Scene } from './types';

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hbxejvpynymcxghdkbkh.supabase.co';
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_nii-4wn98Yh4ESEzF_DkBw_qAYVzoIK';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Morceaux de démo inclus par défaut (Musiques libres de droits)
const DEMO_TRACKS: Track[] = [
  {
    id: 'demo-1',
    title: 'Interstellar Horizons (Cinematic Ambient)',
    artist: 'Hans Echo',
    audio_url: 'https://cdn.freesound.org/previews/612/612608_11861866-lq.mp3',
    duration: 75,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Cyberpunk Chase (Dark Synthwave)',
    artist: 'Neon Runner',
    audio_url: 'https://cdn.freesound.org/previews/573/573379_11861866-lq.mp3',
    duration: 90,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Midnight Suspense (Piano & Strings)',
    artist: 'Noir Chamber',
    audio_url: 'https://cdn.freesound.org/previews/686/686475_11861866-lq.mp3',
    duration: 60,
    created_at: new Date().toISOString(),
  }
];

const LOCAL_STORAGE_TRACKS_KEY = 'musiktomovie_tracks';
const LOCAL_STORAGE_PROPOSALS_KEY = 'musiktomovie_proposals';

// Récupérer tous les morceaux
export async function getTracks(): Promise<Track[]> {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      // Fallback local si la base est encore vide
      const local = localStorage.getItem(LOCAL_STORAGE_TRACKS_KEY);
      if (local) {
        return JSON.parse(local);
      }
      return DEMO_TRACKS;
    }
    return data;
  } catch (err) {
    console.warn('Erreur Supabase, fallback local:', err);
    const local = localStorage.getItem(LOCAL_STORAGE_TRACKS_KEY);
    return local ? JSON.parse(local) : DEMO_TRACKS;
  }
}

// Ajouter un morceau
export async function createTrack(track: Omit<Track, 'id' | 'created_at'>): Promise<Track> {
  const newTrack: Track = {
    id: crypto.randomUUID(),
    ...track,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from('tracks').insert([newTrack]).select().single();
    if (!error && data) {
      return data;
    }
  } catch (e) {
    console.warn('Sauvegarde Supabase échouée, enregistrement local:', e);
  }

  // Sauvegarde locale en secours
  const current = await getTracks();
  const updated = [newTrack, ...current];
  localStorage.setItem(LOCAL_STORAGE_TRACKS_KEY, JSON.stringify(updated));
  return newTrack;
}

// Récupérer les propositions pour un morceau
export async function getProposals(trackId?: string): Promise<Proposal[]> {
  try {
    let query = supabase.from('proposals').select('*, scenes(*)').order('created_at', { ascending: false });
    if (trackId) {
      query = query.eq('track_id', trackId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {
    console.warn('Erreur chargement proposals Supabase:', e);
  }

  const local = localStorage.getItem(LOCAL_STORAGE_PROPOSALS_KEY);
  const allProposals: Proposal[] = local ? JSON.parse(local) : [];
  if (trackId) {
    return allProposals.filter(p => p.track_id === trackId);
  }
  return allProposals;
}

// Récupérer une proposition par son ID
export async function getProposalById(id: string): Promise<Proposal | null> {
  try {
    const { data, error } = await supabase
      .from('proposals')
      .select('*, scenes(*)')
      .eq('id', id)
      .single();
    if (!error && data) {
      return data;
    }
  } catch (e) {
    console.warn('Erreur getProposalById:', e);
  }

  const local = localStorage.getItem(LOCAL_STORAGE_PROPOSALS_KEY);
  const allProposals: Proposal[] = local ? JSON.parse(local) : [];
  return allProposals.find(p => p.id === id) || null;
}

// Créer une proposition avec ses 3 scènes
export async function createProposal(
  proposalData: Omit<Proposal, 'id' | 'created_at'>,
  scenes: Scene[]
): Promise<Proposal> {
  const proposalId = crypto.randomUUID();
  const newProposal: Proposal = {
    id: proposalId,
    ...proposalData,
    created_at: new Date().toISOString(),
    scenes: scenes.map((s, idx) => ({
      ...s,
      id: crypto.randomUUID(),
      proposal_id: proposalId,
      order_index: idx,
    }))
  };

  try {
    // Insertion dans Supabase
    const { error: pError } = await supabase.from('proposals').insert([{
      id: newProposal.id,
      track_id: newProposal.track_id,
      author_name: newProposal.author_name,
      movie_title: newProposal.movie_title,
      genre: newProposal.genre,
      logline: newProposal.logline,
    }]);

    if (!pError && newProposal.scenes) {
      const formattedScenes = newProposal.scenes.map(s => ({
        id: s.id,
        proposal_id: s.proposal_id,
        section_type: s.section_type,
        scene_title: s.scene_title,
        description: s.description,
        image_data: s.image_data,
        start_time: s.start_time,
        end_time: s.end_time,
        order_index: s.order_index,
      }));

      await supabase.from('scenes').insert(formattedScenes);
    }
  } catch (e) {
    console.warn('Erreur écriture Supabase, sauvegarde locale:', e);
  }

  // Sauvegarde locale miroir
  const local = localStorage.getItem(LOCAL_STORAGE_PROPOSALS_KEY);
  const all: Proposal[] = local ? JSON.parse(local) : [];
  all.unshift(newProposal);
  localStorage.setItem(LOCAL_STORAGE_PROPOSALS_KEY, JSON.stringify(all));

  return newProposal;
}
