import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Sliders, 
  Upload, 
  Check, 
  Film, 
  Volume2, 
  VolumeX, 
  Save, 
  Radio, 
  Plus, 
  Trash2, 
  Scissors, 
  Headphones, 
  Layers, 
  Music2, 
  Clock,
  Download
} from 'lucide-react';
import { MovieToMusikProject, AudioTrack, EQSettings, GENRES } from '../../lib/types';
import { MicrophoneRecorder, MultiTrackAudioEngine, blobToBase64, extractWaveformData, exportMixToWav } from '../../lib/audioEngine';
import { createMovieToMusikProject } from '../../lib/supabase';

interface MovieToMusikStudioProps {
  onBack: () => void;
  onProjectSaved: (newProject: MovieToMusikProject) => void;
}

const PRESET_VISUALS = [
  {
    title: 'Nuit Cyberpunk & Néons',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80',
    description: 'Ambiance futuriste, pluie et reflets de néons dans la mégapole.',
  },
  {
    title: 'Exploration Cosmique',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    description: 'Vaisseau en orbite, nébuleuses et silence sidéral.',
  },
  {
    title: 'Duel au Crépuscule',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
    description: 'Désert aride, tension dramatique et ombres allongées.',
  },
  {
    title: 'Forêt Mystique & Brume',
    type: 'image' as const,
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
    description: 'Atmosphère envoûtante, suspense et bruissements sous les arbres.',
  },
];

// Composant individuel pour afficher la forme d'onde et les poignées de rognage style Audacity
interface WaveformTrackProps {
  track: AudioTrack;
  maxTimelineDuration: number;
  playheadTime: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateTrim: (trimStart: number, trimEnd: number) => void;
  onUpdateOffset: (newOffset: number) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  index: number;
}

