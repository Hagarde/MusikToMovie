import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Clock, 
  Loader2, 
  Repeat, 
  Clapperboard,
  RotateCcw,
  Disc,
  Music,
  ExternalLink,
  Info,
  AlertTriangle
} from 'lucide-react';
import { Track, GENRES } from '../../lib/types';
import { createTrack } from '../../lib/supabase';
import { 
  getYouTubeThumbnail, 
  loadYouTubeAPI,
  resolveUniversalTrack,
  buildYouTubeSearchUrl,
  UniversalTrackInfo
} from '../../lib/youtube';
import { YouTubeIcon } from '../icons/YouTubeIcon';

interface TrackUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackCreated: (newTrack: Track) => void;
}

export const TrackUploadModal: React.FC<TrackUploadModalProps> = ({
  isOpen,
  onClose,
  onTrackCreated,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [detectedInfo, setDetectedInfo] = useState<UniversalTrackInfo | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [duration, setDuration] = useState(180);
  
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

  // Détection multi-plateforme et auto-remplissage
  useEffect(() => {
    const trimmed = youtubeUrl.trim();
    if (!trimmed) {
      setYoutubeId(null);
      setDetectedInfo(null);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoadingMetadata(true);
      resolveUniversalTrack(trimmed).then((info) => {
        setDetectedInfo(info);
        if (info.youtubeId) {
          setYoutubeId(info.youtubeId);
          setThumbnailUrl(info.thumbnail_url || getYouTubeThumbnail(info.youtubeId));
          if (info.title) setTitle(info.title);
          if (info.artist) setArtist(info.artist);
        } else {
          setYoutubeId(null);
          if (info.title) setTitle(info.title);
          if (info.artist) setArtist(info.artist);
          if (info.thumbnail_url) setThumbnailUrl(info.thumbnail_url);
        }
        setIsLoadingMetadata(false);
      }).catch(() => {
        setIsLoadingMetadata(false);
      });
    }, 200);

    return () => clearTimeout(timer);
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

  // Surveillance de la boucle de lecture (loop active entre startTime et endTime avec rafraîchissement 50ms)
  useEffect(() => {
    if (isPlayingLoop && isPlayerReady && ytPlayerRef.current) {
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);

      loopIntervalRef.current = setInterval(() => {
        if (!ytPlayerRef.current || typeof ytPlayerRef.current.getCurrentTime !== 'function') return;
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          if (typeof t === 'number' && !isNaN(t)) {
            setCurrentPlayTime(t);
            if (t >= endTime || t < startTime - 0.5) {
              ytPlayerRef.current.seekTo(startTime, true);
              setCurrentPlayTime(startTime);
            }
          }
        } catch (e) {}
      }, 50);
    } else {
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
    }

    return () => {
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
    };
  }, [isPlayingLoop, isPlayerReady, startTime, endTime]);

  // Couper la musique d'arrière-plan dès l'ouverture de la modale
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('m2m-audio-play', { detail: { id: 'upload-modal-preview' } }));
    } else {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try { ytPlayerRef.current.pauseVideo(); } catch (_) {}
      }
      setIsPlayingLoop(false);
    }
  }, [isOpen]);

  // Coordination Globale : couper la pré-écoute de la modale si un autre lecteur est activé
  useEffect(() => {
    const handleOtherPlay = (e: any) => {
      if (e.detail?.id && e.detail.id !== 'upload-modal-preview') {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
          try { ytPlayerRef.current.pauseVideo(); } catch (_) {}
        }
        setIsPlayingLoop(false);
      }
    };

    window.addEventListener('m2m-audio-play', handleOtherPlay);
    return () => window.removeEventListener('m2m-audio-play', handleOtherPlay);
  }, []);

  const notifyModalAudioPlay = () => {
    window.dispatchEvent(new CustomEvent('m2m-audio-play', { detail: { id: 'upload-modal-preview' } }));
  };

  const toggleLoopPlayback = () => {
    if (!ytPlayerRef.current || !isPlayerReady) return;

    if (isPlayingLoop) {
      ytPlayerRef.current.pauseVideo();
      setIsPlayingLoop(false);
    } else {
      notifyModalAudioPlay();
      updateExactDuration(ytPlayerRef.current);
      const targetSeek = (currentPlayTime >= startTime && currentPlayTime < endTime) ? currentPlayTime : startTime;
      ytPlayerRef.current.seekTo(targetSeek, true);
      ytPlayerRef.current.playVideo();
      setIsPlayingLoop(true);
    }
  };

  const handleScrubInLoop = (newTime: number, commit: boolean = false) => {
    const clamped = Math.max(startTime, Math.min(newTime, endTime));
    setCurrentPlayTime(clamped);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(clamped, commit);
    }
  };

  const jumpToLoopStart = () => {
    setCurrentPlayTime(startTime);
    notifyModalAudioPlay();
    if (ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(startTime, true);
      if (!isPlayingLoop) {
        ytPlayerRef.current.playVideo();
        setIsPlayingLoop(true);
      }
    }
  };

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
  const loopElapsed = Math.max(0, clampedPlayTime - startTime);
  const loopRemaining = Math.max(0, endTime - clampedPlayTime);
  const loopProgressPercent = (loopElapsed / segmentDuration) * 100;
  const isNearEnd = loopRemaining <= 3.0 && segmentDuration > 3;

  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;
  const playheadPercentOnGlobal = duration > 0 ? (clampedPlayTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="hidden pointer-events-none opacity-0">
        <div ref={ytContainerRef} />
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-4 sm:my-8">
        {/* En-tête de la modale */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center border border-stone-800 shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm sm:text-base font-display">Ajouter une Musique</h3>
              <p className="text-[10px] sm:text-[11px] text-stone-500">YouTube (recommandé), Spotify, Deezer, SoundCloud</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (ytPlayerRef.current) {
                try { ytPlayerRef.current.pauseVideo(); } catch (e) {}
              }
              onClose();
            }}
            className="text-stone-400 hover:text-stone-900 p-1.5 rounded-lg hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Champ d'import du lien musical (YouTube recommandé, Spotify, Deezer, SoundCloud) */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Music className="w-4 h-4 text-rose-600" />
                Lien de la musique ou BO *
              </label>
              <span className="text-[10px] text-stone-500 font-mono">
                YouTube (recommandé), Spotify, Deezer, SoundCloud
              </span>
            </div>

            <div className="relative">
              <input
                type="url"
                required
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Ex: Lien YouTube (recommandé), Spotify, Deezer, SoundCloud..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 transition-colors font-mono"
              />
              {isLoadingMetadata && (
                <Loader2 className="w-4 h-4 text-rose-600 animate-spin absolute right-3 top-3" />
              )}
            </div>
          </div>

          {/* 🟢/🟣/🟠 Passerelle Intelligente : Morceau détecté sur Spotify, Deezer ou SoundCloud */}
          {detectedInfo && detectedInfo.requiresYouTubeLink && detectedInfo.platform !== 'unknown' && (
            <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-3.5 sm:p-4 space-y-3 animate-in fade-in duration-150 shadow-sm">
              <div className="flex items-start gap-3">
                {detectedInfo.thumbnail_url ? (
                  <img
                    src={detectedInfo.thumbnail_url}
                    alt="Pochette"
                    className="w-12 h-12 rounded-xl object-cover border border-amber-200 shrink-0 shadow-sm bg-black"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0 text-base">
                    🎵
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-mono">
                      {detectedInfo.platform === 'spotify' ? '🟢 Spotify' : detectedInfo.platform === 'deezer' ? '🟣 Deezer' : '🟠 SoundCloud'}
                    </span>
                    <span className="text-[11px] text-amber-950 font-bold">
                      Morceau identifié avec succès
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate mt-0.5">
                    {detectedInfo.title}
                  </h4>
                  {detectedInfo.artist && (
                    <p className="text-[11px] text-stone-600 truncate">{detectedInfo.artist}</p>
                  )}
                </div>
              </div>

              {/* Avertissement & Consigne explicite : YouTube est à privilégier */}
              <div className="bg-white/90 p-3 rounded-xl border border-amber-200/80 text-xs text-stone-800 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>YouTube est à privilégier pour la synchronisation storyboard :</span>
                </p>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Les liens direct {detectedInfo.platform} sont bridés à 30 secondes. Pour calibrer votre scène au millième de seconde et profiter du morceau complet, trouvez la version YouTube en 1 clic :
                </p>

                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <a
                    href={buildYouTubeSearchUrl(detectedInfo.searchQuery || `${detectedInfo.title} ${detectedInfo.artist}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-transform hover:scale-105 shadow-sm"
                  >
                    <YouTubeIcon className="w-3.5 h-3.5 fill-current" />
                    <span>Trouver sur YouTube (1 clic)</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                  <span className="text-[11px] text-stone-500">Puis collez l'URL YouTube ci-dessus</span>
                </div>
              </div>
            </div>
          )}

          {/* ⚠️ Doute ou lien non reconnu : Arrêt du processus et consigne YouTube */}
          {detectedInfo && detectedInfo.platform === 'unknown' && youtubeUrl.trim().length > 8 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-rose-950 animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-900">Lien non reconnu ou non synchronisable</p>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Ce lien ne permet pas de garantir le calage de la boucle. <strong>Les liens YouTube directs fonctionnent beaucoup mieux</strong>. Veuillez coller une URL YouTube valide (ex: <code>https://www.youtube.com/watch?v=...</code> ou <code>https://youtu.be/...</code>).
                </p>
              </div>
            </div>
          )}

          {/* Aperçu YouTube & Module de Boucle */}
          {youtubeId && (
            <div className="bg-stone-50 rounded-2xl border border-stone-200 p-3.5 sm:p-4 space-y-4 shadow-sm">
              <div className="flex gap-3 sm:gap-4 items-center">
                <div className="relative w-24 sm:w-28 aspect-video rounded-xl overflow-hidden border border-stone-200 shrink-0 bg-black shadow-sm">
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
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                      ✓ Détecté
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold bg-white text-stone-800 border border-stone-200">
                      Durée totale : {formatSeconds(duration)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 truncate">{title || 'Chargement...'}</h4>
                  <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">{artist}</p>
                </div>
              </div>

              {/* Module de Boucle & Scrubber */}
              <div className="pt-3 border-t border-stone-200 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-stone-700" />
                    <span className="text-xs font-bold text-stone-900">Segment de la scène :</span>
                    <span className="font-mono text-xs font-bold text-stone-800 bg-white px-2 py-0.5 rounded-lg border border-stone-200">
                      {formatSeconds(startTime)} → {formatSeconds(endTime)} ({segmentDuration}s)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={toggleLoopPlayback}
                    disabled={!isPlayerReady}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                      isPlayingLoop
                        ? 'bg-rose-600 text-white shadow-rose-200 animate-pulse'
                        : 'bg-stone-900 hover:bg-stone-800 text-white hover:scale-105'
                    } disabled:opacity-50`}
                  >
                    <Repeat className={`w-3.5 h-3.5 ${isPlayingLoop ? 'animate-spin' : ''}`} />
                    <span>{isPlayingLoop ? 'Arrêter la boucle' : '🔁 Écouter en boucle'}</span>
                  </button>
                </div>

                {/* Scrubber de boucle dragable & Indicateur de position */}
                <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-3 shadow-sm ${
                  isNearEnd && isPlayingLoop
                    ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-200' 
                    : 'bg-white border-stone-200'
                }`}>
                  {/* En-tête de la jauge avec statut en direct */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-stone-800">
                      <Disc className={`w-4 h-4 text-stone-800 ${isPlayingLoop ? 'animate-spin text-rose-600' : ''}`} />
                      <span>Position dans l'extrait :</span>
                      {isPlayingLoop && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 ${
                          isNearEnd 
                            ? 'bg-rose-600 text-white animate-pulse' 
                            : 'bg-stone-900 text-white'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>{isNearEnd ? `Fin dans ${loopRemaining.toFixed(1)}s` : 'En lecture'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-stone-900 font-bold bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                        {formatSeconds(clampedPlayTime)}
                      </span>
                      <span className="text-stone-500 text-[11px]">
                        (+{loopElapsed.toFixed(1)}s / {segmentDuration}s)
                      </span>
                    </div>
                  </div>

                  {/* Barre visuelle de progression avec Aiguille curseur (Bâton) */}
                  <div className="relative pt-2 pb-1">
                    {/* Track de fond */}
                    <div className="relative h-3.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                      {/* Remplissage de progression */}
                      <div
                        className={`absolute top-0 bottom-0 rounded-full transition-all duration-75 ${
                          isNearEnd && isPlayingLoop ? 'bg-rose-500' : 'bg-stone-900'
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, loopProgressPercent))}%` }}
                      />
                    </div>

                    {/* Aiguille / Bâton vertical de position */}
                    <div
                      className={`absolute top-0.5 h-6 w-1 rounded-full shadow-md z-20 pointer-events-none transition-all duration-75 ${
                        isNearEnd && isPlayingLoop ? 'bg-rose-600 ring-2 ring-rose-300' : 'bg-stone-900 ring-2 ring-white'
                      }`}
                      style={{ left: `calc(${Math.max(0, Math.min(100, loopProgressPercent))}% - 2px)` }}
                    />

                    {/* Input invisible pour glisser / cliquer sur la barre */}
                    <input
                      type="range"
                      min={startTime}
                      max={endTime}
                      step="0.1"
                      value={clampedPlayTime}
                      onChange={(e) => handleScrubInLoop(parseFloat(e.target.value), false)}
                      onMouseUp={(e) => handleScrubInLoop(parseFloat((e.target as HTMLInputElement).value), true)}
                      onTouchEnd={(e) => handleScrubInLoop(parseFloat((e.target as HTMLInputElement).value), true)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                      title="Glisser pour reculer ou avancer précisément dans la boucle"
                    />
                  </div>

                  {/* Repères et indicateurs Début / Fin / Reste */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
                    <span className="flex items-center gap-1 font-semibold text-stone-700">
                      <span>▶ Début : {formatSeconds(startTime)}</span>
                    </span>

                    <span className={`font-bold ${isNearEnd && isPlayingLoop ? 'text-rose-600' : 'text-stone-600'}`}>
                      {isNearEnd && isPlayingLoop
                        ? `⚠️ Fin dans ${loopRemaining.toFixed(1)}s (rebouclage imminent)` 
                        : `Reste : ${loopRemaining.toFixed(1)}s (${(100 - loopProgressPercent).toFixed(0)}%)`}
                    </span>

                    <span className="flex items-center gap-1 font-semibold text-stone-700">
                      <span>Fin : {formatSeconds(endTime)} ⏹</span>
                    </span>
                  </div>

                  {/* Boutons d'ajustement rapide */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={jumpToLoopStart}
                        className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold flex items-center gap-1 transition-colors border border-stone-200 shadow-sm"
                        title="Revenir au début de la boucle"
                      >
                        <RotateCcw className="w-3 h-3 text-stone-600" />
                        <span>Début extrait</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => nudgeCurrentPlayTime(-2)}
                        className="px-2 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-mono transition-colors border border-stone-200 shadow-sm"
                        title="Reculer de 2 secondes dans la boucle"
                      >
                        -2s
                      </button>

                      <button
                        type="button"
                        onClick={() => nudgeCurrentPlayTime(2)}
                        className="px-2 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-mono transition-colors border border-stone-200 shadow-sm"
                        title="Avancer de 2 secondes dans la boucle"
                      >
                        +2s
                      </button>
                    </div>

                    <span className="text-[10px] text-stone-500 italic hidden sm:inline">
                      Cliquez ou glissez la barre pour tester n'importe quel moment
                    </span>
                  </div>
                </div>

                {/* Barre Visuelle Globale */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-semibold text-stone-700 flex items-center justify-between">
                    <span>Aperçu sur la musique entière :</span>
                    <span className="font-mono text-stone-500 text-[10px]">00:00 → {formatSeconds(duration)}</span>
                  </div>

                  <div className="relative h-2.5 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 bg-stone-400 rounded-full transition-all"
                      style={{
                        left: `${startPercent}%`,
                        width: `${Math.max(2, endPercent - startPercent)}%`,
                      }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-stone-900 shadow-sm z-10 transition-all duration-75"
                      style={{ left: `${playheadPercentOnGlobal}%` }}
                    />
                  </div>

                  {/* Sliders de Début et Fin */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 bg-white p-3 rounded-2xl border border-stone-200">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-stone-700">Point de DÉBUT :</span>
                        <span className="font-mono text-stone-900 font-bold">{formatSeconds(startTime)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(0, duration - 3)}
                        step="1"
                        value={startTime}
                        onChange={(e) => handleStartChange(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-stone-700">Point de FIN :</span>
                        <span className="font-mono text-stone-900 font-bold">{formatSeconds(endTime)}</span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max={Math.max(3, duration)}
                        step="1"
                        value={endTime}
                        onChange={(e) => handleEndChange(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Ajustements rapides */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => shiftSegment(-5)}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-[10px] font-mono text-stone-700 border border-stone-200"
                      title="Décaler de 5s vers la gauche"
                    >
                      ◀ -5s
                    </button>
                    <button
                      type="button"
                      onClick={() => shiftSegment(5)}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-[10px] font-mono text-stone-700 border border-stone-200"
                      title="Décaler de 5s vers la droite"
                    >
                      +5s ▶
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-stone-500 mr-1">Durée boucle :</span>
                    {[15, 20, 30, 45, 60].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSegmentLength(s)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors ${
                          segmentDuration === s
                            ? 'bg-stone-900 text-white font-bold border-stone-900'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
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
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Titre du morceau *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Time - Inception"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Artiste / Compositeur
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Ex: Hans Zimmer"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Genre / Ambiance Cinéma
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900 cursor-pointer"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 sm:pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={() => {
                if (ytPlayerRef.current) {
                  try { ytPlayerRef.current.pauseVideo(); } catch (e) {}
                }
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title || !youtubeId}
              className="px-5 sm:px-6 py-2.5 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-sm hover:scale-105"
              title={!youtubeId ? "Veuillez associer un lien YouTube pour calibrer et synchroniser le storyboard" : "Ajouter et créer un storyboard"}
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
