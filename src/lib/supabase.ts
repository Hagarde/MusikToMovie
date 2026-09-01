import { createClient } from '@supabase/supabase-js';
import { Track, Proposal, Scene } from './types';
import { extractYouTubeId, getYouTubeThumbnail } from './youtube';
import { RESTORED_PROPOSALS } from './restoredStoryboards';

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

function safeSetLocalStorage(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err: any) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      console.warn('LocalStorage plein, élagage de secours...');
      try {
        if (key === LOCAL_STORAGE_PROPOSALS_KEY && Array.isArray(data)) {
          const trimmed = data.slice(0, 15);
          localStorage.setItem(key, JSON.stringify(trimmed));
        }
      } catch (_) {}
    }
  }
}

function safeGetLocalStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (_) {
    return fallback;
  }
}

// Récupérer tous les morceaux
export async function getTracks(): Promise<Track[]> {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) {
      return safeGetLocalStorage<Track[]>(LOCAL_STORAGE_TRACKS_KEY, DEMO_TRACKS);
    }
    return data;
  } catch (err) {
    console.warn('Erreur Supabase, fallback local:', err);
    throw err;
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
  safeSetLocalStorage(LOCAL_STORAGE_TRACKS_KEY, updated);
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
    const localTracks = safeGetLocalStorage<Track[]>(LOCAL_STORAGE_TRACKS_KEY, []);
    const filtered = localTracks.filter(t => t.id !== trackId);
    safeSetLocalStorage(LOCAL_STORAGE_TRACKS_KEY, filtered);
  } catch (e) {}

  return true;
}

// Mettre à jour le BPM d'un morceau
export async function updateTrackBpm(trackId: string, bpm: number): Promise<boolean> {
  try {
    const { error } = await supabase.from('tracks').update({ bpm }).eq('id', trackId);
    if (error) {
      console.warn('Erreur mise à jour BPM Supabase:', error);
    }
  } catch (e) {
    console.warn('Erreur mise à jour BPM Supabase:', e);
  }

  try {
    const localTracks = safeGetLocalStorage<Track[]>(LOCAL_STORAGE_TRACKS_KEY, []);
    const updated = localTracks.map(t => t.id === trackId ? { ...t, bpm } : t);
    safeSetLocalStorage(LOCAL_STORAGE_TRACKS_KEY, updated);
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
    const localProps = safeGetLocalStorage<Proposal[]>(LOCAL_STORAGE_PROPOSALS_KEY, []);
    const filtered = localProps.filter(p => p.id !== proposalId);
    safeSetLocalStorage(LOCAL_STORAGE_PROPOSALS_KEY, filtered);
  } catch (e) {}

  return true;
}

