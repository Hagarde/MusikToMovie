import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Music,
  Repeat
} from 'lucide-react';
import { Track } from '../../lib/types';

interface AudioPlayerProps {
  track: Track | null;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
  highlightRange?: { start: number; end: number };
  autoPlay?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  track,
  onTimeUpdate,
  highlightRange,
  autoPlay = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoopingRange, setIsLoopingRange] = useState<boolean>(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (track && audioRef.current) {
      const initialTime = track.default_start_time || 0;
      audioRef.current.currentTime = initialTime;
      setCurrentTime(initialTime);
      if (autoPlay) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        setIsPlaying(false);
      }
    }
  }, [track?.id]);

  const togglePlay = () => {
    if (!audioRef.current || !track) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    if (onTimeUpdate) onTimeUpdate(time);

    // Boucle de scène si activée
    if (isLoopingRange && highlightRange && highlightRange.end > highlightRange.start) {
      if (time >= highlightRange.end || time < highlightRange.start) {
        audioRef.current.currentTime = highlightRange.start;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || track?.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    if (onTimeUpdate) onTimeUpdate(newTime);
  };

  const jumpToTime = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
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
    <div className="bg-gradient-to-r from-cinema-850 to-cinema-800 rounded-2xl border border-cinema-700/80 p-4 shadow-xl text-slate-200">
      <audio
        ref={audioRef}
        src={track.audio_url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Infos du Morceau */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0 shadow-inner">
            <Music className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{track.title}</h4>
            <p className="text-xs text-slate-400 truncate">{track.artist}</p>
          </div>
        </div>

        {/* Contrôles de lecture centraux */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => jumpToTime(0)}
            className="p-2 rounded-full hover:bg-cinema-700 text-slate-400 hover:text-white transition-colors"
            title="Revenir au début"
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
        {/* Zone de surbrillance d'intervalle de scène */}
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
          className="relative z-10 w-full h-2 bg-cinema-700/80 rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-400"
        />
      </div>
    </div>
  );
};
