import React from 'react';
import { Film, User, Sparkles, Play, Clock, Music } from 'lucide-react';
import { Proposal, Track } from '../../lib/types';

interface ProposalsGalleryProps {
  proposals: Proposal[];
  tracks: Track[];
  onSelectProposal: (proposal: Proposal) => void;
  onCreateNew: () => void;
}

export const ProposalsGallery: React.FC<ProposalsGalleryProps> = ({
  proposals,
  tracks,
  onSelectProposal,
  onCreateNew,
}) => {
  const getTrackForProposal = (trackId: string) => {
    return tracks.find((t) => t.id === trackId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-brand-400" />
            Galerie des Scénarios & Storyboards
          </h2>
          <p className="text-xs text-slate-400">
            Découvrez comment chaque créateur a visualisé un univers cinématographique pour chaque musique
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-cinema-900 font-semibold text-xs transition-transform hover:scale-105 shadow-md flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          Créer un nouveau scénario
        </button>
      </div>

      {proposals.length === 0 ? (
        <div className="bg-cinema-850 border border-cinema-700/60 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cinema-800 border border-cinema-700 mx-auto flex items-center justify-center text-brand-400">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">Aucun scénario créé pour l'instant</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Soyez le premier à imaginer une séquence cinématographique à partir de notre bibliothèque musicale !
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-cinema-900 font-bold text-xs transition-transform hover:scale-105"
          >
            Commencer un Storyboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proposals.map((proposal) => {
            const track = getTrackForProposal(proposal.track_id);
            const mainScene = proposal.scenes?.find((s) => s.section_type === 'main') || proposal.scenes?.[0];
            const sketchImage = mainScene?.image_data;

            return (
              <div
                key={proposal.id}
                onClick={() => onSelectProposal(proposal)}
                className="group bg-cinema-850 rounded-2xl border border-cinema-700/60 overflow-hidden hover:border-brand-500/70 transition-all cursor-pointer hover:shadow-2xl flex flex-col justify-between"
              >
                {/* Aperçu Visuel Storyboard */}
                <div className="relative aspect-video bg-cinema-900 flex items-center justify-center overflow-hidden border-b border-cinema-700/60">
                  {sketchImage ? (
                    <img
                      src={sketchImage}
                      alt={proposal.movie_title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-600">
                      <Film className="w-8 h-8" />
                      <span className="text-[11px] italic">Storyboard textuel</span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cinema-900/90 text-brand-300 border border-cinema-700 backdrop-blur-sm">
                      {proposal.genre}
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <span className="px-4 py-2 rounded-xl bg-brand-500 text-cinema-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Voir le film & écouter
                    </span>
                  </div>
                </div>

                {/* Détails du Projet */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-base text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                      {proposal.movie_title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 italic">
                      "{proposal.logline || 'Concept sans pitch'}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-cinema-700/50 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-brand-400" />
                      <strong className="text-slate-200">{proposal.author_name}</strong>
                    </span>

                    {track && (
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                        <Music className="w-3 h-3 text-brand-400 shrink-0" />
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
