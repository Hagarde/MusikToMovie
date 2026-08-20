import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Film, 
  Clock, 
  User, 
  Heart, 
  BookOpen, 
  Clapperboard, 
  FileText,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Music,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { Proposal, Track } from '../../lib/types';
import { AudioPlayer } from '../audio/AudioPlayer';
import { voteProposal, hasUserVoted } from '../../lib/supabase';

interface ProposalViewerProps {
  proposal: Proposal;
  track: Track | null;
  onBack: () => void;
  isAdmin?: boolean;
  onDeleteProposal?: (proposalId: string) => void;
}

export const ProposalViewer: React.FC<ProposalViewerProps> = ({
  proposal,
  track,
  onBack,
  isAdmin = false,
  onDeleteProposal,
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
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
  const [isPlayingFlipbook, setIsPlayingFlipbook] = useState<boolean>(false);
  const [viewerFps, setViewerFps] = useState<number>(
    proposal.animation_fps ? Number(proposal.animation_fps) : 0.5
  );
  const [forcePlayTime, setForcePlayTime] = useState<number | null>(null);

  // Timecodes de la scène clé
  const startTime = proposal.key_scene_start_time || proposal.scenes?.find(s => s.section_type === 'main')?.start_time || 0;
  const endTime = proposal.key_scene_end_time || proposal.scenes?.find(s => s.section_type === 'main')?.end_time || (track?.duration || 60);

  const isScenePlayingNow = currentTime >= startTime && currentTime <= endTime;

  // Changer les FPS avec feedback visuel instantané
  const changeViewerFps = (fps: number) => {
    setViewerFps(fps);
    if (frames.length > 1) {
      setActiveFrameIndex((prev) => (prev + 1) % frames.length);
    }
  };

  // Basculer la lecture synchronisée : Pause ou relance Image ET Son en même temps
  const togglePlaySync = () => {
    if (isPlayingFlipbook) {
      setIsPlayingFlipbook(false);
      setForcePlayTime(-1); // Coupe le son
    } else {
      setIsPlayingFlipbook(true);
      const targetTime = (currentTime >= startTime && currentTime < endTime) ? currentTime : startTime;
      setForcePlayTime(targetTime); // Lance le son dans la scène
    }
  };

  // Boucle d'animation flipbook avec réactivité instantanée à la vitesse
  useEffect(() => {
    if (!isPlayingFlipbook || frames.length <= 1) return;
    const speed = viewerFps > 0 ? viewerFps : 0.5;
    const intervalMs = Math.max(50, Math.round(1000 / speed));

    const interval = setInterval(() => {
      setActiveFrameIndex((prev) => (prev + 1) % frames.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlayingFlipbook, frames.length, viewerFps]);

  // Écoute de la touche Échap et Espace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTheatreMode) {
        setIsTheatreMode(false);
      }
      if (e.code === 'Space' && (isTheatreMode || document.activeElement === document.body)) {
        e.preventDefault();
        togglePlaySync();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTheatreMode, isPlayingFlipbook, currentTime, startTime, endTime]);

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
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Barre de navigation, Mode Projection et Vote */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700 hover:text-stone-900 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la galerie</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Bouton Mode Projection Cinéma */}
          <button
            type="button"
            onClick={toggleTheatreMode}
            className="px-4 py-2 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-extrabold flex items-center gap-1.5 transition-transform hover:scale-105 shadow-sm"
            title="Lancer le visionnage en plein écran cinéma"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Mode Projection Plein Écran</span>
          </button>

          <button
            type="button"
            onClick={handleVote}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-sm ${
              isVoted
                ? 'bg-rose-500 text-white shadow-rose-200'
                : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
            }`}
          >
            <Heart className={`w-4 h-4 ${isVoted ? 'fill-current' : 'text-rose-500'}`} />
            <span>{isVoted ? 'Voté !' : 'Voter'} ({likesCount})</span>
          </button>

          {/* Bouton de suppression Admin */}
          {isAdmin && onDeleteProposal && (
            <button
              type="button"
              onClick={() => setIsDeleting(true)}
              className="p-2 rounded-2xl bg-white hover:bg-rose-600 text-stone-600 hover:text-white border border-stone-200 shadow-sm transition-colors"
              title="Supprimer ce storyboard (Admin)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <span className="text-xs font-mono text-stone-500 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-sm">
            {new Date(proposal.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      {/* Lecteur Audio/Vidéo YouTube sous la navbar sticky */}
      {track && (
        <div className="sticky top-20 z-30 shadow-2xl rounded-2xl">
          <AudioPlayer
            track={track}
            onTimeUpdate={setCurrentTime}
            onPlayStateChange={(playing) => setIsPlayingFlipbook(playing)}
            highlightRange={{ start: startTime, end: endTime }}
            autoPlay={false}
            forcePlayAtTime={forcePlayTime}
          />
        </div>
      )}

      {/* En-tête du Film Épuré */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-stone-200 p-7 sm:p-9 shadow-gallery space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-800 border border-stone-200 font-mono">
            {proposal.genre}
          </span>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <User className="w-4 h-4 text-stone-700" />
            <span>Scénario imaginé par : <strong className="text-stone-900 font-bold">{proposal.author_name}</strong></span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight font-display">
          {proposal.movie_title}
        </h1>

        {proposal.logline && (
          <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-3xl border-l-2 border-stone-900 pl-4 italic font-serif">
            "{proposal.logline}"
          </p>
        )}
      </div>

      {/* 1. Bloc : Ce qui précède */}
      {contextBefore && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-gallery space-y-3">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-sm border-b border-stone-100 pb-3 font-display">
            <BookOpen className="w-4 h-4 text-stone-700" />
            <span>1. Ce qui précède (Contexte & Mise en place)</span>
          </div>
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
            {contextBefore}
          </p>
        </div>
      )}

      {/* 2. Bloc : LA SCÈNE CLÉ & STORYBOARD ANIMÉ */}
      <div className={`rounded-3xl border-2 p-6 sm:p-7 transition-all duration-300 shadow-gallery space-y-6 ${
        isScenePlayingNow 
          ? 'border-stone-900 bg-white ring-2 ring-stone-900/10' 
          : 'border-stone-200 bg-white'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center font-bold shadow-sm">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base font-display flex items-center gap-2">
                2. La Scène Clé (Le Moment Fort)
                {isScenePlayingNow && (
                  <span className="text-xs font-bold text-rose-600 animate-pulse flex items-center gap-1 font-mono">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                    ● En cours d'écoute
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-500">{keyTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-stone-800 bg-stone-50 px-3.5 py-2 rounded-2xl border border-stone-200 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-stone-600" />
            <span>{formatTime(startTime)} → {formatTime(endTime)}</span>
          </div>
        </div>

        {/* Animation Flipbook Display */}
        <div className="space-y-3">
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200 shadow-gallery bg-black flex items-center justify-center group">
            {frames.length > 0 && frames[activeFrameIndex] ? (
              <img
                src={frames[activeFrameIndex]}
                alt={`Plan ${activeFrameIndex + 1}`}
                className="w-full h-full object-contain select-none pointer-events-none"
              />
            ) : (
              <div className="text-stone-400 text-xs italic">Aucun croquis visuel</div>
            )}

            {frames.length > 1 && (
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-stone-200 flex flex-wrap items-center gap-2.5 text-xs shadow-xl max-w-[calc(100%-4rem)]">
                {/* Bouton Play/Pause Synchronisé Image & Son */}
                <button
                  type="button"
                  onClick={togglePlaySync}
                  className="px-2.5 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-transform hover:scale-105 font-bold flex items-center gap-1.5 shadow-sm"
                  title={isPlayingFlipbook ? 'Mettre en pause image et musique' : 'Lancer le flipbook et la musique'}
                >
                  {isPlayingFlipbook ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  <span>{isPlayingFlipbook ? 'Pause' : 'Lecture'}</span>
                </button>

                <span className="font-mono text-stone-800 text-xs font-bold shrink-0">
                  Plan {activeFrameIndex + 1}/{frames.length}
                </span>

                {/* Sélecteur et slider de cadence d'animation (FPS) */}
                <div className="flex items-center gap-1.5 border-l border-stone-200 pl-2">
                  <span className="text-[10px] text-stone-500 font-semibold hidden md:inline">Cadence :</span>
                  
                  <input
                    type="range"
                    min="0.25"
                    max="4"
                    step="0.25"
                    value={viewerFps}
                    onChange={(e) => changeViewerFps(parseFloat(e.target.value))}
                    className="w-16 sm:w-20 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                    title={`Vitesse d'animation : ${viewerFps} fps`}
                  />

                  <span className="font-mono text-[11px] font-bold text-stone-900 min-w-[55px]">
                    {viewerFps === 0.25 ? '1/4 fps' : viewerFps === 0.5 ? '1/2 fps' : viewerFps === 0.75 ? '3/4 fps' : `${viewerFps} fps`}
                  </span>

                  {/* Pilules de raccourcis FPS */}
                  <div className="hidden lg:flex items-center gap-0.5 border-l border-stone-200 pl-1.5">
                    {[0.25, 0.5, 1, 2, 4].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => changeViewerFps(s)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          viewerFps === s ? 'bg-stone-900 text-white font-bold' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                        }`}
                        title={`Cadence : ${s} images par seconde`}
                      >
                        {s === 0.25 ? '1/4' : s === 0.5 ? '1/2' : `${s}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bouton rapide Plein Écran */}
            <button
              type="button"
              onClick={toggleTheatreMode}
              className="absolute bottom-3 right-3 p-2 rounded-xl bg-white/90 hover:bg-stone-900 hover:text-white text-stone-800 border border-stone-200 backdrop-blur-md transition-all shadow-md"
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
                      ? 'border-stone-900 ring-2 ring-stone-900/20 scale-105 shadow-md'
                      : 'border-stone-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={f} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Intentions de Réalisation & Monde Intérieur (Dire l'Indicible) */}
        {keyDesc && (
          <div className="bg-stone-50 rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider font-display flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                <span>Intentions de Réalisation, Sentiments & l'Indicible</span>
              </h4>
              <span className="text-[10px] text-stone-400 font-mono italic">Sous-texte & dimension émotionnelle</span>
            </div>
            <p className="text-sm sm:text-base text-stone-800 leading-relaxed whitespace-pre-line font-serif italic pl-1 border-l-2 border-rose-500 my-1">
              "{keyDesc}"
            </p>
          </div>
        )}
      </div>

      {/* 3. Bloc : Ce qui succède */}
      {contextAfter && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-gallery space-y-3">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-sm border-b border-stone-100 pb-3 font-display">
            <FileText className="w-4 h-4 text-stone-700" />
            <span>3. Ce qui succède (Résolution & Dénouement)</span>
          </div>
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
            {contextAfter}
          </p>
        </div>
      )}

      {/* 🎬 MODAL DE PROJECTION PLEIN ÉCRAN */}
      {isTheatreMode && (
        <div
          ref={theatreRef}
          className="fixed inset-0 z-50 bg-[#0c0a09] flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-200 select-none"
        >
          <div className="flex items-center justify-between text-white border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-display">{proposal.movie_title}</h2>
                <p className="text-xs text-stone-400 font-mono">
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

          <div className="flex-1 flex items-center justify-center p-2 sm:p-6 my-auto max-h-[75vh]">
            <div className="relative aspect-video w-full max-w-6xl h-full bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
              {frames[activeFrameIndex] ? (
                <img
                  src={frames[activeFrameIndex]}
                  alt={`Plan ${activeFrameIndex + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-stone-500">Plan sans dessin</span>
              )}

              {keyDesc && (
                <div className="absolute bottom-6 inset-x-6 max-w-3xl mx-auto text-center bg-black/85 backdrop-blur-lg px-6 py-3.5 rounded-2xl border border-white/15 text-stone-100 text-xs sm:text-sm leading-relaxed shadow-2xl font-serif italic max-h-32 overflow-y-auto">
                  "{keyDesc}"
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs font-mono text-stone-300">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={togglePlaySync}
                className="px-4 py-2 rounded-xl bg-white text-stone-900 font-black flex items-center gap-2 hover:scale-105 transition-transform shadow-md"
                title={isPlayingFlipbook ? 'Mettre en pause image et musique (Espace)' : 'Lancer image et musique (Espace)'}
              >
                {isPlayingFlipbook ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                <span>{isPlayingFlipbook ? 'Pause' : 'Lecture'}</span>
              </button>

              <span className="text-stone-300 font-bold">
                Plan {activeFrameIndex + 1} / {frames.length}
              </span>

              {/* Contrôleur de vitesse en mode Théâtre */}
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-stone-400 text-[11px]">Vitesse :</span>
                <input
                  type="range"
                  min="0.25"
                  max="4"
                  step="0.25"
                  value={viewerFps}
                  onChange={(e) => changeViewerFps(parseFloat(e.target.value))}
                  className="w-20 h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <span className="font-bold text-white min-w-[55px]">
                  {viewerFps === 0.25 ? '1/4 fps' : viewerFps === 0.5 ? '1/2 fps' : `${viewerFps} fps`}
                </span>

                <div className="flex items-center gap-1 border-l border-white/15 pl-2">
                  {[0.25, 0.5, 1, 2, 4].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => changeViewerFps(s)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        viewerFps === s ? 'bg-white text-stone-900 font-bold' : 'text-stone-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {s === 0.25 ? '1/4' : s === 0.5 ? '1/2' : `${s}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {track && (
              <div className="flex items-center gap-2 text-stone-400">
                <Music className="w-4 h-4 text-rose-500" />
                <span className="truncate max-w-xs">{track.title}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modale de Confirmation de Suppression (Admin) */}
      {isDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-base font-display">Supprimer ce storyboard ?</h4>
                <p className="text-xs text-stone-500">Action irréversible (Mode Administrateur)</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le storyboard{' '}
              <strong className="text-stone-900 font-bold">"{proposal.movie_title}"</strong> par{' '}
              <strong className="text-stone-900">{proposal.author_name}</strong> ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProposal) {
                    onDeleteProposal(proposal.id);
                    onBack();
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all hover:scale-105 shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer définitivement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
