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
  highlightRange?: { start: number; end: number };
  autoPlay?: boolean;
  forcePlayAtTime?: number | null;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  track,
  onTimeUpdate,
  highlightRange,
  autoPlay = false,
  forcePlayAtTime,
}) => {
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
            // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
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
      <div className="flex items-center justify-center p-4 bg-cinema-850 rounded-xl border border-cinema-700/50 text-slate-400 text-sm">
        <Music className="w-4 h-4 mr-2 text-brand-400 animate-pulse" />
        Sélectionnez une musique pour commencer
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const rangeStartPercent = highlightRange && duration > 0 ? (highlightRange.start / duration) * 100 : 0;
  const rangeWidthPercent = highlightRange && duration > 0 ? ((highlightRange.end - highlightRange.start) / duration) * 100 : 0;

  return (
    <div className="bg-gradient-to-r from-cinema-850 via-cinema-800 to-cinema-850 rounded-2xl border border-cinema-700/80 p-4 shadow-xl text-slate-200">
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
        <div className={`overflow-hidden rounded-xl border border-cinema-700/60 mb-4 transition-all ${
          showVideo ? 'aspect-video w-full max-h-64 mx-auto' : 'hidden'
        }`}>
          <div ref={ytContainerRef} className="w-full h-full" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Infos du Morceau */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {track.thumbnail_url ? (
            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-cinema-700 shrink-0 shadow-inner group">
              <img
                src={track.thumbnail_url}
                alt={track.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <YouTubeIcon className="w-4 h-4 text-red-500 fill-current" />
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0 shadow-inner">
              <Music className="w-6 h-6" />
            </div>
          )}

          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{track.title}</h4>
            <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
              <span>{track.artist}</span>
              {isYouTube && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
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
            className="p-2 rounded-full hover:bg-cinema-700 text-slate-400 hover:text-white transition-colors"
            title="Revenir au point de départ du morceau"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-brand-500 hover:bg-brand-400 text-cinema-900 font-bold flex items-center justify-center transition-transform hover:scale-105 shadow-md shadow-brand-500/20"
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
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                  : 'hover:bg-cinema-700 text-slate-400 hover:text-white'
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
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'hover:bg-cinema-700 text-slate-400 hover:text-white'
              }`}
              title={showVideo ? 'Masquer la vidéo' : 'Afficher la vidéo YouTube'}
            >
              <Tv className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Volume & Timecode */}
        <div className="flex items-center gap-3 text-xs font-mono text-slate-300 w-full sm:w-auto justify-end">
          <span className="text-brand-300 font-semibold">{formatTime(currentTime)}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{formatTime(duration)}</span>

          <div className="flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 text-slate-400 hover:text-white"
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
              className="w-16 h-1.5 bg-cinema-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Barre de timeline interactive avec marqueur d'intervalle */}
      <div className="relative mt-3 pt-2">
        {highlightRange && duration > 0 && rangeWidthPercent > 0 && (
          <div
            className="absolute top-2 h-2.5 bg-brand-500/30 border-x border-brand-400/80 rounded z-0 pointer-events-none"
            style={{
              left: `${Math.max(0, rangeStartPercent)}%`,
              width: `${Math.min(100 - rangeStartPercent, rangeWidthPercent)}%`
            }}
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
          className="relative z-10 w-full h-2 bg-cinema-700/80 rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-400"
        />
      </div>
    </div>
  );
};
