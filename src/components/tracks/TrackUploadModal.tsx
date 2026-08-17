import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Music, 
  Play, 
  Pause, 
  Clock, 
  Loader2, 
  Repeat, 
  Clapperboard,
  RotateCcw,
  FastForward,
  Rewind,
  ArrowRight,
  Disc
} from 'lucide-react';
import { Track } from '../../lib/types';
import { createTrack } from '../../lib/supabase';
import { extractYouTubeId, fetchYouTubeMetadata, getYouTubeThumbnail, loadYouTubeAPI } from '../../lib/youtube';
import { YouTubeIcon } from '../icons/YouTubeIcon';

interface TrackUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackCreated: (newTrack: Track) => void;
}

const GENRES = [
  'Cinématique / Épique',
  'Suspense / Thriller',
  'Science-Fiction / Cyberpunk',
  'Drame / Émotion',
  'Film Noir / Jazz',
  'Action / Course-poursuite',
  'Ambiance / Planant',
];

export const TrackUploadModal: React.FC<TrackUploadModalProps> = ({
  isOpen,
  onClose,
  onTrackCreated,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [duration, setDuration] = useState(180); // 3 minutes par défaut
  
  // Segment : 2 Points (Début et Fin)
  const [startTime, setStartTime] = useState<number>(30);
  const [endTime, setEndTime] = useState<number>(60);
  
  // État de pré-écoute en boucle et tête de lecture dragable
  const [isPlayingLoop, setIsPlayingLoop] = useState<boolean>(false);
  const [currentPlayTime, setCurrentPlayTime] = useState<number>(30);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);

  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const loopIntervalRef = useRef<any>(null);

  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Détection et auto-remplissage lors de la saisie d'un lien YouTube
  useEffect(() => {
    const detectedId = extractYouTubeId(youtubeUrl);
    if (detectedId && detectedId !== youtubeId) {
      setYoutubeId(detectedId);
      setThumbnailUrl(getYouTubeThumbnail(detectedId));
      setIsLoadingMetadata(true);

      fetchYouTubeMetadata(detectedId).then((meta) => {
        setTitle(meta.title);
        setArtist(meta.artist);
        if (meta.thumbnail_url) setThumbnailUrl(meta.thumbnail_url);
        setIsLoadingMetadata(false);
      }).catch(() => {
        setIsLoadingMetadata(false);
      });
    }
  }, [youtubeUrl]);

  // Mise à jour de la durée réelle
  const updateExactDuration = (player: any) => {
    if (!player || typeof player.getDuration !== 'function') return;
    try {
      const videoDuration = player.getDuration();
      if (videoDuration && videoDuration > 0 && Number.isFinite(videoDuration)) {
        const exactSecs = Math.floor(videoDuration);
        setDuration(exactSecs);
        setEndTime((prevEnd) => Math.min(prevEnd, exactSecs));
      }
    } catch (e) {}
  };

  // Initialisation du lecteur YouTube invisible
  useEffect(() => {
    if (!youtubeId || !isOpen) return;
    let isCancelled = false;

    loadYouTubeAPI().then((YT) => {
      if (isCancelled || !ytContainerRef.current) return;

      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
      }

      ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
        videoId: youtubeId,
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            if (isCancelled) return;
            setIsPlayerReady(true);
            updateExactDuration(event.target);
            setCurrentPlayTime(startTime);
          },
          onStateChange: (event: any) => {
            if (isCancelled) return;
            updateExactDuration(event.target);
            if (
              event.data === YT.PlayerState.PAUSED ||
              event.data === YT.PlayerState.ENDED
            ) {
              if (isPlayingLoop && ytPlayerRef.current) {
                ytPlayerRef.current.seekTo(startTime, true);
                ytPlayerRef.current.playVideo();
              }
            }
          },
        },
      });
    });

    return () => {
      isCancelled = true;
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
      }
      setIsPlayingLoop(false);
      setIsPlayerReady(false);
    };
  }, [youtubeId, isOpen]);

  // Surveillance de la boucle de lecture (loop entre startTime et endTime)
  useEffect(() => {
    if (isPlayingLoop && isPlayerReady && ytPlayerRef.current) {
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);

      loopIntervalRef.current = setInterval(() => {
        if (!ytPlayerRef.current || typeof ytPlayerRef.current.getCurrentTime !== 'function') return;
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          if (typeof t === 'number' && !isNaN(t)) {
            setCurrentPlayTime(t);
            // Rebouclage instantané et strict dès que la fin du segment est atteinte
            if (t >= endTime || t < startTime - 1) {
              ytPlayerRef.current.seekTo(startTime, true);
              setCurrentPlayTime(startTime);
            }
          }
        } catch (e) {}
      }, 100);
    } else {
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
    }

    return () => {
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
    };
  }, [isPlayingLoop, isPlayerReady, startTime, endTime]);

  // Démarrer ou arrêter la lecture en boucle du segment
  const toggleLoopPlayback = () => {
    if (!ytPlayerRef.current || !isPlayerReady) return;

    if (isPlayingLoop) {
      ytPlayerRef.current.pauseVideo();
      setIsPlayingLoop(false);
    } else {
      updateExactDuration(ytPlayerRef.current);
      const targetSeek = (currentPlayTime >= startTime && currentPlayTime < endTime) ? currentPlayTime : startTime;
      ytPlayerRef.current.seekTo(targetSeek, true);
      ytPlayerRef.current.playVideo();
      setIsPlayingLoop(true);
    }
  };

  // Sauter à un moment précis dans la boucle (curseur dragable conscrit à [startTime, endTime])
  const handleScrubInLoop = (newTime: number, commit: boolean = false) => {
    const clamped = Math.max(startTime, Math.min(newTime, endTime));
    setCurrentPlayTime(clamped);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(clamped, commit);
    }
  };

  // Revenir au début du segment
  const jumpToLoopStart = () => {
    setCurrentPlayTime(startTime);
    if (ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(startTime, true);
      if (!isPlayingLoop) {
        ytPlayerRef.current.playVideo();
        setIsPlayingLoop(true);
      }
    }
  };

  // Décaler la tête de lecture dans la boucle (ex: -2s / +2s)
  const nudgeCurrentPlayTime = (delta: number) => {
    const newTime = Math.max(startTime, Math.min(currentPlayTime + delta, endTime));
    handleScrubInLoop(newTime, true);
  };

  const handleStartChange = (newStart: number) => {
    const clamped = Math.max(0, Math.min(newStart, endTime - 3));
    setStartTime(clamped);
    if (currentPlayTime < clamped) {
      setCurrentPlayTime(clamped);
    }
    if (ytPlayerRef.current && isPlayingLoop) {
      ytPlayerRef.current.seekTo(clamped, true);
    }
  };

  const handleEndChange = (newEnd: number) => {
    const clamped = Math.max(startTime + 3, Math.min(newEnd, duration));
    setEndTime(clamped);
    if (currentPlayTime > clamped) {
      setCurrentPlayTime(clamped);
    }
  };

  const setSegmentLength = (seconds: number) => {
    const newEnd = Math.min(duration, startTime + seconds);
    setEndTime(newEnd);
    if (newEnd - startTime < seconds) {
      setStartTime(Math.max(0, newEnd - seconds));
    }
  };

  const shiftSegment = (delta: number) => {
    const segmentLen = endTime - startTime;
    let newStart = startTime + delta;
    let newEnd = endTime + delta;

    if (newStart < 0) {
      newStart = 0;
      newEnd = segmentLen;
    }
    if (newEnd > duration) {
      newEnd = duration;
      newStart = Math.max(0, duration - segmentLen);
    }

    setStartTime(newStart);
    setEndTime(newEnd);
    setCurrentPlayTime(newStart);

    if (ytPlayerRef.current && isPlayingLoop) {
      ytPlayerRef.current.seekTo(newStart, true);
    }
  };

  if (!isOpen) return null;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || (!youtubeId && !youtubeUrl)) return;

    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch (e) {}
    }

    setIsSubmitting(true);
    try {
      const created = await createTrack({
        title: title.trim(),
        artist: artist.trim() || 'Artiste YouTube',
        genre,
        audio_url: youtubeUrl.trim(),
        youtube_id: youtubeId || undefined,
        thumbnail_url: thumbnailUrl || (youtubeId ? getYouTubeThumbnail(youtubeId) : undefined),
        duration: duration || 180,
        default_start_time: startTime,
        default_end_time: endTime,
      });

      onTrackCreated(created);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement du morceau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const segmentDuration = Math.max(1, endTime - startTime);
  const clampedPlayTime = Math.max(startTime, Math.min(currentPlayTime, endTime));
  const loopProgressPercent = ((clampedPlayTime - startTime) / segmentDuration) * 100;

  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;
  const playheadPercentOnGlobal = duration > 0 ? (clampedPlayTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      {/* Conteneur YouTube IFrame invisible pour le son */}
      <div className="hidden pointer-events-none opacity-0">
        <div ref={ytContainerRef} />
      </div>

      <div className="bg-cinema-850 rounded-3xl border border-cinema-700 w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-4 sm:my-8">
        {/* En-tête de la modale */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cinema-700/60 bg-cinema-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
              <YouTubeIcon className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">Ajouter une Musique YouTube</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Définissez le segment de scène avec boucle & curseur de position</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (ytPlayerRef.current) {
                try { ytPlayerRef.current.pauseVideo(); } catch (e) {}
              }
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-cinema-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Champ d'import du lien YouTube */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
              <YouTubeIcon className="w-4 h-4 text-red-500" />
              Lien de la vidéo YouTube (Musique / BO) *
            </label>
            <div className="relative">
              <input
                type="url"
                required
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Ex: https://www.youtube.com/watch?v=... ou youtu.be/..."
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors font-mono"
              />
              {isLoadingMetadata && (
                <Loader2 className="w-4 h-4 text-red-400 animate-spin absolute right-3 top-3" />
              )}
            </div>
          </div>

          {/* Aperçu YouTube & Réglage à 2 POINTS avec INDICATEUR DRAGABLE DE BOUCLE */}
          {youtubeId && (
            <div className="bg-cinema-900/90 rounded-2xl border border-cinema-700/80 p-3.5 sm:p-4 space-y-4 animate-in fade-in duration-200">
              <div className="flex gap-3 sm:gap-4 items-center">
                <div className="relative w-24 sm:w-28 aspect-video rounded-xl overflow-hidden border border-cinema-700 shrink-0 bg-black shadow-md">
                  <img
                    src={thumbnailUrl}
                    alt="Aperçu YouTube"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <YouTubeIcon className="w-4 h-4 text-red-500 fill-current drop-shadow" />
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                      ✓ Détecté
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold bg-cinema-800 text-amber-300 border border-cinema-700">
                      Durée totale : {formatSeconds(duration)}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white truncate">{title || 'Chargement...'}</h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{artist}</p>
                </div>
              </div>

              {/* 🎚️ MODULE DE BOUCLE AVEC CURSEUR DE POSITION DRAGABLE */}
              <div className="pt-3 border-t border-cinema-700/60 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-white">Segment de la scène :</span>
                    <span className="font-mono text-xs font-bold text-amber-300 bg-cinema-800 px-2 py-0.5 rounded-lg border border-cinema-700">
                      {formatSeconds(startTime)} → {formatSeconds(endTime)} ({segmentDuration}s)
                    </span>
                  </div>

                  {/* Bouton Lecture en boucle */}
                  <button
                    type="button"
                    onClick={toggleLoopPlayback}
                    disabled={!isPlayerReady}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                      isPlayingLoop
                        ? 'bg-rose-500 text-white shadow-rose-500/30 ring-2 ring-rose-400/50 animate-pulse'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-cinema-950 shadow-amber-500/20 hover:scale-105'
                    } disabled:opacity-50`}
                  >
                    <Repeat className={`w-3.5 h-3.5 ${isPlayingLoop ? 'animate-spin' : ''}`} />
                    <span>{isPlayingLoop ? 'Arrêter la boucle' : '🔁 Écouter en boucle'}</span>
                  </button>
                </div>

                {/* 🎯 CURSEUR TEMPOREL DRAGABLE DANS LA BOUCLE (SCRUBBER CONSCIENT DE LA BOUCLE) */}
                <div className="bg-cinema-800/90 p-3.5 rounded-2xl border border-amber-500/30 space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <Disc className={`w-3.5 h-3.5 text-amber-400 ${isPlayingLoop ? 'animate-spin' : ''}`} />
                      <span>Position dans la boucle :</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-amber-300 font-bold bg-cinema-950 px-2 py-0.5 rounded border border-amber-500/30">
                        {formatSeconds(clampedPlayTime)}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        (+{(clampedPlayTime - startTime).toFixed(1)}s / {segmentDuration}s)
                      </span>
                    </div>
                  </div>

                  {/* Slider de positionnement dragable dans la boucle */}
                  <div className="relative pt-1">
                    <div className="relative h-3 bg-cinema-950 rounded-full overflow-hidden border border-cinema-700/80">
                      {/* Remplissage de progression dans la boucle */}
                      <div
                        className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-75"
                        style={{ width: `${Math.max(0, Math.min(100, loopProgressPercent))}%` }}
                      />
                    </div>

                    {/* Input Range de scrubbing conscrit strictement à [startTime, endTime] */}
                    <input
                      type="range"
                      min={startTime}
                      max={endTime}
                      step="0.1"
                      value={clampedPlayTime}
                      onChange={(e) => handleScrubInLoop(parseFloat(e.target.value), false)}
                      onMouseUp={(e) => handleScrubInLoop(parseFloat((e.target as HTMLInputElement).value), true)}
                      onTouchEnd={(e) => handleScrubInLoop(parseFloat((e.target as HTMLInputElement).value), true)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
                      title="Glisser pour reculer ou avancer précisément dans la boucle"
                    />
                  </div>

                  {/* Contrôles de navigation fine dans la boucle (Revenir au début, -2s, +2s) */}
                  <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={jumpToLoopStart}
                        className="px-2 py-1 rounded-lg bg-cinema-750 hover:bg-cinema-700 text-slate-200 hover:text-white font-semibold flex items-center gap-1 transition-colors border border-white/5"
                        title="Revenir au début de la boucle"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span>Début boucle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => nudgeCurrentPlayTime(-2)}
                        className="px-2 py-1 rounded-lg bg-cinema-750 hover:bg-cinema-700 text-slate-200 hover:text-white font-mono transition-colors border border-white/5"
                        title="Reculer de 2 secondes dans la boucle"
                      >
                        -2s
                      </button>

                      <button
                        type="button"
                        onClick={() => nudgeCurrentPlayTime(2)}
                        className="px-2 py-1 rounded-lg bg-cinema-750 hover:bg-cinema-700 text-slate-200 hover:text-white font-mono transition-colors border border-white/5"
                        title="Avancer de 2 secondes dans la boucle"
                      >
                        +2s
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-400 italic">
                      Glissez la barre pour vous caler au bon moment
                    </span>
                  </div>
                </div>

                {/* Barre Visuelle Globale de la musique & Sélection Début / Fin */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                    <span>Aperçu sur la musique entière :</span>
                    <span className="font-mono text-slate-400 text-[10px]">00:00 → {formatSeconds(duration)}</span>
                  </div>

                  <div className="relative h-2.5 bg-cinema-950 rounded-full overflow-hidden border border-cinema-700/60">
                    {/* Segment Actif en surbrillance Or */}
                    <div
                      className="absolute top-0 bottom-0 bg-amber-500/40 rounded-full transition-all"
                      style={{
                        left: `${startPercent}%`,
                        width: `${Math.max(2, endPercent - startPercent)}%`,
                      }}
                    />
                    {/* Tête de lecture globale */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-sm z-10 transition-all duration-75"
                      style={{ left: `${playheadPercentOnGlobal}%` }}
                    />
                  </div>

                  {/* Sliders de Début et Fin */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 bg-cinema-800/40 p-3 rounded-2xl border border-cinema-700/60">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-slate-300">Point de DÉBUT :</span>
                        <span className="font-mono text-amber-300 font-bold">{formatSeconds(startTime)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(0, duration - 3)}
                        step="1"
                        value={startTime}
                        onChange={(e) => handleStartChange(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-cinema-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-slate-300">Point de FIN :</span>
                        <span className="font-mono text-amber-300 font-bold">{formatSeconds(endTime)}</span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max={Math.max(3, duration)}
                        step="1"
                        value={endTime}
                        onChange={(e) => handleEndChange(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-cinema-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Boutons d'ajustement rapide de durée et décalage */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {/* Décalage temporel */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => shiftSegment(-5)}
                      className="px-2 py-1 rounded-lg bg-cinema-800 hover:bg-cinema-700 text-[10px] font-mono text-slate-300 border border-cinema-700"
                      title="Décaler le segment de 5s vers la gauche"
                    >
                      ◀ -5s
                    </button>
                    <button
                      type="button"
                      onClick={() => shiftSegment(5)}
                      className="px-2 py-1 rounded-lg bg-cinema-800 hover:bg-cinema-700 text-[10px] font-mono text-slate-300 border border-cinema-700"
                      title="Décaler le segment de 5s vers la droite"
                    >
                      +5s ▶
                    </button>
                  </div>

                  {/* Tailles de boucle prédéfinies */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 mr-1">Durée boucle :</span>
                    {[15, 20, 30, 45, 60].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSegmentLength(s)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors ${
                          segmentDuration === s
                            ? 'bg-amber-500 text-cinema-950 font-bold border-amber-400'
                            : 'bg-cinema-800 hover:bg-cinema-700 text-slate-300 border border-cinema-700'
                        }`}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Formulaire des métadonnées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Titre du morceau *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Time - Inception"
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Artiste / Compositeur
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Ex: Hans Zimmer"
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Genre / Ambiance Cinéma
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 sm:pt-4 border-t border-cinema-700/60">
            <button
              type="button"
              onClick={() => {
                if (ytPlayerRef.current) {
                  try { ytPlayerRef.current.pauseVideo(); } catch (e) {}
                }
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-cinema-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title || !youtubeUrl}
              className="px-5 sm:px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-cinema-950 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md hover:scale-105"
            >
              <Clapperboard className="w-4 h-4" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Ajouter & Créer un Storyboard'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
