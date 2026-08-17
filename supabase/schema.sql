-- Schéma SQL pour Supabase - MusikToMovie

-- 1. Table des morceaux musicaux (tracks)
CREATE TABLE IF NOT EXISTS public.tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    artist TEXT NOT NULL DEFAULT 'Inconnu',
    genre TEXT DEFAULT 'Cinématique',
    audio_url TEXT NOT NULL,
    duration NUMERIC DEFAULT 0,
    default_start_time NUMERIC DEFAULT 0, -- Moment précis de début (timecode en secondes)
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
    likes_count INT DEFAULT 0, -- Nombre de votes
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Table des scènes & storyboards (scenes)
CREATE TABLE IF NOT EXISTS public.scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL CHECK (section_type IN ('preceding', 'main', 'succeeding')),
    scene_title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    image_data TEXT DEFAULT '', -- Données image compressées ou URL Storage
    start_time NUMERIC DEFAULT 0,
    end_time NUMERIC DEFAULT 0,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Activer Row Level Security (RLS) avec politiques publiques
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permettre la lecture publique des tracks" ON public.tracks FOR SELECT USING (true);
CREATE POLICY "Permettre l'insertion publique des tracks" ON public.tracks FOR INSERT WITH CHECK (true);

CREATE POLICY "Permettre la lecture publique des proposals" ON public.proposals FOR SELECT USING (true);
CREATE POLICY "Permettre l'insertion publique des proposals" ON public.proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Permettre la mise à jour des votes des proposals" ON public.proposals FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permettre la lecture publique des scenes" ON public.scenes FOR SELECT USING (true);
CREATE POLICY "Permettre l'insertion publique des scenes" ON public.scenes FOR INSERT WITH CHECK (true);

-- 5. Création des Buckets de Stockage Supabase pour Audio et Storyboards (Optionnel)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio', 'audio', true), ('storyboards', 'storyboards', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Permettre la lecture publique des fichiers audio" ON storage.objects FOR SELECT USING (bucket_id = 'audio');
CREATE POLICY "Permettre l'upload public de fichiers audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio');

CREATE POLICY "Permettre la lecture publique des storyboards" ON storage.objects FOR SELECT USING (bucket_id = 'storyboards');
CREATE POLICY "Permettre l'upload public de storyboards" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'storyboards');
