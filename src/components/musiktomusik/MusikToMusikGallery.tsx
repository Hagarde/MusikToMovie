import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Play, 
  Pause, 
  Heart, 
  Share2, 
  Search, 
  Radio, 
  Music2, 
  Check 
} from 'lucide-react';
import { MusikToMusikProject, GENRES } from '../../lib/types';
import { getMusikToMusikProjects, voteMusikToMusikProject, hasUserVotedMashup } from '../../lib/supabase';
import { MashupAudioEngine, isDirectAudioUrl } from '../../lib/stemEngine';

interface MusikToMusikGalleryProps {
  onOpenStudio: () => void;
  targetMashupId?: string | null;
}

export const MusikToMusikGallery: React.FC<MusikToMusikGalleryProps> = ({
  onOpenStudio,
  targetMashupId,
}) => {
  const [projects, setProjects] = useState<MusikToMusikProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lecteur actif
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const engineRef = useRef<MashupAudioEngine | null>(null);

  useEffect(() => {
    engineRef.current = new MashupAudioEngine();
    loadProjects();

    return () => {
      if (engineRef.current) engineRef.current.dispose();
    };
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    const data = await getMusikToMusikProjects();
    setProjects(data);
    setIsLoading(false);

    if (targetMashupId) {
      const found = data.find((p) => p.id === targetMashupId);
      if (found) {
        handlePlayProject(found);
      }
    }
  };

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayProject = async (project: MusikToMusikProject) => {
    if (activeProjectId === project.id && isPlaying) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      if (engineRef.current) engineRef.current.pause();
      setIsPlaying(false);
      return;
    }

    setActiveProjectId(project.id);

    // 1. Si une prise audio master a été enregistrée lors de la session
    if (project.recorded_audio_data) {
      if (engineRef.current) engineRef.current.pause();
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      audioPlayerRef.current = new Audio(project.recorded_audio_data);
      audioPlayerRef.current.onended = () => setIsPlaying(false);
      await audioPlayerRef.current.play().catch(() => {});
      setIsPlaying(true);
      return;
    }

    // 2. Sinon, reconstitution via le moteur DSP
    if (!engineRef.current) return;
    const urlA = isDirectAudioUrl(project.trackA.audio_url) ? project.trackA.audio_url : '';
    const urlB = isDirectAudioUrl(project.trackB.audio_url) ? project.trackB.audio_url : '';
    engineRef.current.loadDecks(urlA, urlB, project.stem_config);
    engineRef.current.setSpeedB(project.speed_ratio_B || 1.0);
    engineRef.current.setOffsetB(project.offset_seconds_B || 0.0);
    await engineRef.current.play();
    setIsPlaying(true);
  };

  const handleVote = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newLikes = await voteMusikToMusikProject(projectId);
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, likes_count: newLikes } : p))
    );
  };

  const handleShare = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?mashup=${projectId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(projectId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredProjects = projects.filter((p) => {
    const matchGenre = selectedGenre === 'all' || p.genre === selectedGenre;
    const matchQuery =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.trackA.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.trackB.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchGenre && matchQuery;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* BANNER HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-stone-950 via-stone-900 to-violet-950 text-white p-6 sm:p-10 border border-stone-800 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-mono font-bold inline-flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Mode MusikToMusik • Mashup Lab & Stems</span>
          </span>

          <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight leading-tight">
            Galerie des Mashups & Remixes Communautaires
          </h1>

          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
            Écoutez les créations hybrides fusionnant la voix d'un morceau avec le beat, la basse et les mélodies d'un autre grâce à la séparation de pistes Web Audio !
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenStudio}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-rose-900/40"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Créer un Nouveau Mashup</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTRES & RECHERCHE */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedGenre('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              selectedGenre === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            Tous les Genres
          </button>
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGenre(g)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                selectedGenre === g
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher titre, DJ, morceau..."
            className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-900"
          />
        </div>
      </div>

      {/* GRILLE DES MASHUPS */}
      {isLoading ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-500 font-mono">Chargement des mashups...</p>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => {
            const isThisPlaying = activeProjectId === p.id && isPlaying;
            const hasVoted = hasUserVotedMashup(p.id);

            return (
              <div
                key={p.id}
                onClick={() => handlePlayProject(p)}
                className={`group bg-white rounded-3xl overflow-hidden border-2 transition-all p-5 space-y-4 cursor-pointer shadow-sm hover:shadow-xl ${
                  isThisPlaying
                    ? 'border-violet-600 ring-2 ring-violet-200 scale-[1.01]'
                    : 'border-stone-200 hover:border-stone-400'
                }`}
              >
                {/* En-tête : Titre & Bouton Play */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="text-[10px] font-mono font-bold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full uppercase">
                      {p.genre}
                    </span>
                    <h3 className="font-extrabold text-sm text-stone-900 truncate group-hover:text-violet-600 transition-colors font-display">
                      {p.title}
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      Par <strong className="text-stone-700">{p.creator_name}</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayProject(p);
                    }}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-transform hover:scale-110 shadow-md shrink-0 ${
                      isThisPlaying
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    {isThisPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                </div>

                {/* Badges des Morceaux Croisés A + B */}
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      A
                    </span>
                    <span className="font-bold text-stone-900 truncate flex-1">{p.trackA.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-violet-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      B
                    </span>
                    <span className="font-bold text-stone-900 truncate flex-1">{p.trackB.title}</span>
                    <span className="text-[9px] font-mono text-violet-700 bg-violet-100 px-1.5 py-0.2 rounded">
                      {((p.speed_ratio_B || 1.0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Stems Matrice Résumé */}
                <div className="grid grid-cols-4 gap-1 text-center text-[9px] font-mono font-bold">
                  <div className="bg-stone-100 rounded-lg py-1 text-stone-700">
                    🎤 {p.stem_config.vocals.source.toUpperCase()}
                  </div>
                  <div className="bg-stone-100 rounded-lg py-1 text-stone-700">
                    🥁 {p.stem_config.drums.source.toUpperCase()}
                  </div>
                  <div className="bg-stone-100 rounded-lg py-1 text-stone-700">
                    🎸 {p.stem_config.bass.source.toUpperCase()}
                  </div>
                  <div className="bg-stone-100 rounded-lg py-1 text-stone-700">
                    🎹 {p.stem_config.melody.source.toUpperCase()}
                  </div>
                </div>

                {/* Footer : Votes & Partage */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500">
                  <button
                    type="button"
                    onClick={(e) => handleVote(p.id, e)}
                    className={`flex items-center gap-1.5 font-bold transition-colors ${
                      hasVoted ? 'text-rose-600' : 'hover:text-rose-600 text-stone-600'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${hasVoted ? 'fill-current text-rose-600' : ''}`} />
                    <span>{p.likes_count || 0}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleShare(p.id, e)}
                    className="flex items-center gap-1 hover:text-stone-900 font-bold transition-colors"
                  >
                    {copiedId === p.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Lien copié !</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Partager</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 space-y-4 shadow-sm">
          <Music2 className="w-12 h-12 text-stone-400 mx-auto" />
          <h3 className="font-bold text-sm text-stone-900 font-display">Aucun mashup trouvé</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Soyez le premier à fusionner 2 morceaux et à publier votre création dans la galerie !
          </p>
          <button
            type="button"
            onClick={onOpenStudio}
            className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Créer le 1er Mashup</span>
          </button>
        </div>
      )}
    </div>
  );
};