// Récupérer les propositions avec support de tri et préservation garantie des storyboards
export async function getProposals(trackId?: string, sortBy: 'recent' | 'likes' = 'likes'): Promise<Proposal[]> {
  // 1. Récupérer les propositions locales (initialisées avec les storyboards restaurés si besoin)
  let localProposals = safeGetLocalStorage<Proposal[]>(LOCAL_STORAGE_PROPOSALS_KEY, []);
  if (!localProposals || localProposals.length === 0) {
    localProposals = [...RESTORED_PROPOSALS];
    safeSetLocalStorage(LOCAL_STORAGE_PROPOSALS_KEY, localProposals);
  } else {
    // S'assurer que les storyboards restaurés sont bien présents et complets
    let changed = false;
    for (const rp of RESTORED_PROPOSALS) {
      const existing = localProposals.find(p => p.id === rp.id);
      if (!existing) {
        localProposals.push(rp);
        changed = true;
      } else if ((!existing.frames || existing.frames.length === 0) && rp.frames && rp.frames.length > 0) {
        existing.frames = rp.frames;
        existing.scenes = rp.scenes || existing.scenes;
        changed = true;
      }
    }
    if (changed) {
      safeSetLocalStorage(LOCAL_STORAGE_PROPOSALS_KEY, localProposals);
    }
  }

  let finalProposals: Proposal[] = [...localProposals];

  // 2. Récupérer depuis Supabase et fusionner sans jamais perdre les frames/scenes
  try {
    let query = supabase.from('proposals').select('*');
    if (trackId) {
      query = query.eq('track_id', trackId);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (data && data.length > 0) {
      for (const remote of data) {
        const localMatch = localProposals.find(l => l.id === remote.id) || RESTORED_PROPOSALS.find(r => r.id === remote.id);
        const idx = finalProposals.findIndex(f => f.id === remote.id);
        
        const merged: Proposal = {
          ...remote,
          frames: (localMatch?.frames && localMatch.frames.length > 0) ? localMatch.frames : remote.frames || [],
          scenes: (localMatch?.scenes && localMatch.scenes.length > 0) ? localMatch.scenes : remote.scenes || [],
          context_before: remote.context_before || localMatch?.context_before,
          context_after: remote.context_after || localMatch?.context_after,
          key_scene_title: remote.key_scene_title || localMatch?.key_scene_title,
          key_scene_description: remote.key_scene_description || localMatch?.key_scene_description,
        };

        if (idx !== -1) {
          finalProposals[idx] = merged;
        } else {
          finalProposals.push(merged);
        }
      }
    }
  } catch (e) {
    console.warn('Erreur lecture proposals Supabase, utilisation du cache local:', e);
    throw e;
  }

  if (trackId) {
    finalProposals = finalProposals.filter(p => p.track_id === trackId);
  }

  if (sortBy === 'likes') {
    finalProposals.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
  } else {
    finalProposals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return finalProposals;
}

// Récupérer une proposition par son ID avec ses frames et scènes garanties
export async function getProposalById(id: string): Promise<Proposal | null> {
  const localProps = safeGetLocalStorage<Proposal[]>(LOCAL_STORAGE_PROPOSALS_KEY, RESTORED_PROPOSALS);
  const localMatch = localProps.find(p => p.id === id) || RESTORED_PROPOSALS.find(p => p.id === id) || null;

  try {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();
    if (!error && data) {
      return {
        ...data,
        frames: (localMatch?.frames && localMatch.frames.length > 0) ? localMatch.frames : data.frames || [],
        scenes: (localMatch?.scenes && localMatch.scenes.length > 0) ? localMatch.scenes : data.scenes || [],
        context_before: data.context_before || localMatch?.context_before,
        context_after: data.context_after || localMatch?.context_after,
        key_scene_title: data.key_scene_title || localMatch?.key_scene_title,
        key_scene_description: data.key_scene_description || localMatch?.key_scene_description,
      };
    }
  } catch (e) {
    console.warn('Erreur getProposalById:', e);
  }

  return localMatch;
}

// Voter pour une proposition (Like)
export async function voteProposal(proposalId: string): Promise<number> {
  const votes = safeGetLocalStorage<Record<string, boolean>>(LOCAL_STORAGE_VOTES_KEY, {});
  const hasVoted = !!votes[proposalId];

  let newCount = 1;
  const allProposals = safeGetLocalStorage<Proposal[]>(LOCAL_STORAGE_PROPOSALS_KEY, []);
  const target = allProposals.find(p => p.id === proposalId);

  if (hasVoted) {
    delete votes[proposalId];
    newCount = Math.max(0, (target?.likes_count || 1) - 1);
  } else {
    votes[proposalId] = true;
    newCount = (target?.likes_count || 0) + 1;
  }

  safeSetLocalStorage(LOCAL_STORAGE_VOTES_KEY, votes);

  if (target) {
    target.likes_count = newCount;
    safeSetLocalStorage(LOCAL_STORAGE_PROPOSALS_KEY, allProposals);
  }

  try {
    await supabase.from('proposals').update({ likes_count: newCount }).eq('id', proposalId);
  } catch (e) {
    console.warn('Erreur mise à jour vote Supabase:', e);
  }

  return newCount;
}

export function hasUserVoted(proposalId: string): boolean {
  const votes = safeGetLocalStorage<Record<string, boolean>>(LOCAL_STORAGE_VOTES_KEY, {});
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

  let allProposals = safeGetLocalStorage<Proposal[]>(LOCAL_STORAGE_PROPOSALS_KEY, []);
  let updatedProposal: Proposal | null = null;

  allProposals = allProposals.map((p) => {
    if (p.id === proposalId) {
      updatedProposal = { ...p, ...updates };
      return updatedProposal;
    }
    return p;
  });

  safeSetLocalStorage(LOCAL_STORAGE_PROPOSALS_KEY, allProposals);
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

  const all = safeGetLocalStorage<Proposal[]>(LOCAL_STORAGE_PROPOSALS_KEY, []);
  all.unshift(newProposal);
  safeSetLocalStorage(LOCAL_STORAGE_PROPOSALS_KEY, all);

  return newProposal;
}

// ==========================================
// 🎙️ SECTION MOVIE TO MUSIK (MODE INVERSÉ)
// ==========================================
const LOCAL_STORAGE_M2M_KEY = 'movietomusik_projects';
const LOCAL_STORAGE_M2M_VOTES_KEY = 'movietomusik_user_votes';

export async function getMovieToMusikProjects(): Promise<import('./types').MovieToMusikProject[]> {
  try {
    const { data, error } = await supabase
      .from('movietomusik_projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {
    console.warn('Erreur Supabase MovieToMusik, fallback local:', e);
  }

  return safeGetLocalStorage<import('./types').MovieToMusikProject[]>(LOCAL_STORAGE_M2M_KEY, []);
}

export async function createMovieToMusikProject(
  projectData: Omit<import('./types').MovieToMusikProject, 'id' | 'created_at' | 'likes_count'>
): Promise<import('./types').MovieToMusikProject> {
  const newProject: import('./types').MovieToMusikProject = {
    id: crypto.randomUUID(),
    ...projectData,
    likes_count: 0,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('movietomusik_projects')
      .insert([newProject])
      .select()
      .single();

    if (!error && data) {
      return data;
    }
  } catch (e) {
    console.warn('Erreur Supabase MovieToMusik creation, fallback local:', e);
  }

  const all = safeGetLocalStorage<import('./types').MovieToMusikProject[]>(LOCAL_STORAGE_M2M_KEY, []);
  all.unshift(newProject);
  safeSetLocalStorage(LOCAL_STORAGE_M2M_KEY, all);
  return newProject;
}

export async function deleteMovieToMusikProject(projectId: string): Promise<boolean> {
  try {
    await supabase.from('movietomusik_projects').delete().eq('id', projectId);
  } catch (e) {}

  const all = safeGetLocalStorage<import('./types').MovieToMusikProject[]>(LOCAL_STORAGE_M2M_KEY, []);
  const filtered = all.filter((p) => p.id !== projectId);
  safeSetLocalStorage(LOCAL_STORAGE_M2M_KEY, filtered);
  return true;
}

export async function voteMovieToMusikProject(projectId: string): Promise<number> {
  const votes = safeGetLocalStorage<Record<string, boolean>>(LOCAL_STORAGE_M2M_VOTES_KEY, {});
  const hasVoted = !!votes[projectId];

  let newCount = 1;
  const all = safeGetLocalStorage<import('./types').MovieToMusikProject[]>(LOCAL_STORAGE_M2M_KEY, []);
  const target = all.find((p) => p.id === projectId);

  if (hasVoted) {
    delete votes[projectId];
    newCount = Math.max(0, (target?.likes_count || 1) - 1);
  } else {
    votes[projectId] = true;
    newCount = (target?.likes_count || 0) + 1;
  }

  safeSetLocalStorage(LOCAL_STORAGE_M2M_VOTES_KEY, votes);

  if (target) {
    target.likes_count = newCount;
    safeSetLocalStorage(LOCAL_STORAGE_M2M_KEY, all);
  }

  try {
    await supabase.from('movietomusik_projects').update({ likes_count: newCount }).eq('id', projectId);
  } catch (_) {}

  return newCount;
}

export function hasUserVotedM2M(projectId: string): boolean {
  const votes = safeGetLocalStorage<Record<string, boolean>>(LOCAL_STORAGE_M2M_VOTES_KEY, {});
  return !!votes[projectId];
}

// ==========================================
// 🎛️ SECTION MUSIK TO MUSIK (MASHUP & STEMS)
// ==========================================
const LOCAL_STORAGE_MASHUP_KEY = 'musiktomusik_projects';
const LOCAL_STORAGE_MASHUP_VOTES_KEY = 'musiktomusik_user_votes';

export async function getMusikToMusikProjects(): Promise<import('./types').MusikToMusikProject[]> {
  try {
    const { data, error } = await supabase
      .from('musiktomusik_projects')
      .select('*');

    if (!error && data && data.length > 0) {
      const sorted = [...data];
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return sorted;
    }
  } catch (e) {
    // Fallback silencieux sur LocalStorage
  }

  return safeGetLocalStorage<import('./types').MusikToMusikProject[]>(LOCAL_STORAGE_MASHUP_KEY, []);
}

export async function createMusikToMusikProject(
  projectData: Omit<import('./types').MusikToMusikProject, 'id' | 'created_at' | 'likes_count'>
): Promise<import('./types').MusikToMusikProject> {
  const newProject: import('./types').MusikToMusikProject = {
    id: crypto.randomUUID(),
    ...projectData,
    likes_count: 0,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('musiktomusik_projects')
      .insert([newProject])
      .select()
      .single();

    if (!error && data) {
      return data;
    }
  } catch (e) {
    console.warn('Erreur Supabase MusikToMusik creation, fallback local:', e);
  }

  const all = safeGetLocalStorage<import('./types').MusikToMusikProject[]>(LOCAL_STORAGE_MASHUP_KEY, []);
  all.unshift(newProject);
  safeSetLocalStorage(LOCAL_STORAGE_MASHUP_KEY, all);
  return newProject;
}

export async function deleteMusikToMusikProject(projectId: string): Promise<boolean> {
  try {
    await supabase.from('musiktomusik_projects').delete().eq('id', projectId);
  } catch (e) {}

  const all = safeGetLocalStorage<import('./types').MusikToMusikProject[]>(LOCAL_STORAGE_MASHUP_KEY, []);
  const filtered = all.filter((p) => p.id !== projectId);
  safeSetLocalStorage(LOCAL_STORAGE_MASHUP_KEY, filtered);
  return true;
}

export async function voteMusikToMusikProject(projectId: string): Promise<number> {
  const votes = safeGetLocalStorage<Record<string, boolean>>(LOCAL_STORAGE_MASHUP_VOTES_KEY, {});
  const hasVoted = !!votes[projectId];

  let newCount = 1;
  const all = safeGetLocalStorage<import('./types').MusikToMusikProject[]>(LOCAL_STORAGE_MASHUP_KEY, []);
  const target = all.find((p) => p.id === projectId);

  if (hasVoted) {
    delete votes[projectId];
    newCount = Math.max(0, (target?.likes_count || 1) - 1);
  } else {
    votes[projectId] = true;
    newCount = (target?.likes_count || 0) + 1;
  }

  safeSetLocalStorage(LOCAL_STORAGE_MASHUP_VOTES_KEY, votes);

  if (target) {
    target.likes_count = newCount;
    safeSetLocalStorage(LOCAL_STORAGE_MASHUP_KEY, all);
  }

  try {
    await supabase.from('musiktomusik_projects').update({ likes_count: newCount }).eq('id', projectId);
  } catch (_) {}

  return newCount;
}

export function hasUserVotedMashup(projectId: string): boolean {
  const votes = safeGetLocalStorage<Record<string, boolean>>(LOCAL_STORAGE_MASHUP_VOTES_KEY, {});
  return !!votes[projectId];
}

// 🔄 Transvaser tout le LocalStorage vers Supabase (Tracks + Proposals)
export async function syncLocalStorageToSupabase(): Promise<{
  tracksCount: number;
  proposalsCount: number;
  errors: any[];
}> {
  const errors: any[] = [];
  let tracksCount = 0;
  let proposalsCount = 0;

  // 1. Synchroniser Tracks
  try {
    const rawTracks = localStorage.getItem(LOCAL_STORAGE_TRACKS_KEY);
    if (rawTracks) {
      const tracks = JSON.parse(rawTracks);
      if (Array.isArray(tracks) && tracks.length > 0) {
        const cleanTracks = tracks.map((t: any) => ({
          id: t.id || crypto.randomUUID(),
          title: t.title || 'Sans titre',
          artist: t.artist || '',
          genre: t.genre || null,
          audio_url: t.audio_url || '',
          youtube_id: t.youtube_id || null,
          thumbnail_url: t.thumbnail_url || null,
          duration: t.duration || 180,
          default_start_time: t.default_start_time || 0,
          default_end_time: t.default_end_time || 60,
          created_at: t.created_at || new Date().toISOString(),
        }));

        const { data, error } = await supabase.from('tracks').upsert(cleanTracks, { onConflict: 'id' }).select();
        if (error) {
          console.warn('Erreur upsert tracks Supabase:', error);
          errors.push({ entity: 'tracks', error });
        } else {
          tracksCount = data?.length || cleanTracks.length;
        }
      }
    }
  } catch (err) {
    errors.push({ entity: 'tracks', error: err });
  }

  // 2. Synchroniser Proposals
  try {
    const rawProposals = localStorage.getItem(LOCAL_STORAGE_PROPOSALS_KEY);
    if (rawProposals) {
      const proposals = JSON.parse(rawProposals);
      if (Array.isArray(proposals) && proposals.length > 0) {
        const cleanProposals = proposals.map((p: any) => ({
          id: p.id || crypto.randomUUID(),
          track_id: p.track_id,
          author_name: p.author_name || 'Anonyme',
          movie_title: p.movie_title || p.title || 'Scénario',
          genre: p.genre || 'Cinéma',
          logline: p.logline || '',
          context_before: p.context_before || '',
          context_after: p.context_after || '',
          key_scene_title: p.key_scene_title || '',
          key_scene_description: p.key_scene_description || '',
          key_scene_start_time: p.key_scene_start_time || 0,
          key_scene_end_time: p.key_scene_end_time || 60,
          frames: p.frames || [],
          animation_fps: p.animation_fps || 8,
          likes_count: p.likes_count || 0,
          created_at: p.created_at || new Date().toISOString(),
        }));

        const { data, error } = await supabase.from('proposals').upsert(cleanProposals, { onConflict: 'id' }).select();
        if (error) {
          console.warn('Erreur upsert proposals Supabase:', error);
          errors.push({ entity: 'proposals', error });
        } else {
          proposalsCount = data?.length || cleanProposals.length;
        }
      }
    }
  } catch (err) {
    errors.push({ entity: 'proposals', error: err });
  }

  return { tracksCount, proposalsCount, errors };
}

// Fonction de restauration intégrale des Storyboards originaux (Volver, R1bo des bois, etc.)
export function restoreOriginalStoryboards(): { restoredCount: number; message: string } {
  try {
    const current = safeGetLocalStorage<Proposal[]>(LOCAL_STORAGE_PROPOSALS_KEY, []);
    const merged = [...current];

    for (const rp of RESTORED_PROPOSALS) {
      const idx = merged.findIndex(p => p.id === rp.id);
      if (idx !== -1) {
        merged[idx] = {
          ...merged[idx],
          frames: (rp.frames && rp.frames.length > 0) ? rp.frames : merged[idx].frames,
          scenes: (rp.scenes && rp.scenes.length > 0) ? rp.scenes : merged[idx].scenes,
          context_before: rp.context_before || merged[idx].context_before,
          context_after: rp.context_after || merged[idx].context_after,
          key_scene_title: rp.key_scene_title || merged[idx].key_scene_title,
          key_scene_description: rp.key_scene_description || merged[idx].key_scene_description,
        };
      } else {
        merged.push(rp);
      }
    }

    safeSetLocalStorage(LOCAL_STORAGE_PROPOSALS_KEY, merged);
    console.log(`✅ ${RESTORED_PROPOSALS.length} storyboards originaux restaurés avec succès !`);
    return { restoredCount: RESTORED_PROPOSALS.length, message: "Storyboards restaurés avec succès !" };
  } catch (e: any) {
    console.error("Erreur lors de la restauration des storyboards:", e);
    return { restoredCount: 0, message: e.message };
  }
}

// Exposition sur l'objet window pour utilisation console immédiate
if (typeof window !== 'undefined') {
  // L'exposition sur window a été supprimée pour des raisons de sécurité
}

