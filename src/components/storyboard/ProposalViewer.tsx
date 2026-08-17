import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Film, 
  Clock, 
  User, 
  Heart, 
  Sparkles, 
  BookOpen, 
  Clapperboard, 
  FileText,
  Play,
  Pause,
  Layers,
  Maximize2,
  Minimize2,
  Music
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
  const theatreRef = useRef<HTMLDivElement | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [likesCount, setLikesCount] = useState<number>(proposal.likes_count || 0);
  const [isVoted, setIsVoted] = useState<boolean>(hasUserVoted(proposal.id));
  const [isTheatreMode, setIsTheatreMode] = useState<boolean>(false);

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

  // Écoute de la touche Échap pour quitter le mode projection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTheatreMode) {
        setIsTheatreMode(false);
      }
      if (e.code === 'Space' && isTheatreMode) {
        e.preventDefault();
        setIsPlayingFlipbook(!isPlayingFlipbook);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTheatreMode, isPlayingFlipbook]);

  const toggleTheatreMode = () => {
    if (!isTheatreMode) {
      setIsTheatreMode(true);
      if (theatreRef.current && theatreRef.current.requestFullscreen) {
        theatreRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      setIsTheatreMode(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

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
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Barre de navigation, Mode Projection et Vote */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cinema-850 hover:bg-cinema-750 border border-white/5 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la galerie</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Bouton Mode Projection Cinéma */}
          <button
            type="button"
            onClick={toggleTheatreMode}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-cinema-950 text-xs font-extrabold flex items-center gap-1.5 transition-transform hover:scale-105 shadow-md shadow-amber-500/20"
            title="Lancer le visionnage en plein écran cinéma"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Mode Projection Plein Écran</span>
          </button>

          <button
            type="button"
            onClick={handleVote}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-md ${
              isVoted
                ? 'bg-rose-500 text-white shadow-rose-500/30 ring-2 ring-rose-400/40'
                : 'bg-cinema-850 hover:bg-cinema-750 text-slate-200 border border-white/5'
            }`}
          >
            <Heart className={`w-4 h-4 ${isVoted ? 'fill-current' : 'text-rose-400'}`} />
            <span>{isVoted ? 'Voté !' : 'Voter'} ({likesCount})</span>
          </button>

          <span className="text-xs font-mono text-slate-400 bg-cinema-850/80 px-3 py-1.5 rounded-xl border border-white/5">
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

      {/* En-tête du Film (Ambiance Chaleureuse Cinema) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cinema-850 via-cinema-800 to-cinema-900 border border-amber-500/20 p-7 sm:p-9 shadow-2xl space-y-4">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
            {proposal.genre}
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <User className="w-4 h-4 text-amber-400" />
            <span>Scénario imaginé par : <strong className="text-slate-100 font-bold">{proposal.author_name}</strong></span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          {proposal.movie_title}
        </h1>

        {proposal.logline && (
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl border-l-2 border-amber-500 pl-4 italic font-serif">
            "{proposal.logline}"
          </p>
        )}
      </div>

      {/* 1. Bloc : Ce qui précède */}
      {contextBefore && (
        <div className="bg-cinema-850/90 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-6 sm:p-7 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-cinema-700/50 pb-3 font-display">
            <BookOpen className="w-4 h-4" />
            <span>1. Ce qui précède (Contexte & Mise en place)</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {contextBefore}
          </p>
        </div>
      )}

      {/* 2. Bloc : LA SCÈNE CLÉ & STORYBOARD ANIMÉ */}
      <div className={`rounded-3xl border-2 p-6 sm:p-7 transition-all duration-500 shadow-2xl space-y-6 ${
        isScenePlayingNow 
          ? 'border-amber-400 bg-gradient-to-br from-cinema-800 via-cinema-850 to-cinema-900 ring-4 ring-amber-400/20 shadow-amber-500/15' 
          : 'border-amber-500/60 bg-cinema-850/95'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cinema-700/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-cinema-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-display flex items-center gap-2">
                2. La Scène Clé (Le Moment Fort)
                {isScenePlayingNow && (
                  <span className="text-xs font-bold text-amber-400 animate-pulse flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    ● En cours d'écoute
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">{keyTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-200 bg-cinema-900 px-3.5 py-2 rounded-2xl border border-cinema-700 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
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
                className="w-full h-full object-contain select-none pointer-events-none"
              />
            ) : (
              <div className="text-slate-500 text-xs italic">Aucun croquis visuel</div>
            )}

            {frames.length > 1 && (
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 flex items-center gap-2.5 text-xs shadow-lg">
                <button
                  type="button"
                  onClick={() => setIsPlayingFlipbook(!isPlayingFlipbook)}
                  className="p-1 rounded-lg bg-amber-500 text-cinema-950 hover:bg-amber-400 transition-colors font-bold"
                >
                  {isPlayingFlipbook ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                </button>
                <span className="font-mono text-slate-200 text-xs font-bold">
                  Frame {activeFrameIndex + 1} / {frames.length} ({proposal.animation_fps || 3} fps)
                </span>
              </div>
            )}

            {/* Bouton rapide Plein Écran en coin de lecteur */}
            <button
              type="button"
              onClick={toggleTheatreMode}
              className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/70 hover:bg-amber-500 hover:text-cinema-950 text-slate-300 border border-white/10 backdrop-blur-md transition-all shadow-lg"
              title="Agrandir en mode projection plein écran"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
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
                  className={`w-16 h-10 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-black ${
                    activeFrameIndex === idx
                      ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105 shadow-md'
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
          <div className="bg-cinema-900/90 rounded-2xl p-4 border border-cinema-700/60 shadow-inner">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1 font-display">
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
        <div className="bg-cinema-850/90 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-6 sm:p-7 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm border-b border-cinema-700/50 pb-3 font-display">
            <FileText className="w-4 h-4" />
            <span>3. Ce qui succède (Résolution & Dénouement)</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {contextAfter}
          </p>
        </div>
      )}

      {/* 🎬 MODAL DE PROJECTION PLEIN ÉCRAN (THEATRE MODE) */}
      {isTheatreMode && (
        <div
          ref={theatreRef}
          className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-200 select-none"
        >
          {/* Barre supérieure de projection */}
          <div className="flex items-center justify-between text-white border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold font-display">{proposal.movie_title}</h2>
                <p className="text-xs text-amber-300 font-mono">
                  {keyTitle} • {formatTime(startTime)} → {formatTime(endTime)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheatreMode}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Quitter le plein écran (Échap)</span>
              </button>
            </div>
          </div>

          {/* Écran central de projection de la Scène */}
          <div className="flex-1 flex items-center justify-center p-2 sm:p-6 my-auto max-h-[75vh]">
            <div className="relative aspect-video w-full max-w-6xl h-full bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
              {frames[activeFrameIndex] ? (
                <img
                  src={frames[activeFrameIndex]}
                  alt={`Plan ${activeFrameIndex + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-slate-500">Plan sans dessin</span>
              )}

              {/* Sous-titre cinématique flottant */}
              {keyDesc && (
                <div className="absolute bottom-6 inset-x-8 max-w-2xl mx-auto text-center bg-black/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-white text-xs sm:text-sm leading-relaxed shadow-2xl">
                  {keyDesc}
                </div>
              )}
            </div>
          </div>

          {/* Contrôles de projection inférieurs */}
          <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlayingFlipbook(!isPlayingFlipbook)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-cinema-950 font-black flex items-center gap-2 hover:scale-105 transition-transform"
              >
                {isPlayingFlipbook ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlayingFlipbook ? 'Pause' : 'Lecture'}</span>
              </button>

              <span className="text-slate-400">
                Frame {activeFrameIndex + 1} / {frames.length}
              </span>
            </div>

            {track && (
              <div className="flex items-center gap-2 text-slate-400">
                <Music className="w-4 h-4 text-amber-400" />
                <span className="truncate max-w-xs">{track.title}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
