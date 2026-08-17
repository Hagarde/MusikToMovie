import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Film, 
  Clock, 
  User, 
  Heart, 
  Share2, 
  Sparkles, 
  BookOpen, 
  Clapperboard, 
  FileText,
  Play,
  Pause,
  Layers
} from 'lucide-react';
import { Proposal, Track } from '../../lib/types';
import { AudioPlayer } from '../audio/AudioPlayer';
import { voteProposal, hasUserVoted } from '../../lib/supabase';

interface ProposalViewerProps {
  proposal: Proposal;
  track: Track | null;
  onBack: () => void;
}

export const ProposalViewer: React.FC<ProposalViewerProps> = ({
  proposal,
  track,
  onBack,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [likesCount, setLikesCount] = useState<number>(proposal.likes_count || 0);
  const [isVoted, setIsVoted] = useState<boolean>(hasUserVoted(proposal.id));

  // Animation Flipbook de la Scène Clé
  const frames = proposal.frames && proposal.frames.length > 0 
    ? proposal.frames 
    : proposal.scenes?.map(s => s.image_data).filter(Boolean) || [];

  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [isPlayingFlipbook, setIsPlayingFlipbook] = useState<boolean>(true);

  // Timecodes de la scène clé
  const startTime = proposal.key_scene_start_time || proposal.scenes?.find(s => s.section_type === 'main')?.start_time || 0;
  const endTime = proposal.key_scene_end_time || proposal.scenes?.find(s => s.section_type === 'main')?.end_time || (track?.duration || 60);

  const isScenePlayingNow = currentTime >= startTime && currentTime <= endTime;

  // Boucle d'animation flipbook
  useEffect(() => {
    if (!isPlayingFlipbook || frames.length <= 1) return;
    const fps = proposal.animation_fps || 3;
    const interval = setInterval(() => {
      setActiveFrameIndex((prev) => (prev + 1) % frames.length);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlayingFlipbook, frames.length, proposal.animation_fps]);

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

  const contextBefore = proposal.context_before || proposal.scenes?.find(s => s.section_type === 'preceding')?.description || '';
  const contextAfter = proposal.context_after || proposal.scenes?.find(s => s.section_type === 'succeeding')?.description || '';
  const keyTitle = proposal.key_scene_title || proposal.scenes?.find(s => s.section_type === 'main')?.scene_title || 'La Scène Clé';
  const keyDesc = proposal.key_scene_description || proposal.scenes?.find(s => s.section_type === 'main')?.description || '';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Barre de navigation et Vote */}
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
          <button
            type="button"
            onClick={handleVote}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-transform hover:scale-105 shadow-md ${
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

      {/* Lecteur Audio/Vidéo YouTube */}
      {track && (
        <div className="sticky top-4 z-40">
          <AudioPlayer
            track={track}
            onTimeUpdate={setCurrentTime}
            highlightRange={{ start: startTime, end: endTime }}
            autoPlay
          />
        </div>
      )}

      {/* En-tête du Film */}
      <div className="bg-gradient-to-br from-cinema-850 via-cinema-800 to-cinema-900 rounded-3xl border border-cinema-700/80 p-8 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-brand-500/20 text-brand-400 border border-brand-500/40">
            {proposal.genre}
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <User className="w-4 h-4 text-brand-400" />
            <span>Scénario imaginé par : <strong className="text-slate-200">{proposal.author_name}</strong></span>
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

      {/* 1. Bloc : Ce qui précède */}
      {contextBefore && (
        <div className="bg-cinema-850 rounded-2xl border border-blue-500/30 p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm border-b border-cinema-700/50 pb-2.5">
            <BookOpen className="w-4 h-4" />
            <span>1. Ce qui précède (Contexte & Mise en place)</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {contextBefore}
          </p>
        </div>
      )}

      {/* 2. Bloc : LA SCÈNE CLÉ & STORYBOARD ANIMÉ */}
      <div className={`bg-cinema-850 rounded-3xl border-2 p-6 transition-all duration-300 shadow-2xl space-y-6 ${
        isScenePlayingNow 
          ? 'border-brand-400 bg-gradient-to-br from-cinema-800 to-cinema-850 ring-2 ring-brand-400/40 shadow-brand-500/10' 
          : 'border-brand-500/60'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cinema-700/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500 text-cinema-950 flex items-center justify-center font-bold">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                2. La Scène Clé (Le Moment Fort)
                {isScenePlayingNow && (
                  <span className="text-xs font-bold text-brand-400 animate-pulse">
                    ● En cours d'écoute
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">{keyTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-cinema-900 px-3 py-1.5 rounded-xl border border-cinema-700">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span>{formatTime(startTime)} → {formatTime(endTime)}</span>
          </div>
        </div>

        {/* Animation Flipbook Display */}
        <div className="space-y-3">
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-cinema-700 shadow-2xl bg-black flex items-center justify-center group">
            {frames.length > 0 && frames[activeFrameIndex] ? (
              <img
                src={frames[activeFrameIndex]}
                alt={`Plan ${activeFrameIndex + 1}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-slate-500 text-xs italic">Aucun croquis visuel</div>
            )}

            {frames.length > 1 && (
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsPlayingFlipbook(!isPlayingFlipbook)}
                  className="p-1 rounded-lg bg-brand-500 text-cinema-950 hover:bg-brand-400 transition-colors"
                >
                  {isPlayingFlipbook ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                </button>
                <span className="font-mono text-slate-300 text-[11px]">
                  Frame {activeFrameIndex + 1} / {frames.length} ({proposal.animation_fps || 3} fps)
                </span>
              </div>
            )}
          </div>

          {/* Vignettes des frames */}
          {frames.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {frames.map((f, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsPlayingFlipbook(false);
                    setActiveFrameIndex(idx);
                  }}
                  className={`w-14 h-9 rounded-lg overflow-hidden border-2 transition-all shrink-0 bg-black ${
                    activeFrameIndex === idx
                      ? 'border-brand-400 ring-2 ring-brand-400/40 scale-105'
                      : 'border-cinema-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={f} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Intentions de mise en scène */}
        {keyDesc && (
          <div className="bg-cinema-900/80 rounded-xl p-4 border border-cinema-700/60">
            <h4 className="text-xs font-bold text-brand-300 uppercase tracking-wider mb-1">
              Intentions de réalisation & synchronisation
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {keyDesc}
            </p>
          </div>
        )}
      </div>

      {/* 3. Bloc : Ce qui succède */}
      {contextAfter && (
        <div className="bg-cinema-850 rounded-2xl border border-purple-500/30 p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm border-b border-cinema-700/50 pb-2.5">
            <FileText className="w-4 h-4" />
            <span>3. Ce qui succède (Résolution & Dénouement)</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {contextAfter}
          </p>
        </div>
      )}
    </div>
  );
};
