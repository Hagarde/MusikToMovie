import React, { useState } from 'react';
import { ArrowLeft, Film, Clock, User, Heart, Share2, Sparkles } from 'lucide-react';
import { Proposal, Track } from '../../lib/types';
import { AudioPlayer } from '../audio/AudioPlayer';
import { voteProposal, hasUserVoted } from '../../lib/supabase';

interface ProposalViewerProps {
  proposal: Proposal;
  track: Track | null;
  onBack: () => void;
}

const SECTION_LABELS: Record<string, { label: string; color: string }> = {
  preceding: { label: '1. Éléments Précédents', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  main: { label: '2. Scène Clé (Synchronisée)', color: 'bg-brand-500/20 text-brand-300 border-brand-500/60 ring-1 ring-brand-500/40' },
  succeeding: { label: '3. Éléments Succédants', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
};

export const ProposalViewer: React.FC<ProposalViewerProps> = ({
  proposal,
  track,
  onBack,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [likesCount, setLikesCount] = useState<number>(proposal.likes_count || 0);
  const [isVoted, setIsVoted] = useState<boolean>(hasUserVoted(proposal.id));

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleVote = async () => {
    const newCount = await voteProposal(proposal.id);
    setLikesCount(newCount);
    setIsVoted(!isVoted);
  };

  const scenes = proposal.scenes || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cinema-850 hover:bg-cinema-800 border border-cinema-700 text-xs font-medium text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la galerie</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Bouton Vote */}
          <button
            type="button"
            onClick={handleVote}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-transform hover:scale-105 shadow-md ${
              isVoted
                ? 'bg-rose-500 text-white shadow-rose-500/30'
                : 'bg-cinema-850 hover:bg-cinema-800 text-slate-200 border border-cinema-700'
            }`}
          >
            <Heart className={`w-4 h-4 ${isVoted ? 'fill-current' : 'text-rose-400'}`} />
            <span>{isVoted ? 'Voté !' : 'Voter'} ({likesCount})</span>
          </button>

          <span className="text-xs font-mono text-slate-400">
            {new Date(proposal.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      {/* Lecteur Audio */}
      {track && (
        <div className="sticky top-4 z-40">
          <AudioPlayer track={track} onTimeUpdate={setCurrentTime} autoPlay />
        </div>
      )}

      {/* En-tête du Film */}
      <div className="bg-gradient-to-br from-cinema-850 via-cinema-800 to-cinema-900 rounded-3xl border border-cinema-700/80 p-8 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-500/20 text-brand-400 border border-brand-500/40">
            {proposal.genre}
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <User className="w-4 h-4 text-brand-400" />
            <span>Scénario par : <strong className="text-slate-200">{proposal.author_name}</strong></span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
          {proposal.movie_title}
        </h1>

        {proposal.logline && (
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl border-l-2 border-brand-500 pl-4 italic">
            "{proposal.logline}"
          </p>
        )}
      </div>

      {/* Déroulé du Storyboard Cinématique */}
      <div className="space-y-8">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-cinema-700/60 pb-3">
          <Film className="w-5 h-5 text-brand-400" />
          Storyboard & Découpage Narratif
        </h3>

        <div className="space-y-6">
          {scenes.map((scene, idx) => {
            const isCurrentlyPlaying =
              currentTime >= scene.start_time && currentTime <= scene.end_time;
            const config = SECTION_LABELS[scene.section_type] || {
              label: `Séquence ${idx + 1}`,
              color: 'bg-cinema-800 text-slate-300 border-cinema-700',
            };

            return (
              <div
                key={scene.id || idx}
                className={`bg-cinema-850 rounded-2xl border p-6 transition-all duration-300 shadow-xl ${
                  isCurrentlyPlaying
                    ? 'border-brand-400/90 bg-gradient-to-r from-cinema-800 to-cinema-850 ring-2 ring-brand-400/40 shadow-brand-500/10 scale-[1.01]'
                    : 'border-cinema-700/60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cinema-700/50 pb-3 mb-5">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
                      {config.label}
                    </span>
                    {isCurrentlyPlaying && (
                      <span className="flex items-center gap-1 text-xs font-bold text-brand-400 animate-pulse">
                        ● Scène en cours d'écoute
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-cinema-900 px-3 py-1 rounded-lg border border-cinema-700/50">
                    <Clock className="w-3.5 h-3.5 text-brand-400" />
                    <span>{formatTime(scene.start_time)} → {formatTime(scene.end_time)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Image du Storyboard */}
                  <div className="lg:col-span-7">
                    {scene.image_data ? (
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-cinema-700 shadow-inner bg-black flex items-center justify-center">
                        <img
                          src={scene.image_data}
                          alt={scene.scene_title || 'Croquis de scène'}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-xl bg-cinema-900 border border-cinema-700/60 flex items-center justify-center text-slate-500 text-xs italic">
                        Aucun croquis visuel pour cette séquence
                      </div>
                    )}
                  </div>

                  {/* Description littéraire */}
                  <div className="lg:col-span-5 flex flex-col justify-start space-y-3">
                    {scene.scene_title && (
                      <h4 className="text-base font-bold text-white text-brand-300">
                        {scene.scene_title}
                      </h4>
                    )}

                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                      {scene.description || <span className="italic text-slate-500">Pas de description rédigée.</span>}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
