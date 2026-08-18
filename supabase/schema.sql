-- Schéma SQL pour Supabase - MusikToMovie

-- 1. Table des morceaux musicaux (tracks)
CREATE TABLE IF NOT EXISTS public.tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    artist TEXT NOT NULL DEFAULT 'Inconnu',
    genre TEXT DEFAULT 'Cinématique',
    audio_url TEXT NOT NULL,
    youtube_id TEXT,
    thumbnail_url TEXT,
    duration NUMERIC DEFAULT 0,
    default_start_time NUMERIC DEFAULT 0,
    default_end_time NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table des propositions de films / scénarios (proposals)
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL DEFAULT 'Anonyme',
    movie_title TEXT NOT NULL,
    genre TEXT DEFAULT 'Drame',
    logline TEXT DEFAULT '',
    
    -- Sections narratives & Scène Clé Flipanim
    context_before TEXT DEFAULT '',
    context_after TEXT DEFAULT '',
    key_scene_title TEXT DEFAULT '',
    key_scene_description TEXT DEFAULT '',
    key_scene_start_time NUMERIC DEFAULT 0,
    key_scene_end_time NUMERIC DEFAULT 0,
    frames JSONB DEFAULT '[]'::jsonb, -- Tableau des images frames d'animation
    animation_fps NUMERIC DEFAULT 0.5,

    likes_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Table de rétro-compatibilité des scènes
CREATE TABLE IF NOT EXISTS public.scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL CHECK (section_type IN ('preceding', 'main', 'succeeding')),
    scene_title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    image_data TEXT DEFAULT '',
    start_time NUMERIC DEFAULT 0,
    end_time NUMERIC DEFAULT 0,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RLS & Politiques de Sécurité
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

-- Politiques Tracks
CREATE POLICY "Permettre la lecture publique des tracks" ON public.tracks FOR SELECT USING (true);
CREATE POLICY "Permettre l'insertion publique des tracks" ON public.tracks FOR INSERT WITH CHECK (true);
CREATE POLICY "Permettre la suppression publique des tracks" ON public.tracks FOR DELETE USING (true);

-- Politiques Proposals
CREATE POLICY "Permettre la lecture publique des proposals" ON public.proposals FOR SELECT USING (true);
CREATE POLICY "Permettre l'insertion publique des proposals" ON public.proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Permettre la mise à jour des votes des proposals" ON public.proposals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permettre la suppression publique des proposals" ON public.proposals FOR DELETE USING (true);

-- Politiques Scenes
CREATE POLICY "Permettre la lecture publique des scenes" ON public.scenes FOR SELECT USING (true);
CREATE POLICY "Permettre l'insertion publique des scenes" ON public.scenes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permettre la suppression publique des scenes" ON public.scenes FOR DELETE USING (true);
