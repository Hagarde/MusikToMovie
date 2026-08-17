import React, { useState, useMemo } from 'react';
import { 
  Film, 
  User, 
  Sparkles, 
  Play, 
  Clock, 
  Music, 
  Heart, 
  Flame, 
  Calendar, 
  Clapperboard,
  Search,
  Filter
} from 'lucide-react';
import { Proposal, Track } from '../../lib/types';
import { voteProposal, hasUserVoted } from '../../lib/supabase';

interface ProposalsGalleryProps {
  proposals: Proposal[];
  tracks: Track[];
  onSelectProposal: (proposal: Proposal) => void;
  onCreateNew: () => void;
  onVoteUpdated?: (proposalId: string, newCount: number) => void;
}

export const ProposalsGallery: React.FC<ProposalsGalleryProps> = ({
  proposals,
  tracks,
  onSelectProposal,
  onCreateNew,
  onVoteUpdated,
}) => {
  const [sortBy, setSortBy] = useState<'likes' | 'recent'>('likes');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  const getTrackForProposal = (trackId: string) => {
    return tracks.find((t) => t.id === trackId);
  };

  const handleVote = async (e: React.MouseEvent, proposalId: string) => {
    e.stopPropagation();
    const count = await voteProposal(proposalId);
    if (onVoteUpdated) {
      onVoteUpdated(proposalId, count);
    }
  };

  // Liste unique des genres disponibles dans les scénarios
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    proposals.forEach((p) => {
      if (p.genre) set.add(p.genre);
    });
    return Array.from(set);
  }, [proposals]);

  // Filtrage et Tri combinés
  const filteredProposals = useMemo(() => {
    return proposals
      .filter((p) => {
        const matchesSearch =
          searchQuery.trim() === '' ||
          p.movie_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.author_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.logline && p.logline.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesGenre =
          selectedGenre === 'all' || p.genre === selectedGenre;

        return matchesSearch && matchesGenre;
      })
      .sort((a, b) => {
        if (sortBy === 'likes') {
          return (b.likes_count || 0) - (a.likes_count || 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [proposals, searchQuery, selectedGenre, sortBy]);

  return (
    <div className="space-y-8">
      {/* 🌟 BANNIÈRE HÉRO GALERIE */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cinema-850 via-cinema-800 to-cinema-900 border border-amber-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
              <Film className="w-3.5 h-3.5 text-rose-400" />
              <span>Cinéma & Visions d'Auteurs</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-display tracking-tight leading-tight">
              Galerie des Scénarios &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-300 to-amber-200">
                Storyboards Animés
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explorez les créations de la communauté, votez pour vos concepts favoris et découvrez comment différentes personnes interprètent une même musique !
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateNew}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-cinema-950 font-extrabold text-sm transition-all hover:scale-105 shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-cinema-950 stroke-[2.5]" />
            <span>Nouveau Storyboard</span>
          </button>
        </div>
      </div>

      {/* Barre d'outils, Recherche & Sélecteur de Tri */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">
                Concepts Cinématographiques
              </h2>
              <p className="text-xs text-slate-400">
                {filteredProposals.length} projet{filteredProposals.length > 1 ? 's' : ''} trouvé{filteredProposals.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Barre de recherche */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher scénario, auteur..."
                className="w-full bg-cinema-850 border border-white/10 rounded-2xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Tri Populaires / Récents */}
            <div className="flex items-center bg-cinema-850/80 p-1.5 rounded-2xl border border-white/5 shadow-inner text-xs shrink-0">
              <button
                type="button"
                onClick={() => setSortBy('likes')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  sortBy === 'likes'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-cinema-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Populaires</span>
              </button>
              <button
                type="button"
                onClick={() => setSortBy('recent')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  sortBy === 'recent'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-cinema-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Récents</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pilules de filtres par Genre */}
        {availableGenres.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedGenre('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                selectedGenre === 'all'
                  ? 'bg-amber-500 text-cinema-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-cinema-850 hover:bg-cinema-750 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              Tous les genres
            </button>
            {availableGenres.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGenre(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  selectedGenre === g
                    ? 'bg-amber-500 text-cinema-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-cinema-850 hover:bg-cinema-750 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredProposals.length === 0 ? (
        <div className="bg-cinema-850/70 border border-white/10 rounded-3xl p-12 text-center space-y-4 backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400 shadow-inner">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white font-display">Aucun scénario trouvé</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery || selectedGenre !== 'all'
              ? 'Aucun projet ne correspond à vos filtres de recherche.'
              : 'Soyez le premier à imaginer une séquence cinématographique à partir de notre bibliothèque musicale !'}
          </p>
          {(searchQuery || selectedGenre !== 'all') ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedGenre('all');
              }}
              className="px-4 py-2 rounded-xl bg-cinema-750 hover:bg-cinema-700 text-amber-300 text-xs font-bold transition-colors"
            >
              Réinitialiser les filtres
            </button>
          ) : (
            <button
              type="button"
              onClick={onCreateNew}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-cinema-950 font-bold text-xs transition-transform hover:scale-105 shadow-lg shadow-amber-500/20"
            >
              Commencer un Storyboard
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProposals.map((proposal) => {
            const track = getTrackForProposal(proposal.track_id);
            const mainScene = proposal.scenes?.find((s) => s.section_type === 'main') || proposal.scenes?.[0];
            const sketchImage = (proposal.frames && proposal.frames.length > 0) ? proposal.frames[0] : mainScene?.image_data;
            const framesCount = proposal.frames?.length || (mainScene?.image_data ? 1 : 0);
            const isVoted = hasUserVoted(proposal.id);

            return (
              <div
                key={proposal.id}
                onClick={() => onSelectProposal(proposal)}
                className="group bg-cinema-850/90 rounded-3xl border border-cinema-700/60 overflow-hidden hover:border-amber-500/60 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between backdrop-blur-md hover:scale-[1.01]"
              >
                {/* Aperçu Visuel Storyboard */}
                <div className="relative aspect-video bg-cinema-950 flex items-center justify-center overflow-hidden border-b border-cinema-700/60">
                  {sketchImage ? (
                    <img
                      src={sketchImage}
                      alt={proposal.movie_title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-600">
                      <Film className="w-8 h-8" />
                      <span className="text-[11px] italic text-slate-500">Storyboard narratif</span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cinema-900/90 text-amber-300 border border-amber-500/30 backdrop-blur-md shadow-sm">
                      {proposal.genre}
                    </span>
                    {framesCount > 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-500 to-amber-400 text-cinema-950 flex items-center gap-1 shadow-md">
                        🎬 {framesCount} frames (Animé)
                      </span>
                    )}
                  </div>

                  {/* Bouton Vote / Like en overlay */}
                  <div className="absolute top-3 right-3 z-20">
                    <button
                      type="button"
                      onClick={(e) => handleVote(e, proposal.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-110 shadow-lg ${
                        isVoted
                          ? 'bg-rose-500 text-white shadow-rose-500/30 ring-2 ring-rose-400/40'
                          : 'bg-cinema-900/90 hover:bg-cinema-800 text-slate-300 border border-cinema-700/80 backdrop-blur-md'
                      }`}
                      title="Voter pour ce storyboard"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isVoted ? 'fill-current' : 'text-rose-400'}`} />
                      <span>{proposal.likes_count || 0}</span>
                    </button>
                  </div>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-cinema-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Voir le film & écouter
                    </span>
                  </div>
                </div>

                {/* Détails du Projet */}
                <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors line-clamp-1 font-display">
                      {proposal.movie_title}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-2 italic leading-relaxed">
                      "{proposal.logline || 'Concept sans pitch'}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-cinema-700/50 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <strong className="text-slate-200">{proposal.author_name}</strong>
                    </span>

                    {track && (
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                        <Music className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{track.title}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
