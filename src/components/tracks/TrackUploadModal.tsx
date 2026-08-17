import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Music, 
  Play, 
  Pause, 
  Clock, 
  Loader2, 
  FastForward, 
  Rewind, 
  Clapperboard,
  Volume2
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
  const [duration, setDuration] = useState(240); // 4 minutes par défaut
  const [defaultStartTime, setDefaultStartTime] = useState<number>(30);
  
  // État de pré-écoute audio YouTube
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);

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

  // Initialisation du lecteur YouTube invisible pour l'écoute en direct
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
            const videoDuration = event.target.getDuration();
            if (videoDuration && videoDuration > 0) {
              setDuration(Math.floor(videoDuration));
            }
          },
          onStateChange: (event: any) => {
            if (isCancelled) return;
            if (event.data === YT.PlayerState.PLAYING) {
              setIsPlayingPreview(true);
            } else if (
              event.data === YT.PlayerState.PAUSED ||
              event.data === YT.PlayerState.ENDED
            ) {
              setIsPlayingPreview(false);
            }
          },
        },
      });
    });

    return () => {
      isCancelled = true;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
      }
      setIsPlayingPreview(false);
      setIsPlayerReady(false);
    };
  }, [youtubeId, isOpen]);

  // Écouter / Prévisualiser le son à ce moment précis
  const togglePlayPreview = () => {
    if (!ytPlayerRef.current || !isPlayerReady) return;

    if (isPlayingPreview) {
      ytPlayerRef.current.pauseVideo();
      setIsPlayingPreview(false);
    } else {
      ytPlayerRef.current.seekTo(defaultStartTime, true);
      ytPlayerRef.current.playVideo();
      setIsPlayingPreview(true);
    }
  };

  const handleSliderChange = (newTime: number) => {
    setDefaultStartTime(newTime);
    if (ytPlayerRef.current && isPlayerReady && isPlayingPreview) {
      ytPlayerRef.current.seekTo(newTime, true);
    }
  };

  const handleSliderCommit = (newTime: number) => {
    if (ytPlayerRef.current && isPlayerReady) {
      ytPlayerRef.current.seekTo(newTime, true);
      if (!isPlayingPreview) {
        ytPlayerRef.current.playVideo();
        setIsPlayingPreview(true);
      }
    }
  };

  const adjustStartTime = (delta: number) => {
    const nextTime = Math.max(0, Math.min(duration, defaultStartTime + delta));
    setDefaultStartTime(nextTime);
    if (ytPlayerRef.current && isPlayerReady) {
      ytPlayerRef.current.seekTo(nextTime, true);
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
        duration: duration || 240,
        default_start_time: defaultStartTime,
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
              <p className="text-[10px] sm:text-[11px] text-slate-400">Zéro stockage • Métadonnées et pré-écoute synchronisée</p>
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

          {/* Aperçu YouTube & Réglage du point fort par SLIDER avec PRÉ-ÉCOUTE EN DIRECT */}
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
                  <span className="inline-block px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                    ✓ Détecté
                  </span>
                  <h4 className="text-xs font-semibold text-white truncate">{title || 'Chargement...'}</h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{artist}</p>
                </div>
              </div>

              {/* 🎚️ Sélecteur du Point de départ avec SLIDER & BOUTON D'ÉCOUTE */}
              <div className="pt-3 border-t border-cinema-700/60 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-brand-400" />
                    <span className="text-xs font-bold text-brand-300">
                      Point fort (Début de scène) :
                    </span>
                    <span className="font-mono text-sm font-bold text-brand-400 bg-cinema-800 px-2 py-0.5 rounded-lg border border-cinema-700 shadow-inner">
                      {formatSeconds(defaultStartTime)}
                    </span>
                  </div>

                  {/* Bouton Écouter / Pause en direct à ce moment */}
                  <button
                    type="button"
                    onClick={togglePlayPreview}
                    disabled={!isPlayerReady}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                      isPlayingPreview
                        ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse'
                        : 'bg-brand-500 hover:bg-brand-400 text-cinema-950 shadow-brand-500/20 hover:scale-105'
                    } disabled:opacity-50`}
                  >
                    {isPlayingPreview ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Écouter à {formatSeconds(defaultStartTime)}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Slider interactif */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="1"
                    value={defaultStartTime}
                    onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
                    onMouseUp={(e) => handleSliderCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                    onTouchEnd={(e) => handleSliderCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                    className="w-full h-2 bg-cinema-700 rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>00:00 (Début)</span>
                    <span>{formatSeconds(Math.floor(duration / 2))}</span>
                    <span>{formatSeconds(duration)}</span>
                  </div>
                </div>

                {/* Boutons d'ajustement rapide */}
                <div className="flex items-center justify-between gap-1 pt-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => adjustStartTime(-10)}
                    className="px-2 py-1 rounded bg-cinema-800 hover:bg-cinema-700 text-[10px] font-mono text-slate-300 border border-cinema-700"
                  >
                    -10s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDefaultStartTime(30);
                      handleSliderCommit(30);
                    }}
                    className="px-2 py-1 rounded bg-cinema-800 hover:bg-cinema-700 text-[10px] font-mono text-slate-300 border border-cinema-700"
                  >
                    00:30
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDefaultStartTime(60);
                      handleSliderCommit(60);
                    }}
                    className="px-2 py-1 rounded bg-cinema-800 hover:bg-cinema-700 text-[10px] font-mono text-slate-300 border border-cinema-700"
                  >
                    01:00
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDefaultStartTime(90);
                      handleSliderCommit(90);
                    }}
                    className="px-2 py-1 rounded bg-cinema-800 hover:bg-cinema-700 text-[10px] font-mono text-slate-300 border border-cinema-700"
                  >
                    01:30
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustStartTime(10)}
                    className="px-2 py-1 rounded bg-cinema-800 hover:bg-cinema-700 text-[10px] font-mono text-slate-300 border border-cinema-700"
                  >
                    +10s
                  </button>
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
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
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
                className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
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
              className="w-full bg-cinema-900 border border-cinema-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
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
              className="px-5 sm:px-6 py-2.5 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-400 text-cinema-950 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md hover:scale-105"
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
