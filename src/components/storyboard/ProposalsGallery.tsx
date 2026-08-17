import React, { useState, useMemo } from 'react';
import { 
  Film, 
  User, 
  Sparkles, 
  Play, 
  Music, 
  Heart, 
  Flame, 
  Calendar, 
  Clapperboard,
  Search
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
      {/* 🌟 BANNIÈRE HÉRO GALERIE ÉPURÉE */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200 p-6 sm:p-8 shadow-gallery">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold font-mono">
              <Film className="w-3.5 h-3.5 text-stone-900" />
              <span>Cinéma d'Auteur & Visions Originales</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 font-display tracking-tight leading-tight">
              Galerie des Scénarios &{' '}
              <span className="text-rose-600 font-serif italic">
                Storyboards Animés
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-xl">
              Explorez les créations de la communauté, votez pour vos scénarios préférés et découvrez comment différentes personnes interprètent une même musique !
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateNew}
            className="px-6 py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs transition-all hover:scale-105 shadow-md flex items-center justify-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>Nouveau Storyboard</span>
          </button>
        </div>
      </div>

      {/* Barre d'outils, Recherche & Sélecteur de Tri */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 border border-stone-200 text-stone-800 flex items-center justify-center">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-display">
                Concepts Cinématographiques
              </h2>
              <p className="text-xs text-stone-500">
                {filteredProposals.length} projet{filteredProposals.length > 1 ? 's' : ''} publié{filteredProposals.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Barre de recherche */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher scénario, auteur..."
                className="w-full bg-white border border-stone-200 rounded-2xl pl-10 pr-3.5 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-900 transition-colors shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-900 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Tri Populaires / Récents */}
            <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setSortBy('likes')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  sortBy === 'likes'
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
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
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
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
                  ? 'bg-stone-900 text-white font-bold shadow-sm'
                  : 'bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200'
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
                    ? 'bg-stone-900 text-white font-bold shadow-sm'
                    : 'bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredProposals.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center space-y-4 shadow-gallery">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 mx-auto flex items-center justify-center text-stone-500">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-stone-900 font-display">Aucun scénario trouvé</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
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
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors"
            >
              Réinitialiser les filtres
            </button>
          ) : (
            <button
              type="button"
              onClick={onCreateNew}
              className="px-6 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs transition-transform hover:scale-105 shadow-md"
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
                className="group bg-white rounded-3xl border border-stone-200 overflow-hidden hover:border-stone-400 transition-all duration-200 cursor-pointer hover:shadow-gallery-hover flex flex-col justify-between shadow-gallery"
              >
                {/* Aperçu Visuel Storyboard */}
                <div className="relative aspect-video bg-stone-100 flex items-center justify-center overflow-hidden border-b border-stone-200">
                  {sketchImage ? (
                    <img
                      src={sketchImage}
                      alt={proposal.movie_title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-stone-400">
                      <Film className="w-8 h-8" />
                      <span className="text-[11px] italic text-stone-500">Storyboard narratif</span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-stone-800 border border-stone-200 shadow-sm backdrop-blur-sm">
                      {proposal.genre}
                    </span>
                    {framesCount > 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-900 text-white flex items-center gap-1 shadow-sm">
                        🎬 {framesCount} frames (Animé)
                      </span>
                    )}
                  </div>

                  {/* Bouton Vote / Like en overlay */}
                  <div className="absolute top-3 right-3 z-20">
                    <button
                      type="button"
                      onClick={(e) => handleVote(e, proposal.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-110 shadow-sm ${
                        isVoted
                          ? 'bg-rose-500 text-white shadow-rose-200'
                          : 'bg-white/95 hover:bg-white text-stone-700 border border-stone-200 backdrop-blur-sm'
                      }`}
                      title="Voter pour ce storyboard"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isVoted ? 'fill-current' : 'text-rose-500'}`} />
                      <span>{proposal.likes_count || 0}</span>
                    </button>
                  </div>

                  <div className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <span className="px-4 py-2 rounded-xl bg-white text-stone-900 font-bold text-xs flex items-center gap-1.5 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Voir le film & écouter
                    </span>
                  </div>
                </div>

                {/* Détails du Projet */}
                <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-base text-stone-900 group-hover:text-rose-600 transition-colors line-clamp-1 font-display">
                      {proposal.movie_title}
                    </h3>
                    <p className="text-xs text-stone-600 line-clamp-2 italic font-serif leading-relaxed">
                      "{proposal.logline || 'Concept sans pitch'}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-stone-700" />
                      <strong className="text-stone-800">{proposal.author_name}</strong>
                    </span>

                    {track && (
                      <span className="flex items-center gap-1 font-mono text-[11px] text-stone-500 truncate max-w-[120px]">
                        <Music className="w-3 h-3 text-stone-400 shrink-0" />
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