const WaveformTrackRow: React.FC<WaveformTrackProps> = ({
  track,
  maxTimelineDuration,
  playheadTime,
  isSelected,
  onSelect,
  onUpdateTrim,
  onUpdateOffset,
  onToggleMute,
  onToggleSolo,
  onDelete,
  onRename,
  index,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);

  const duration = Math.max(track.duration, 0.1);
  const trackWidthPercent = Math.min(100, (duration / Math.max(maxTimelineDuration, 1)) * 100);
  const startOffset = track.start_offset || 0;
  const offsetPercent = (startOffset / Math.max(maxTimelineDuration, 1)) * 100;
  const trimStartPercent = (track.trim_start / duration) * 100;
  const trimEndPercent = (track.trim_end / duration) * 100;

  // Gestion du glissement des poignées de rognage
  const handlePointerDown = (handle: 'start' | 'end', e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingHandle(handle);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingHandle || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = ratio * duration;

    if (draggingHandle === 'start') {
      const newStart = Math.min(targetSeconds, track.trim_end - 0.05);
      onUpdateTrim(Math.max(0, newStart), track.trim_end);
    } else {
      const newEnd = Math.max(targetSeconds, track.trim_start + 0.05);
      onUpdateTrim(track.trim_start, Math.min(duration, newEnd));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingHandle) {
      setDraggingHandle(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  // Forme d'onde par défaut si non encore calculée
  const waveform = track.waveform && track.waveform.length > 0
    ? track.waveform
    : Array.from({ length: 60 }, (_, i) => 0.2 + 0.5 * Math.sin(i * 0.3) * Math.sin(i * 0.3));

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl border-2 transition-all p-3 space-y-2 cursor-pointer ${
        isSelected
          ? 'border-rose-500 bg-rose-50/20 shadow-md ring-1 ring-rose-300'
          : 'border-stone-200 bg-white hover:border-stone-300 shadow-sm'
      }`}
    >
      {/* En-tête de la piste : Titre, durée effective et boutons DAW */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
            {index + 1}
          </span>
          <input
            type="text"
            value={track.name}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onRename(e.target.value)}
            className="text-xs font-bold text-stone-900 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-stone-900 focus:outline-none truncate"
          />
          <span className="text-[10px] font-mono text-stone-500 shrink-0">
            Actif : <strong className="text-rose-600">{(track.trim_end - track.trim_start).toFixed(2)}s</strong> / {track.duration.toFixed(2)}s
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Mute */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
              track.is_muted
                ? 'bg-rose-600 text-white'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
            title={track.is_muted ? 'Piste coupée (Mute)' : 'Couper le son (Mute)'}
          >
            {track.is_muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Solo */}
          <button
            type="button"
            onClick={onToggleSolo}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
              track.is_solo
                ? 'bg-amber-500 text-white font-extrabold'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
            title="Isoler la piste (Solo)"
          >
            <Headphones className="w-3.5 h-3.5 inline mr-0.5" />
            SOLO
          </button>

          {/* Supprimer */}
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-100 text-stone-400 hover:text-rose-600 transition-colors"
            title="Supprimer la piste"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ZONE FORME D'ONDE & POIGNÉES DE ROGNAGE (AUDACITY STYLE) */}
      <div 
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative h-16 sm:h-20 bg-stone-950 rounded-xl overflow-hidden select-none border border-stone-800 transition-all"
        style={{ width: `${trackWidthPercent}%`, marginLeft: `${offsetPercent}%` }}
      >
        {/* Forme d'onde SVG / Bâtons d'amplitude */}
        <div className="absolute inset-0 flex items-center justify-between px-1 gap-[2px]">
          {waveform.map((val, i) => {
            const barPosPercent = (i / waveform.length) * 100;
            const isInsideTrim = barPosPercent >= trimStartPercent && barPosPercent <= trimEndPercent;

            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-center h-full"
              >
                <div
                  className={`w-full rounded-full transition-all ${
                    track.is_muted
                      ? 'bg-stone-700 opacity-40'
                      : isInsideTrim
                      ? 'bg-gradient-to-t from-rose-500 to-rose-300 shadow-sm shadow-rose-500/50'
                      : 'bg-stone-800 opacity-30'
                  }`}
                  style={{ height: `${Math.max(8, val * 85)}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Zone Grisée Début (Coupe Clic) */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-black/75 backdrop-blur-[1px] border-r border-rose-500/60 flex items-center justify-center overflow-hidden"
          style={{ width: `${trimStartPercent}%` }}
        >
          {trimStartPercent > 8 && (
            <span className="text-[9px] font-mono text-stone-400 flex items-center gap-0.5 truncate px-1">
              <Scissors className="w-2.5 h-2.5 text-rose-500" />
              <span>{track.trim_start.toFixed(2)}s</span>
            </span>
          )}
        </div>

        {/* Zone Grisée Fin */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-black/75 backdrop-blur-[1px] border-l border-rose-500/60 flex items-center justify-center overflow-hidden"
          style={{ width: `${100 - trimEndPercent}%` }}
        >
          {100 - trimEndPercent > 8 && (
            <span className="text-[9px] font-mono text-stone-400 flex items-center gap-0.5 truncate px-1">
              <Scissors className="w-2.5 h-2.5 text-rose-500" />
              <span>{(duration - track.trim_end).toFixed(2)}s</span>
            </span>
          )}
        </div>

        {/* Poignée de Rognage DÉBUT (Trim Start) */}
        <div
          onPointerDown={(e) => handlePointerDown('start', e)}
          className="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize flex items-center justify-center z-20 group"
          style={{ left: `${trimStartPercent}%` }}
          title={`Début : ${track.trim_start.toFixed(2)}s (Glisser pour couper le clic)`}
        >
          <div className="w-1.5 h-full bg-rose-500 group-hover:bg-rose-400 group-hover:w-2 rounded-full shadow-lg shadow-rose-500/50 flex items-center justify-center">
            <span className="w-0.5 h-4 bg-white rounded-full" />
          </div>
        </div>

        {/* Poignée de Rognage FIN (Trim End) */}
        <div
          onPointerDown={(e) => handlePointerDown('end', e)}
          className="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize flex items-center justify-center z-20 group"
          style={{ left: `${trimEndPercent}%` }}
          title={`Fin : ${track.trim_end.toFixed(2)}s (Glisser pour raccourcir)`}
        >
          <div className="w-1.5 h-full bg-rose-500 group-hover:bg-rose-400 group-hover:w-2 rounded-full shadow-lg shadow-rose-500/50 flex items-center justify-center">
            <span className="w-0.5 h-4 bg-white rounded-full" />
          </div>
        </div>

        {/* Repère Tête de Lecture sur cette piste */}
        {playheadTime >= 0 && playheadTime <= duration && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md shadow-white/80 z-30 pointer-events-none"
            style={{ left: `${(playheadTime / duration) * 100}%` }}
          />
        )}
      </div>

      {/* Curseurs numériques de haute précision (au centième de seconde) */}
      <div className="flex items-center justify-between gap-4 text-[10px] font-mono text-stone-500 pt-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <span className="text-stone-700 font-bold flex items-center gap-1">
            <Scissors className="w-3 h-3 text-rose-600" />
            Début :
          </span>
          <input
            type="number"
            min="0"
            max={Math.min(track.duration - 0.05, 5)}
            step="0.01"
            value={track.trim_start.toFixed(2)}
            onChange={(e) => onUpdateTrim(parseFloat(e.target.value) || 0, track.trim_end)}
            className="w-14 bg-stone-100 border border-stone-200 rounded px-1 py-0.5 text-center font-bold text-stone-900 focus:outline-none focus:border-stone-900"
          />
          <span>s (Anti-clic)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-stone-700 font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-600" />
            Décalage :
          </span>
          <input
            type="number"
            min="0"
            max={Math.max(0, maxTimelineDuration - 0.2)}
            step="0.1"
            value={(track.start_offset || 0).toFixed(2)}
            onChange={(e) => onUpdateOffset(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-14 bg-stone-100 border border-stone-200 rounded px-1 py-0.5 text-center font-bold text-stone-900 focus:outline-none focus:border-stone-900"
          />
          <span>s (Slip)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-stone-700 font-bold flex items-center gap-1">
            <Scissors className="w-3 h-3 text-rose-600" />
            Fin :
          </span>
          <input
            type="number"
            min={track.trim_start + 0.05}
            max={track.duration}
            step="0.01"
            value={track.trim_end.toFixed(2)}
            onChange={(e) => onUpdateTrim(track.trim_start, parseFloat(e.target.value) || track.duration)}
            className="w-14 bg-stone-100 border border-stone-200 rounded px-1 py-0.5 text-center font-bold text-stone-900 focus:outline-none focus:border-stone-900"
          />
          <span>s</span>
        </div>
      </div>
    </div>
  );
};

export const MovieToMusikStudio: React.FC<MovieToMusikStudioProps> = ({
  onBack,
  onProjectSaved,
}) => {
  // Visuel
  const [visualType, setVisualType] = useState<'video' | 'gif' | 'image'>('image');
  const [visualUrl, setVisualUrl] = useState<string>(PRESET_VISUALS[0].url);
  const [visualTitle, setVisualTitle] = useState<string>(PRESET_VISUALS[0].title);

  // Multi-Pistes Audio
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);

  // Enregistrement Micro (Overdub)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [hasCountdown, setHasCountdown] = useState<boolean>(true);
  const [micLatencyMs, setMicLatencyMs] = useState<number>(0);
  const [isExportingWav, setIsExportingWav] = useState<boolean>(false);
  const [customTimelineDuration, setCustomTimelineDuration] = useState<number | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (tracks.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tracks]);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Lecture Globale Master & Playhead Cursor
  const [isPlayingMaster, setIsPlayingMaster] = useState<boolean>(false);
  const [playheadTime, setPlayheadTime] = useState<number>(0);

  // Métadonnées du projet
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [creatorName, setCreatorName] = useState<string>('');
  const [genre, setGenre] = useState<string>(GENRES[0]);
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const recorderRef = useRef<MicrophoneRecorder | null>(null);
  const engineRef = useRef<MultiTrackAudioEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const playheadIntervalRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialisation du moteur multi-pistes
  useEffect(() => {
    recorderRef.current = new MicrophoneRecorder();
    engineRef.current = new MultiTrackAudioEngine();

    return () => {
      if (recorderRef.current) recorderRef.current.stop();
      if (engineRef.current) engineRef.current.dispose();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (playheadIntervalRef.current) clearInterval(playheadIntervalRef.current);
    };
  }, []);

  // Recharger les pistes dans le moteur quand la liste change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.loadTracks(tracks);
      if (isPlayingMaster) {
        engineRef.current.play();
      }
    }
  }, [tracks.length]);

  // Suivi de la tête de lecture (Playhead)
  useEffect(() => {
    if (isPlayingMaster) {
      playheadIntervalRef.current = setInterval(() => {
        if (engineRef.current) {
          const t = engineRef.current.getCurrentPlayheadTime();
          setPlayheadTime(t);
        }
      }, 50);
    } else {
      if (playheadIntervalRef.current) {
        clearInterval(playheadIntervalRef.current);
      }
    }
    return () => {
      if (playheadIntervalRef.current) clearInterval(playheadIntervalRef.current);
    };
  }, [isPlayingMaster]);

  // Gestion de l'upload de fichier visuel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type.startsWith('video/')
      ? 'video'
      : file.type.includes('gif')
      ? 'gif'
      : 'image';

    if (fileType === 'video') {
      const tempVideo = document.createElement('video');
      tempVideo.src = URL.createObjectURL(file);
      tempVideo.onloadedmetadata = () => {
        if (tempVideo.duration && !isNaN(tempVideo.duration)) {
          setCustomTimelineDuration(Math.max(10, Math.ceil(tempVideo.duration)));
        }
        URL.revokeObjectURL(tempVideo.src);
      };
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setVisualType(fileType);
        setVisualUrl(event.target.result as string);
        setVisualTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  // Démarrer l'enregistrement (Overdub : joue les pistes existantes en fond)
  const startRecordingFlow = () => {
    if (isPlayingMaster && engineRef.current) {
      engineRef.current.pause();
      setIsPlayingMaster(false);
    }

    if (!hasCountdown) {
      executeStartRecording();
      return;
    }

    setCountdown(3);
    const countInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countInterval);
          executeStartRecording();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const executeStartRecording = async () => {
    if (!recorderRef.current) return;
    setRecordingSeconds(0);
    setIsRecording(true);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }

    if (engineRef.current && tracks.length > 0) {
      engineRef.current.restartAll();
      engineRef.current.play();
    }

    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    await recorderRef.current.start((dataArray) => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgb(${Math.min(255, 200 + barHeight)}, 50, 80)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    });
  };

  // Arrêter l'enregistrement, calculer la Waveform et créer la nouvelle piste
  const stopRecording = async () => {
    if (!recorderRef.current) return;
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (videoRef.current) {
      videoRef.current.pause();
    }

    if (engineRef.current) {
      engineRef.current.pause();
    }

    const { blob } = await recorderRef.current.stop();
    const base64 = await blobToBase64(blob);
    const duration = Math.max(1, recordingSeconds);

    // 🌊 Extraction réelle de la forme d'onde DSP
    const waveform = await extractWaveformData(blob, 100);

    const newTrackIndex = tracks.length + 1;
    const initialOffset = Math.max(0, micLatencyMs / 1000);
    const newTrack: AudioTrack = {
      id: crypto.randomUUID(),
      name: `Piste ${newTrackIndex} (${newTrackIndex === 1 ? 'Rythme / Voix' : 'Superposition'})`,
      audio_data: base64,
      duration,
      trim_start: 0.08, // Coupe du clic initial automatique par défaut
      trim_end: duration,
      start_offset: initialOffset,
      is_muted: false,
      is_solo: false,
      waveform,
      eq_settings: {
        bass: 0,
        mid: 0,
        treble: 0,
        volume: 1.0,
      },
    };

    const nextTracks = [...tracks, newTrack];
    setTracks(nextTracks);
    setActiveTrackId(newTrack.id);

    if (engineRef.current) {
      engineRef.current.loadTracks(nextTracks);
    }
  };

  // 📂 Importer un fichier audio externe sur une piste
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await blobToBase64(file);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration;
      try { await audioCtx.close(); } catch (_) {}

      const waveform = await extractWaveformData(file, 100);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const newTrackIndex = tracks.length + 1;
      const newTrack: AudioTrack = {
        id: crypto.randomUUID(),
        name: cleanName || `Son importé ${newTrackIndex}`,
        audio_data: base64,
        duration,
        trim_start: 0,
        trim_end: duration,
        start_offset: 0,
        is_muted: false,
        is_solo: false,
        waveform,
        eq_settings: {
          bass: 0,
          mid: 0,
          treble: 0,
          volume: 1.0,
        },
      };

      const nextTracks = [...tracks, newTrack];
      setTracks(nextTracks);
      setActiveTrackId(newTrack.id);
      if (engineRef.current) {
        engineRef.current.loadTracks(nextTracks);
      }
    } catch (err) {
      console.error("Erreur import audio:", err);
    }
  };

  // 📥 Télécharger le Mix final au format WAV
  const handleExportMixWav = async () => {
    if (tracks.length === 0) return;
    setIsExportingWav(true);
    try {
      const wavBlob = await exportMixToWav(tracks, maxTimelineDuration);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectTitle || 'Mix_MovieToMusik'}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur export mix:", err);
    } finally {
      setIsExportingWav(false);
    }
  };

  // ↔️ Décaler horizontalement une piste (Slip)
  const handleUpdateOffset = (trackId: string, newOffset: number) => {
    const updated = tracks.map((t) => {
      if (t.id === trackId) {
        return { ...t, start_offset: Math.max(0, newOffset) };
      }
      return t;
    });
    setTracks(updated);
    if (engineRef.current) {
      engineRef.current.loadTracks(updated);
    }
  };

  // ✂️ Ajuster le rognage Début (Anti-clic) ou Fin
  const handleUpdateTrim = (trackId: string, trimStart: number, trimEnd: number) => {
    const updated = tracks.map((t) => {
      if (t.id === trackId) {
        const safeStart = Math.max(0, Math.min(trimStart, t.duration - 0.05));
        const safeEnd = Math.max(safeStart + 0.05, Math.min(trimEnd, t.duration));
        return { ...t, trim_start: safeStart, trim_end: safeEnd };
      }
      return t;
    });
    setTracks(updated);
    if (engineRef.current) {
      engineRef.current.loadTracks(updated);
    }
  };

  // 🎛️ Modifier l'égalisation EQ / Volume d'une piste
  const handleUpdateTrackEQ = (trackId: string, eqKey: keyof EQSettings, value: number) => {
    const updated = tracks.map((t) => {
      if (t.id === trackId) {
        const newEQ = { ...t.eq_settings, [eqKey]: value };
        return { ...t, eq_settings: newEQ };
      }
      return t;
    });
    setTracks(updated);
    if (engineRef.current) {
      const target = updated.find((t) => t.id === trackId);
      if (target) engineRef.current.updateTrackEQ(trackId, target.eq_settings);
    }
  };

  // 🔇 Basculer le Mute d'une piste
  const handleToggleMute = (trackId: string) => {
    const updated = tracks.map((t) => (t.id === trackId ? { ...t, is_muted: !t.is_muted } : t));
    setTracks(updated);
    if (engineRef.current) {
      engineRef.current.updateTracksState(updated);
    }
  };

  // 🎧 Basculer le Solo d'une piste
  const handleToggleSolo = (trackId: string) => {
    const updated = tracks.map((t) => (t.id === trackId ? { ...t, is_solo: !t.is_solo } : t));
    setTracks(updated);
    if (engineRef.current) {
      engineRef.current.updateTracksState(updated);
    }
  };

  // 🗑️ Supprimer une piste
  const handleDeleteTrack = (trackId: string) => {
    const updated = tracks.filter((t) => t.id !== trackId);
    setTracks(updated);
    if (activeTrackId === trackId) {
      setActiveTrackId(updated.length > 0 ? updated[0].id : null);
    }
    if (engineRef.current) {
      engineRef.current.loadTracks(updated);
    }
  };

  // Renommer une piste
  const handleRenameTrack = (trackId: string, newName: string) => {
    setTracks(tracks.map((t) => (t.id === trackId ? { ...t, name: newName } : t)));
  };

  // Lecture / Pause du Master synchronisé
  const togglePlayMaster = async () => {
    if (!engineRef.current || tracks.length === 0) return;

    if (isPlayingMaster) {
      engineRef.current.pause();
      if (videoRef.current) videoRef.current.pause();
      setIsPlayingMaster(false);
    } else {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
      await engineRef.current.play();
      setIsPlayingMaster(true);
    }
  };

  // Sauvegarder le projet multi-pistes MovieToMusik
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !creatorName.trim() || tracks.length === 0) return;

    setIsSaving(true);
    try {
      const maxDur = Math.max(...tracks.map((t) => t.duration), 1);
      const newProject = await createMovieToMusikProject({
        title: projectTitle.trim(),
        creator_name: creatorName.trim(),
        genre,
        visual_type: visualType,
        visual_url: visualUrl,
        tracks,
        audio_data: tracks[0]?.audio_data || '',
        duration: maxDur,
        description: description.trim(),
      });

      onProjectSaved(newProject);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement de la composition MovieToMusik.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0];
  const maxTimelineDuration = customTimelineDuration || Math.max(...tracks.map((t) => (t.duration || 0) + (t.start_offset || 0)), 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Barre supérieure */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à MovieToMusik</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-extrabold flex items-center gap-1.5 font-mono">
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-600" />
            <span>Studio Multi-Pistes & Timeline Audacity</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLONNE GAUCHE (5/12) : ÉCRAN VISUEL, CABINE MICRO & PUBLICATION */}
        <div className="lg:col-span-5 space-y-6">
          {/* Moniteur Visuel */}
          <div className="bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-stone-800 relative group aspect-video flex items-center justify-center">
            {visualType === 'video' ? (
              <video
                ref={videoRef}
                src={visualUrl}
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={visualUrl}
                alt={visualTitle}
                className="w-full h-full object-cover"
              />
            )}

            {/* Badge type visuel */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-mono font-bold border border-white/10 uppercase">
                {visualType} : {visualTitle}
              </span>
            </div>

            {/* Overlay Compte à rebours */}
            {countdown !== null && (
              <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                <span className="text-7xl sm:text-9xl font-black text-rose-500 font-mono animate-ping">
                  {countdown}
                </span>
              </div>
            )}

            {/* Overlay Indicateur Enregistrement */}
            {isRecording && (
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-rose-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-bold font-mono animate-pulse border border-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span>REC 00:{recordingSeconds.toString().padStart(2, '0')}</span>
              </div>
            )}
          </div>

          {/* Visualiseur d'ondes Micro en direct */}
          <div className="bg-stone-900 rounded-2xl p-4 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-rose-500" />
                Capture Micro Live
              </span>
              <span>{isRecording ? 'Enregistrement en cours...' : 'Prêt à capturer'}</span>
            </div>
            <canvas
              ref={canvasRef}
              width={600}
              height={50}
              className="w-full h-12 bg-stone-950 rounded-xl border border-stone-800/80"
            />
          </div>

          {/* Boutons d'action Enregistrement & Master Play */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecordingFlow}
                  className="px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-transform hover:scale-105 shadow-md shadow-rose-200 flex-1 justify-center cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <Mic className="w-4 h-4" />
                  <span>
                    {tracks.length === 0
                      ? 'Enregistrer la 1ère Piste'
                      : `Ajouter Piste ${tracks.length + 1}`}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-5 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-transform hover:scale-105 shadow-md animate-pulse flex-1 justify-center cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current text-rose-500" />
                  <span>Terminer la prise ({recordingSeconds}s)</span>
                </button>
              )}

              {/* 📂 Importer un son externe */}
              <label className="cursor-pointer px-4 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm shrink-0">
                <Upload className="w-4 h-4 text-stone-600" />
                <span>Importer un son</span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
              </label>

              {tracks.length > 0 && !isRecording && (
                <button
                  type="button"
                  onClick={togglePlayMaster}
                  className={`px-4 py-3 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                    isPlayingMaster
                      ? 'bg-rose-600 text-white shadow-rose-200'
                      : 'bg-stone-900 hover:bg-stone-800 text-white shadow-sm'
                  }`}
                >
                  {isPlayingMaster ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlayingMaster ? 'Pause' : '🔁 Play Mix'}</span>
                </button>
              )}

              {tracks.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportMixWav}
                  disabled={isExportingWav}
                  className="px-3.5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer disabled:opacity-50"
                  title="Télécharger le mix complet en un fichier WAV stéréo"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingWav ? 'Export...' : 'Mix WAV'}</span>
                </button>
              )}
            </div>

            {/* Barre de réglages rapides : Décompte & Latence */}
            <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
              <label className="flex items-center gap-2 cursor-pointer select-none font-medium">
                <input
                  type="checkbox"
                  checked={hasCountdown}
                  onChange={(e) => setHasCountdown(e.target.checked)}
                  className="w-3.5 h-3.5 text-rose-600 rounded border-stone-300 focus:ring-rose-500"
                />
                <span>⏱️ Décompte 3s avant enregistrement</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="font-medium text-stone-500">🎛️ Latence micro :</span>
                <input
                  type="number"
                  min="-200"
                  max="200"
                  step="10"
                  value={micLatencyMs}
                  onChange={(e) => setMicLatencyMs(parseInt(e.target.value, 10) || 0)}
                  className="w-16 px-1.5 py-0.5 bg-stone-50 border border-stone-200 rounded text-center font-mono font-bold text-stone-800 text-xs focus:outline-none focus:border-stone-900"
                />
                <span className="font-mono text-stone-400">ms</span>
              </div>
            </div>
          </div>

          {/* Formulaire de publication */}
          <form onSubmit={handleSaveProject} className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3.5">
            <h4 className="text-xs font-bold text-stone-900 uppercase font-mono tracking-wider">
              📝 Publication du Projet Multi-Pistes
            </h4>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Titre de l'Œuvre Sonore *
              </label>
              <input
                type="text"
                required
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Ex: Symphonie Cyberpunk, Beatbox Épique..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Compositeur / Sound Designer *
                </label>
                <input
                  type="text"
                  required
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="Votre pseudo"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Genre Musical
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900 cursor-pointer"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Note d'Intention (Optionnel)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Expliquez comment vous avez composé vos pistes..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving || tracks.length === 0 || !projectTitle.trim() || !creatorName.trim()}
              className="w-full py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs sm:text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md hover:scale-[1.01]"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Publication en cours...' : `Publier (${tracks.length} piste${tracks.length > 1 ? 's' : ''})`}</span>
            </button>
          </form>
        </div>

        {/* COLONNE DROITE (7/12) : TIMELINE MULTI-PISTES STYLE AUDACITY & EQ */}
        <div className="lg:col-span-7 space-y-6">
          {/* 🎚️ TIMELINE MULTI-PISTES AVEC FORMES D'ONDE */}
          <div className="bg-stone-900 text-white rounded-3xl p-6 border border-stone-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-rose-500" />
                <h3 className="font-bold text-sm font-display tracking-wide">
                  Timeline Multi-Pistes & Formes d'Onde ({tracks.length})
                </h3>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400">
                <Clock className="w-3 h-3 text-rose-400" />
                <span>Max : {maxTimelineDuration.toFixed(1)}s</span>
              </div>
            </div>

            {/* RÈGLE TEMPORELLE (TIME RULER STYLE DAW) */}
            <div className="relative h-6 bg-stone-950 rounded-lg px-2 flex items-center justify-between text-[9px] font-mono text-stone-500 border border-stone-800 select-none">
              {Array.from({ length: Math.ceil(maxTimelineDuration) + 1 }).map((_, sec) => (
                <div key={sec} className="flex flex-col items-center">
                  <span className="text-stone-400 font-bold">{sec}.0s</span>
                  <div className="w-0.5 h-1.5 bg-stone-700 mt-0.5" />
                </div>
              ))}
              {/* Ligne Playhead rouge */}
              {isPlayingMaster && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-rose-500 shadow-lg shadow-rose-500/80 pointer-events-none z-30 transition-all duration-75"
                  style={{ left: `${(playheadTime / maxTimelineDuration) * 100}%` }}
                />
              )}
            </div>

            {/* LISTE DES PISTES EMPILÉES VERTICALEMENT */}
            {tracks.length > 0 ? (
              <div className="space-y-4">
                {tracks.map((track, idx) => (
                  <WaveformTrackRow
                    key={track.id}
                    track={track}
                    maxTimelineDuration={maxTimelineDuration}
                    playheadTime={playheadTime}
                    isSelected={activeTrack?.id === track.id}
                    onSelect={() => setActiveTrackId(track.id)}
                    onUpdateTrim={(start, end) => handleUpdateTrim(track.id, start, end)}
                    onUpdateOffset={(newOffset) => handleUpdateOffset(track.id, newOffset)}
                    onToggleMute={() => handleToggleMute(track.id)}
                    onToggleSolo={() => handleToggleSolo(track.id)}
                    onDelete={() => handleDeleteTrack(track.id)}
                    onRename={(newName) => handleRenameTrack(track.id, newName)}
                    index={idx}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-stone-950/60 rounded-2xl border border-dashed border-stone-800 p-6 space-y-2">
                <Music2 className="w-8 h-8 text-stone-600 mx-auto" />
                <p className="text-xs font-bold text-stone-300">Aucune piste enregistrée</p>
                <p className="text-[11px] text-stone-500">
                  Cliquez sur "Enregistrer la 1ère Piste" à gauche pour générer votre première forme d'onde.
                </p>
              </div>
            )}
          </div>

          {/* 🎛️ ÉGALISEUR EQ 3 BANDES DE LA PISTE ACTIVE */}
          {activeTrack && (
            <div className="bg-stone-900 text-white rounded-3xl p-6 border border-stone-800 shadow-xl space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-rose-500" />
                  <h4 className="font-bold text-xs sm:text-sm font-display tracking-wide">
                    Égaliseur EQ de : <span className="text-rose-400">{activeTrack.name}</span>
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-stone-400 bg-stone-800 px-2 py-0.5 rounded-full">
                  DSP Piste Active
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Graves */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-stone-300">🔊 Graves</span>
                    <span className="text-rose-400 font-bold">
                      {activeTrack.eq_settings.bass > 0 ? `+${activeTrack.eq_settings.bass}` : activeTrack.eq_settings.bass}dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={activeTrack.eq_settings.bass}
                    onChange={(e) => handleUpdateTrackEQ(activeTrack.id, 'bass', parseFloat(e.target.value))}
                    className="w-full accent-rose-500 bg-stone-800 rounded-lg cursor-pointer h-1.5"
                  />
                </div>

                {/* Médiums */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-stone-300">🎚️ Médiums</span>
                    <span className="text-rose-400 font-bold">
                      {activeTrack.eq_settings.mid > 0 ? `+${activeTrack.eq_settings.mid}` : activeTrack.eq_settings.mid}dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={activeTrack.eq_settings.mid}
                    onChange={(e) => handleUpdateTrackEQ(activeTrack.id, 'mid', parseFloat(e.target.value))}
                    className="w-full accent-rose-500 bg-stone-800 rounded-lg cursor-pointer h-1.5"
                  />
                </div>

                {/* Aigus */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-stone-300">✨ Aigus</span>
                    <span className="text-rose-400 font-bold">
                      {activeTrack.eq_settings.treble > 0 ? `+${activeTrack.eq_settings.treble}` : activeTrack.eq_settings.treble}dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={activeTrack.eq_settings.treble}
                    onChange={(e) => handleUpdateTrackEQ(activeTrack.id, 'treble', parseFloat(e.target.value))}
                    className="w-full accent-rose-500 bg-stone-800 rounded-lg cursor-pointer h-1.5"
                  />
                </div>

                {/* Volume */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-stone-300">Volume</span>
                    <span className="text-emerald-400 font-bold">
                      {Math.round(activeTrack.eq_settings.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={activeTrack.eq_settings.volume}
                    onChange={(e) => handleUpdateTrackEQ(activeTrack.id, 'volume', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 bg-stone-800 rounded-lg cursor-pointer h-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Choix et importation du visuel */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                <Film className="w-4 h-4 text-stone-700" />
                Changer de Visuel
              </h4>
              <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-transform hover:scale-105 flex items-center gap-1.5 shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>Importer MP4 / GIF / Image</span>
                <input
                  type="file"
                  accept="video/mp4,image/gif,image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRESET_VISUALS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => {
                    setVisualType(preset.type);
                    setVisualUrl(preset.url);
                    setVisualTitle(preset.title);
                  }}
                  className={`group text-left rounded-2xl overflow-hidden border-2 transition-all p-1 ${
                    visualUrl === preset.url
                      ? 'border-rose-600 ring-2 ring-rose-200'
                      : 'border-stone-200 hover:border-stone-400 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="aspect-video rounded-xl overflow-hidden bg-black mb-1.5">
                    <img
                      src={preset.url}
                      alt={preset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <p className="text-[11px] font-bold text-stone-900 truncate">{preset.title}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
