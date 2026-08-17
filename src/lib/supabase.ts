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
    genre: 'Science-Fiction',
    audio_url: 'https://cdn.freesound.org/previews/612/612608_11861866-lq.mp3',
    duration: 75,
    default_start_time: 15,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Cyberpunk Chase (Dark Synthwave)',
    artist: 'Neon Runner',
    genre: 'Cyberpunk',
    audio_url: 'https://cdn.freesound.org/previews/573/573379_11861866-lq.mp3',
    duration: 90,
    default_start_time: 25,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Midnight Suspense (Piano & Strings)',
    artist: 'Noir Chamber',
    genre: 'Thriller / Film Noir',
    audio_url: 'https://cdn.freesound.org/previews/686/686475_11861866-lq.mp3',
    duration: 60,
    default_start_time: 10,
    created_at: new Date().toISOString(),
  }
];

const LOCAL_STORAGE_TRACKS_KEY = 'musiktomovie_tracks';
const LOCAL_STORAGE_PROPOSALS_KEY = 'musiktomovie_proposals';
const LOCAL_STORAGE_VOTES_KEY = 'musiktomovie_user_votes';

// Uploader un fichier audio vers Supabase Storage bucket 'audio'
export async function uploadAudioFile(file: File): Promise<string> {
  const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
  try {
    const { data, error } = await supabase.storage
      .from('audio')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (!error && data) {
      const { data: publicUrlData } = supabase.storage.from('audio').getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    }
  } catch (err) {
    console.warn('Upload Supabase Storage échoué, fallback DataURL:', err);
  }

  // Fallback client local DataURL si Supabase storage n'est pas encore initialisé
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

// Récupérer tous les morceaux
export async function getTracks(): Promise<Track[]> {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
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

// Ajouter un morceau avec point de départ précis
export async function createTrack(track: Omit<Track, 'id' | 'created_at'>): Promise<Track> {
  const newTrack: Track = {
    id: crypto.randomUUID(),
    ...track,
    default_start_time: track.default_start_time || 0,
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

// Récupérer les propositions avec support de tri
export async function getProposals(trackId?: string, sortBy: 'recent' | 'likes' = 'likes'): Promise<Proposal[]> {
  try {
    let query = supabase.from('proposals').select('*, scenes(*)');
    if (trackId) {
      query = query.eq('track_id', trackId);
    }
    if (sortBy === 'likes') {
      query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {
    console.warn('Erreur chargement proposals Supabase:', e);
  }

  const local = localStorage.getItem(LOCAL_STORAGE_PROPOSALS_KEY);
  let allProposals: Proposal[] = local ? JSON.parse(local) : [];
  if (trackId) {
    allProposals = allProposals.filter(p => p.track_id === trackId);
  }

  if (sortBy === 'likes') {
    allProposals.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
  } else {
    allProposals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

// Voter pour une proposition (Like)
export async function voteProposal(proposalId: string): Promise<number> {
  // Vérifier si déjà voté localement
  const votes = JSON.parse(localStorage.getItem(LOCAL_STORAGE_VOTES_KEY) || '{}');
  const hasVoted = !!votes[proposalId];

  let newCount = 1;

  // Récupérer le count actuel
  const local = localStorage.getItem(LOCAL_STORAGE_PROPOSALS_KEY);
  const allProposals: Proposal[] = local ? JSON.parse(local) : [];
  const target = allProposals.find(p => p.id === proposalId);

  if (hasVoted) {
    // Annuler le vote
    delete votes[proposalId];
    newCount = Math.max(0, (target?.likes_count || 1) - 1);
  } else {
    // Ajouter le vote
    votes[proposalId] = true;
    newCount = (target?.likes_count || 0) + 1;
  }

  localStorage.setItem(LOCAL_STORAGE_VOTES_KEY, JSON.stringify(votes));

  if (target) {
    target.likes_count = newCount;
    localStorage.setItem(LOCAL_STORAGE_PROPOSALS_KEY, JSON.stringify(allProposals));
  }

  try {
    await supabase.from('proposals').update({ likes_count: newCount }).eq('id', proposalId);
  } catch (e) {
    console.warn('Erreur mise à jour vote Supabase:', e);
  }

  return newCount;
}

export function hasUserVoted(proposalId: string): boolean {
  const votes = JSON.parse(localStorage.getItem(LOCAL_STORAGE_VOTES_KEY) || '{}');
  return !!votes[proposalId];
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
    likes_count: 0,
    created_at: new Date().toISOString(),
    scenes: scenes.map((s, idx) => ({
      ...s,
      id: crypto.randomUUID(),
      proposal_id: proposalId,
      order_index: idx,
    }))
  };

  try {
    const { error: pError } = await supabase.from('proposals').insert([{
      id: newProposal.id,
      track_id: newProposal.track_id,
      author_name: newProposal.author_name,
      movie_title: newProposal.movie_title,
      genre: newProposal.genre,
      logline: newProposal.logline,
      likes_count: 0,
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

  const local = localStorage.getItem(LOCAL_STORAGE_PROPOSALS_KEY);
  const all: Proposal[] = local ? JSON.parse(local) : [];
  all.unshift(newProposal);
  localStorage.setItem(LOCAL_STORAGE_PROPOSALS_KEY, JSON.stringify(all));

  return newProposal;
}
