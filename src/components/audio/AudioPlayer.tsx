import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Music,
  Repeat,
  Tv
} from 'lucide-react';
import { Track } from '../../lib/types';
import { loadYouTubeAPI } from '../../lib/youtube';
import { YouTubeIcon } from '../icons/YouTubeIcon';

interface AudioPlayerProps {
  track: Track | null;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  highlightRange?: { start: number; end: number };
  autoPlay?: boolean;
  forcePlayAtTime?: number | null;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  track,
  onTimeUpdate,
  onPlayStateChange,
  highlightRange,
  autoPlay = false,
  forcePlayAtTime,
}) => {
  const playerId = useRef(`player-${Math.random().toString(36).substring(2, 9)}`).current;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoopingRange, setIsLoopingRange] = useState<boolean>(false);
  const [showVideo, setShowVideo] = useState<boolean>(false);
  const [isYtReady, setIsYtReady] = useState<boolean>(false);

  const isYouTube = !!track?.youtube_id;

  // Notifier le parent des changements de statut de lecture (synchro storyboard / son)
  useEffect(() => {
    if (onPlayStateChange) {
      onPlayStateChange(isPlaying);
    }
  }, [isPlaying, onPlayStateChange]);

  // Coordination Globale : un seul lecteur audio actif dans toute l'application à la fois
  useEffect(() => {
    const handleOtherAudioPlay = (e: any) => {
      if (e.detail?.id && e.detail.id !== playerId) {
        if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
          try { ytPlayerRef.current.pauseVideo(); } catch (_) {}
        } else if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }
    };

    window.addEventListener('m2m-audio-play', handleOtherAudioPlay);
    return () => window.removeEventListener('m2m-audio-play', handleOtherAudioPlay);
  }, [playerId, isYouTube]);

  const notifyAudioPlay = () => {
    window.dispatchEvent(new CustomEvent('m2m-audio-play', { detail: { id: playerId } }));
  };

  // Déclenchement forcé (ex: lors de l'aperçu Flipbook + Musique)
  useEffect(() => {
    if (forcePlayAtTime !== undefined && forcePlayAtTime !== null) {
      if (forcePlayAtTime >= 0) {
        jumpToTime(forcePlayAtTime);
      } else {
        if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
          ytPlayerRef.current.pauseVideo();
        } else if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }
    }
  }, [forcePlayAtTime]);

  // Initialisation du lecteur YouTube
  useEffect(() => {
    if (!track?.youtube_id) return;
    let isCancelled = false;

    loadYouTubeAPI().then((YT) => {
      if (isCancelled || !ytContainerRef.current) return;

      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
      }

      ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
        videoId: track.youtube_id,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          start: Math.floor(track.default_start_time || 0),
        },
        events: {
          onReady: (event: any) => {
            setIsYtReady(true);
            const totalDur = event.target.getDuration() || track.duration || 0;
            setDuration(totalDur);
            event.target.setVolume(volume * 100);
            if (track.default_start_time) {
              event.target.seekTo(track.default_start_time, true);
              setCurrentTime(track.default_start_time);
            }
            if (autoPlay) {
              event.target.playVideo();
              setIsPlaying(true);
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 1) setIsPlaying(true);
            if (event.data === 2 || event.data === 0) setIsPlaying(false);
          }
        }
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
      setIsPlaying(false);
      setIsYtReady(false);
    };
  }, [track?.id, track?.youtube_id]);

  // Intervalle pour récupérer le timecode YouTube en temps réel
  useEffect(() => {
    if (!isYouTube) return;
    const interval = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        const time = ytPlayerRef.current.getCurrentTime();
        if (typeof time === 'number' && !isNaN(time)) {
          setCurrentTime(time);
          if (onTimeUpdate) onTimeUpdate(time);

          // Gestion du bouclage sur scène
          if (isLoopingRange && highlightRange && highlightRange.end > highlightRange.start) {
            if (time >= highlightRange.end || time < highlightRange.start) {
              ytPlayerRef.current.seekTo(highlightRange.start, true);
            }
          }
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isYouTube, isLoopingRange, highlightRange]);

  // Gestion du volume et mute
  useEffect(() => {
    if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      if (isMuted) {
        ytPlayerRef.current.mute();
      } else {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(volume * 100);
      }
    } else if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, isYouTube]);

  const togglePlay = () => {
    if (isYouTube && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        notifyAudioPlay();
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
      return;
    }

    if (!audioRef.current || !track) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      notifyAudioPlay();
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(newTime, false);
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    if (onTimeUpdate) onTimeUpdate(newTime);
  };

  const handleSeekCommit = (newTime: number) => {
    if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(newTime, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const jumpToTime = (time: number) => {
    setCurrentTime(time);
    notifyAudioPlay();
    if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(time, true);
      if (!isPlaying) ytPlayerRef.current.playVideo();
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
      if (!isPlaying) audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!track) {
    return (
      <div className="flex items-center justify-center p-4 bg-white rounded-2xl border border-stone-200 text-stone-500 text-xs shadow-gallery">
        <Music className="w-4 h-4 mr-2 text-stone-700" />
        Sélectionnez une bande originale pour commencer l'écoute
      </div>
    );
  }

  const rangeStartPercent = highlightRange && duration > 0 ? (highlightRange.start / duration) * 100 : 0;
  const rangeEndPercent = highlightRange && duration > 0 ? (highlightRange.end / duration) * 100 : 0;
  const rangeWidthPercent = highlightRange && duration > 0 ? Math.max(0, rangeEndPercent - rangeStartPercent) : 0;

  const playheadPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const isInLoop = highlightRange ? (currentTime >= highlightRange.start && currentTime <= highlightRange.end) : false;
  const loopDuration = highlightRange ? Math.max(1, highlightRange.end - highlightRange.start) : 0;
  const loopElapsed = highlightRange && isInLoop ? Math.max(0, currentTime - highlightRange.start) : 0;
  const loopProgressPercent = highlightRange && loopDuration > 0 ? Math.min(100, Math.max(0, (loopElapsed / loopDuration) * 100)) : 0;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-gallery text-stone-800 transition-colors">
      {/* Lecteur HTML5 Standard si ce n'est pas YouTube */}
      {!isYouTube && (
        <audio
          ref={audioRef}
          src={track.audio_url}
          onTimeUpdate={() => {
            if (audioRef.current) {
              const t = audioRef.current.currentTime;
              setCurrentTime(t);
              if (onTimeUpdate) onTimeUpdate(t);
              if (isLoopingRange && highlightRange && (t >= highlightRange.end || t < highlightRange.start)) {
                audioRef.current.currentTime = highlightRange.start;
              }
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration || track.duration || 0);
            }
          }}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Conteneur YouTube IFrame (affiché ou masqué) */}
      {isYouTube && (
        <div className={`overflow-hidden rounded-xl border border-stone-200 mb-4 transition-all ${
          showVideo ? 'aspect-video w-full max-h-64 mx-auto' : 'hidden'
        }`}>
          <div ref={ytContainerRef} className="w-full h-full" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Infos du Morceau */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {track.thumbnail_url ? (
            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-stone-200 shrink-0 shadow-sm group">
              <img
                src={track.thumbnail_url}
                alt={track.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <YouTubeIcon className="w-4 h-4 text-red-500 fill-current" />
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 shrink-0">
              <Music className="w-6 h-6" />
            </div>
          )}

          <div className="min-w-0">
            <h4 className="text-sm font-bold text-stone-900 truncate">{track.title}</h4>
            <p className="text-xs text-stone-500 truncate flex items-center gap-1.5">
              <span>{track.artist}</span>
              {isYouTube && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                  <YouTubeIcon className="w-3 h-3" /> YouTube
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Contrôles de lecture centraux */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => jumpToTime(track.default_start_time || 0)}
            className="p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-900 transition-colors"
            title="Revenir au point de départ du morceau"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-stone-900 hover:bg-stone-800 text-white font-bold flex items-center justify-center transition-transform hover:scale-105 shadow-md"
            title={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {highlightRange && (
            <button
              type="button"
              onClick={() => setIsLoopingRange(!isLoopingRange)}
              className={`p-2 rounded-full transition-colors ${
                isLoopingRange
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'hover:bg-stone-100 text-stone-400 hover:text-stone-900'
              }`}
              title="Boucler sur l'intervalle de la scène"
            >
              <Repeat className="w-4 h-4" />
            </button>
          )}

          {isYouTube && (
            <button
              type="button"
              onClick={() => setShowVideo(!showVideo)}
              className={`p-2 rounded-full transition-colors ${
                showVideo
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'hover:bg-stone-100 text-stone-400 hover:text-stone-900'
              }`}
              title={showVideo ? 'Masquer la vidéo' : 'Afficher la vidéo YouTube'}
            >
              <Tv className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Volume & Timecode */}
        <div className="flex items-center gap-3 text-xs font-mono text-stone-600 w-full sm:w-auto justify-end">
          <span className="text-stone-900 font-bold">{formatTime(currentTime)}</span>
          <span className="text-stone-300">/</span>
          <span className="text-stone-400">{formatTime(duration)}</span>

          <div className="flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 text-stone-400 hover:text-stone-900"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-16 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
            />
          </div>
        </div>
      </div>

      {/* Barre de timeline interactive avec marqueur d'intervalle et aiguille curseur (bâton) */}
      <div className="relative mt-3 pt-2">
        {/* Intervalle de boucle de la scène */}
        {highlightRange && duration > 0 && rangeWidthPercent > 0 && (
          <div
            className="absolute top-2 h-2.5 bg-rose-100 border-x-2 border-rose-600 rounded z-0 pointer-events-none overflow-hidden"
            style={{
              left: `${Math.max(0, rangeStartPercent)}%`,
              width: `${Math.min(100 - rangeStartPercent, rangeWidthPercent)}%`
            }}
          >
            {/* Progression interne dans la boucle */}
            {isInLoop && (
              <div
                className="h-full bg-rose-300/80 transition-all"
                style={{ width: `${loopProgressPercent}%` }}
              />
            )}
          </div>
        )}

        {/* Repère vertical début de boucle */}
        {highlightRange && duration > 0 && (
          <div
            className="absolute top-0.5 h-5 w-0.5 bg-rose-600 z-10 pointer-events-none"
            style={{ left: `${rangeStartPercent}%` }}
            title={`Début de boucle : ${formatTime(highlightRange.start)}`}
          />
        )}

        {/* Repère vertical fin de boucle */}
        {highlightRange && duration > 0 && (
          <div
            className="absolute top-0.5 h-5 w-0.5 bg-rose-600 z-10 pointer-events-none"
            style={{ left: `${rangeEndPercent}%` }}
            title={`Fin de boucle : ${formatTime(highlightRange.end)}`}
          />
        )}

        {/* 📍 Aiguille / Bâton de position de lecture (Playhead Needle) */}
        {duration > 0 && (
          <div
            className={`absolute top-0 h-6 w-1 rounded-full shadow-md z-20 pointer-events-none transition-all ${
              isInLoop ? 'bg-rose-600 ring-2 ring-rose-300' : 'bg-stone-900 ring-2 ring-white'
            }`}
            style={{ left: `calc(${playheadPercent}% - 2px)` }}
          />
        )}

        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          onMouseUp={(e) => handleSeekCommit(parseFloat((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => handleSeekCommit(parseFloat((e.target as HTMLInputElement).value))}
          className="relative z-10 w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-900 hover:accent-stone-700"
        />

        {/* Statut précis de placement dans la boucle */}
        {highlightRange && duration > 0 && (
          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-stone-100 text-[10px] sm:text-[11px] font-mono text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>Boucle Scène : <strong>{formatTime(highlightRange.start)}</strong> ➔ <strong>{formatTime(highlightRange.end)}</strong> ({Math.round(loopDuration)}s)</span>
            </span>

            <span className={isInLoop ? 'text-rose-600 font-bold' : 'text-stone-400'}>
              {isInLoop 
                ? `Dans la boucle : ${formatTime(loopElapsed)} / ${formatTime(loopDuration)} (${Math.round(loopProgressPercent)}%)` 
                : `Position : ${formatTime(currentTime)} (hors boucle)`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
