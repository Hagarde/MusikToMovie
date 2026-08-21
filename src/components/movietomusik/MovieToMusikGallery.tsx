import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Sparkles, 
  Plus, 
  Play, 
  Pause, 
  Heart, 
  Share2, 
  Check, 
  Trash2, 
  ShieldAlert, 
  Sliders, 
  Film, 
  User, 
  Search, 
  Calendar,
  Volume2
} from 'lucide-react';
import { MovieToMusikProject } from '../../lib/types';
import { FilteredAudioPlayer } from '../../lib/audioEngine';
import { voteMovieToMusikProject, hasUserVotedM2M } from '../../lib/supabase';

interface MovieToMusikGalleryProps {
  projects: MovieToMusikProject[];
  onCreateNew: () => void;
  isAdmin?: boolean;
  onDeleteProject?: (id: string) => void;
}

export const MovieToMusikGallery: React.FC<MovieToMusikGalleryProps> = ({
  projects,
  onCreateNew,
  isAdmin = false,
  onDeleteProject,
}) => {
  const [playingProjectId, setPlayingProjectId] = useState<string | null>(null);
  const [projectList, setProjectList] = useState<MovieToMusikProject[]>(projects);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<MovieToMusikProject | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  const playerRef = useRef<FilteredAudioPlayer | null>(null);

  useEffect(() => {
    setProjectList(projects);
  }, [projects]);

  useEffect(() => {
    playerRef.current = new FilteredAudioPlayer();
    return () => {
      if (playerRef.current) playerRef.current.dispose();
    };
  }, []);

  const handleTogglePlay = async (project: MovieToMusikProject) => {
    if (!playerRef.current) return;

    if (playingProjectId === project.id) {
      playerRef.current.pause();
      setPlayingProjectId(null);
    } else {
      playerRef.current.init(project.audio_data, project.eq_settings);
      await playerRef.current.play();
      setPlayingProjectId(project.id);
    }
  };

  const handleVote = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    const newCount = await voteMovieToMusikProject(projectId);
    setProjectList((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, likes_count: newCount } : p))
    );
  };

  const handleShare = async (e: React.MouseEvent, project: MovieToMusikProject) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}?m2m_story=${project.id}`;
    const shareData = {
      title: `${project.title} - MovieToMusik`,
      text: `Écoutez la bande son originale de "${project.title}" créée par ${project.creator_name} sur MovieToMusik !`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (_) {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(project.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (_) {
      window.prompt('Copiez ce lien :', shareUrl);
    }
  };

  // Filtrage
  const filteredProjects = projectList.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchGenre = selectedGenre === 'all' || p.genre === selectedGenre;
    return matchSearch && matchGenre;
  });

  const availableGenres = Array.from(new Set(projectList.map((p) => p.genre).filter(Boolean)));

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 🌟 BANNIÈRE HÉRO MOVIE TO MUSIK */}
      <div className="relative overflow-hidden rounded-3xl bg-stone-900 text-white border border-stone-800 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold font-mono">
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>MovieToMusik : Le Studio Inversé</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display tracking-tight leading-tight">
              Donnez une voix et une musique à{' '}
              <span className="text-rose-500 font-serif italic">chaque image & vidéo</span>
            </h1>

            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-xl">
              Importez un clip, un GIF ou une image, enregistrez votre univers sonore au micro (voix, beatbox, bruitages) et sculptez le son avec la console d'égalisation native.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onCreateNew}
              className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm transition-all hover:scale-105 shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Créer une Musique sur Visuel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barre d'outils, Recherche & Filtres */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-100 border border-stone-200 text-stone-800 flex items-center justify-center">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900 font-display">
              Créations Sonores & Bruitages
            </h2>
            <p className="text-xs text-stone-500">
              {filteredProjects.length} composition{filteredProjects.length > 1 ? 's' : ''} disponible{filteredProjects.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Recherche */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher titre, artiste..."
              className="w-full bg-white border border-stone-200 rounded-2xl pl-10 pr-3.5 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-900 transition-colors shadow-sm"
            />
          </div>

          {/* Filtre Genre */}
          {availableGenres.length > 0 && (
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-white border border-stone-200 rounded-2xl px-3 py-2 text-xs text-stone-800 font-semibold focus:outline-none focus:border-stone-900 shadow-sm cursor-pointer"
            >
              <option value="all">Tous les genres</option>
              {availableGenres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* GRILLE DES CRÉATIONS MOVIETOMUSIK */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const isPlaying = playingProjectId === project.id;
            const isVoted = hasUserVotedM2M(project.id);

            return (
              <div
                key={project.id}
                className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Visual Media Container */}
                <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                  {project.visual_type === 'video' ? (
                    <video
                      src={project.visual_url}
                      loop
                      muted
                      autoPlay={isPlaying}
                      playsInline
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <img
                      src={project.visual_url}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}

                  {/* Bouton Play/Pause géant central */}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleTogglePlay(project)}
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all transform hover:scale-110 ${
                        isPlaying
                          ? 'bg-rose-600 shadow-rose-500/50 animate-pulse'
                          : 'bg-stone-900/90 hover:bg-stone-900'
                      }`}
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 fill-current ml-1" />
                      )}
                    </button>
                  </div>

                  {/* Badge de durée & Type */}
                  <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-mono font-bold">
                      {project.duration}s
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-600/80 backdrop-blur-md text-white text-[10px] font-mono font-bold uppercase">
                      {project.genre}
                    </span>
                  </div>

                  {/* Actions haut droite : Share + Vote + Delete */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                    {/* Share */}
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, project)}
                      className={`p-1.5 rounded-full border shadow-md backdrop-blur-sm transition-colors ${
                        copiedId === project.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white/90 hover:bg-stone-900 text-stone-700 hover:text-white border-stone-200'
                      }`}
                      title={copiedId === project.id ? 'Lien copié !' : 'Partager'}
                    >
                      {copiedId === project.id ? <Check className="w-3.5 h-3.5 text-white" /> : <Share2 className="w-3.5 h-3.5" />}
                    </button>

                    {/* Like */}
                    <button
                      type="button"
                      onClick={(e) => handleVote(e, project.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-transform hover:scale-105 shadow-sm ${
                        isVoted
                          ? 'bg-rose-500 text-white'
                          : 'bg-white/95 text-stone-700 border border-stone-200'
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${isVoted ? 'fill-current' : 'text-rose-500'}`} />
                      <span>{project.likes_count || 0}</span>
                    </button>

                    {/* Delete (Admin) */}
                    {isAdmin && onDeleteProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project);
                        }}
                        className="p-1.5 rounded-full bg-white/90 hover:bg-rose-600 text-stone-700 hover:text-white border border-stone-200 shadow-md transition-colors"
                        title="Supprimer (Admin)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenu & Métadonnées */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-stone-900 truncate font-display">
                      {project.title}
                    </h3>
                    <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                      <User className="w-3 h-3 text-stone-400" />
                      <span>Par {project.creator_name}</span>
                    </p>
                  </div>

                  {project.description && (
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed bg-stone-50 p-2.5 rounded-xl border border-stone-100 italic">
                      « {project.description} »
                    </p>
                  )}

                  {/* Paramètres EQ affichés */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] font-mono text-stone-500">
                    <span className="flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-stone-400" />
                      <span>EQ : B {project.eq_settings.bass > 0 ? `+${project.eq_settings.bass}` : project.eq_settings.bass}dB / T {project.eq_settings.treble > 0 ? `+${project.eq_settings.treble}` : project.eq_settings.treble}dB</span>
                    </span>
                    <span>{new Date(project.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-2xl">
            🎙️
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-stone-900 text-lg font-display">Aucune création sonore pour le moment</h3>
            <p className="text-xs text-stone-500">
              Soyez le premier à composer et enregistrer une bande originale sur un visuel ou une vidéo !
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateNew}
            className="px-6 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all hover:scale-105 shadow-md"
          >
            Lancer le Studio MovieToMusik
          </button>
        </div>
      )}

      {/* Modale de Confirmation de Suppression Admin */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Supprimer la création sonore ?</h4>
                <p className="text-xs text-stone-500">Action irréversible (Mode Admin)</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement{' '}
              <strong className="text-stone-900">"{projectToDelete.title}"</strong> de{' '}
              <strong className="text-stone-900">{projectToDelete.creator_name}</strong> ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProject && projectToDelete) {
                    onDeleteProject(projectToDelete.id);
                    setProjectToDelete(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
