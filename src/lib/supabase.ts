import { createClient } from '@supabase/supabase-js';
import { Track, Proposal, Scene } from './types';
import { extractYouTubeId, getYouTubeThumbnail } from './youtube';

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hbxejvpynymcxghdkbkh.supabase.co';
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_nii-4wn98Yh4ESEzF_DkBw_qAYVzoIK';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Morceaux de démo YouTube Cinématographiques & Épiques
const DEMO_TRACKS: Track[] = [
  {
    id: 'demo-yt-1',
    title: 'Time (Inception Soundtrack - Hans Zimmer)',
    artist: 'Hans Zimmer',
    genre: 'Cinématique / Épique',
    audio_url: 'https://www.youtube.com/watch?v=RxabLA7UQ9k',
    youtube_id: 'RxabLA7UQ9k',
    thumbnail_url: getYouTubeThumbnail('RxabLA7UQ9k'),
    duration: 275,
    default_start_time: 120, // Moment d'explosion symphonique
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-yt-2',
    title: 'Blade Runner 2049 - Tears in the Rain (Synth Atmosphere)',
    artist: 'Vangelis & Hans Zimmer',
    genre: 'Science-Fiction / Cyberpunk',
    audio_url: 'https://www.youtube.com/watch?v=s36eQwgPNSE',
    youtube_id: 's36eQwgPNSE',
    thumbnail_url: getYouTubeThumbnail('s36eQwgPNSE'),
    duration: 240,
    default_start_time: 45,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-yt-3',
    title: 'The Dark Knight - Why So Serious? (Tension & Chaos)',
    artist: 'Hans Zimmer & James Newton Howard',
    genre: 'Suspense / Thriller',
    audio_url: 'https://www.youtube.com/watch?v=2r1pP294t44',
    youtube_id: '2r1pP294t44',
    thumbnail_url: getYouTubeThumbnail('2r1pP294t44'),
    duration: 180,
    default_start_time: 60,
    created_at: new Date().toISOString(),
  }
];

const LOCAL_STORAGE_TRACKS_KEY = 'musiktomovie_tracks';
const LOCAL_STORAGE_PROPOSALS_KEY = 'musiktomovie_proposals';
const LOCAL_STORAGE_VOTES_KEY = 'musiktomovie_user_votes';

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

// Ajouter un morceau avec lien YouTube et métadonnées automatiques
export async function createTrack(track: Omit<Track, 'id' | 'created_at'>): Promise<Track> {
  const ytId = track.youtube_id || extractYouTubeId(track.audio_url);
  const thumb = track.thumbnail_url || (ytId ? getYouTubeThumbnail(ytId) : undefined);

  const newTrack: Track = {
    id: crypto.randomUUID(),
    ...track,
    youtube_id: ytId || undefined,
    thumbnail_url: thumb,
    default_start_time: track.default_start_time || 0,
    default_end_time: track.default_end_time || (track.duration ? Math.min(track.duration, (track.default_start_time || 0) + 30) : 60),
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

// Supprimer un morceau
export async function deleteTrack(trackId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('tracks').delete().eq('id', trackId);
    if (error) {
      console.warn('Erreur suppression Supabase:', error);
    }
  } catch (e) {
    console.warn('Erreur suppression Supabase:', e);
  }

  // Suppression du stockage local
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_TRACKS_KEY);
    if (local) {
      const parsed: Track[] = JSON.parse(local);
      const filtered = parsed.filter(t => t.id !== trackId);
      localStorage.setItem(LOCAL_STORAGE_TRACKS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {}

  return true;
}

// Supprimer une proposition de scénario / storyboard
export async function deleteProposal(proposalId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('proposals').delete().eq('id', proposalId);
    if (error) {
      console.warn('Erreur suppression proposal Supabase:', error);
    }
  } catch (e) {
    console.warn('Erreur suppression proposal Supabase:', e);
  }

  // Suppression du stockage local
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_PROPOSALS_KEY);
    if (local) {
      const parsed: Proposal[] = JSON.parse(local);
      const filtered = parsed.filter(p => p.id !== proposalId);
      localStorage.setItem(LOCAL_STORAGE_PROPOSALS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {}

  return true;
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
  const votes = JSON.parse(localStorage.getItem(LOCAL_STORAGE_VOTES_KEY) || '{}');
  const hasVoted = !!votes[proposalId];

  let newCount = 1;
  const local = localStorage.getItem(LOCAL_STORAGE_PROPOSALS_KEY);
  const allProposals: Proposal[] = local ? JSON.parse(local) : [];
  const target = allProposals.find(p => p.id === proposalId);

  if (hasVoted) {
    delete votes[proposalId];
    newCount = Math.max(0, (target?.likes_count || 1) - 1);
  } else {
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

// Mettre à jour une proposition de scénario / storyboard (Admin)
export async function updateProposal(
  proposalId: string,
  updates: Partial<Proposal>
): Promise<Proposal | null> {
  try {
    const { error } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', proposalId);

    if (error) {
      console.warn('Erreur mise à jour proposal Supabase:', error);
    }
  } catch (e) {
    console.warn('Erreur mise à jour proposal Supabase:', e);
  }

  const local = localStorage.getItem(LOCAL_STORAGE_PROPOSALS_KEY);
  let allProposals: Proposal[] = local ? JSON.parse(local) : [];
  let updatedProposal: Proposal | null = null;

  allProposals = allProposals.map((p) => {
    if (p.id === proposalId) {
      updatedProposal = { ...p, ...updates };
      return updatedProposal;
    }
    return p;
  });

  localStorage.setItem(LOCAL_STORAGE_PROPOSALS_KEY, JSON.stringify(allProposals));
  return updatedProposal;
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
      context_before: newProposal.context_before || '',
      context_after: newProposal.context_after || '',
      key_scene_title: newProposal.key_scene_title || '',
      key_scene_description: newProposal.key_scene_description || '',
      key_scene_start_time: newProposal.key_scene_start_time || 0,
      key_scene_end_time: newProposal.key_scene_end_time || 0,
      frames: newProposal.frames || [],
      animation_fps: typeof newProposal.animation_fps === 'number' && newProposal.animation_fps > 0 ? newProposal.animation_fps : 0.5,
      likes_count: 0,
    }]);

    if (pError) {
      console.warn('Erreur insertion proposal Supabase:', pError);
    }

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
