import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Sliders, 
  Sparkles, 
  Upload, 
  Check, 
  RotateCcw, 
  Film, 
  Volume2, 
  VolumeX, 
  Save, 
  Clapperboard, 
  Info,
  Radio,
  Plus,
  Trash2,
  Scissors,
  Headphones,
  Layers,
  Music2
} from 'lucide-react';
import { MovieToMusikProject, AudioTrack, EQSettings, GENRES } from '../../lib/types';
import { MicrophoneRecorder, MultiTrackAudioEngine, blobToBase64 } from '../../lib/audioEngine';
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
  const [countdown, setCountdown] = useState<number | null>(null);

  // Lecture Globale Master
  const [isPlayingMaster, setIsPlayingMaster] = useState<boolean>(false);

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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialisation du moteur multi-pistes
  useEffect(() => {
    recorderRef.current = new MicrophoneRecorder();
    engineRef.current = new MultiTrackAudioEngine();

    return () => {
      if (recorderRef.current) recorderRef.current.stop();
      if (engineRef.current) engineRef.current.dispose();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
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

  // Gestion de l'upload de fichier visuel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type.startsWith('video/')
      ? 'video'
      : file.type.includes('gif')
      ? 'gif'
      : 'image';

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

    // Jouer les autres pistes en fond (overdubbing)
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

  // Arrêter l'enregistrement et créer la nouvelle piste
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

    const newTrackIndex = tracks.length + 1;
    const newTrack: AudioTrack = {
      id: crypto.randomUUID(),
      name: `Piste ${newTrackIndex} (${newTrackIndex === 1 ? 'Rythme / Voix' : 'Superposition'})`,
      audio_data: base64,
      duration,
      trim_start: 0.1, // Anti-clic par défaut léger (100ms) pour supprimer le bruit de clic initial
      trim_end: duration,
      is_muted: false,
      is_solo: false,
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

  // ✂️ Ajuster le rognage Début (Anti-clic) ou Fin
  const handleUpdateTrim = (trackId: string, trimStart: number, trimEnd: number) => {
    const updated = tracks.map((t) => {
      if (t.id === trackId) {
        const safeStart = Math.max(0, Math.min(trimStart, t.duration - 0.1));
        const safeEnd = Math.max(safeStart + 0.1, Math.min(trimEnd, t.duration));
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
            <span>Studio Multi-Pistes & Overdub</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLONNE GAUCHE (6/12) : ÉCRAN VISUEL, CABINE MICRO & MASTER */}
        <div className="lg:col-span-6 space-y-6">
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

            {/* Overlay Compte à rebours géant */}
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

          {/* Visualiseur d'ondes Audio en direct */}
          <div className="bg-stone-900 rounded-2xl p-4 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-rose-500" />
                Spectre Micro en Temps Réel
              </span>
              <span>{isRecording ? 'Capture de la piste en cours...' : 'Prêt à enregistrer'}</span>
            </div>
            <canvas
              ref={canvasRef}
              width={600}
              height={55}
              className="w-full h-14 bg-stone-950 rounded-xl border border-stone-800/80"
            />
          </div>

          {/* Boutons d'action Enregistrement & Master Play */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecordingFlow}
                className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2.5 transition-transform hover:scale-105 shadow-md shadow-rose-200"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <Mic className="w-4 h-4" />
                <span>
                  {tracks.length === 0
                    ? 'Enregistrer la 1ère Piste'
                    : `Ajouter la Piste ${tracks.length + 1} (Overdub)`}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-6 py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2.5 transition-transform hover:scale-105 shadow-md animate-pulse"
              >
                <Square className="w-5 h-5 fill-current text-rose-500" />
                <span>Terminer la prise ({recordingSeconds}s)</span>
              </button>
            )}

            {tracks.length > 0 && !isRecording && (
              <button
                type="button"
                onClick={togglePlayMaster}
                className={`px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all ${
                  isPlayingMaster
                    ? 'bg-rose-600 text-white shadow-rose-200'
                    : 'bg-stone-900 hover:bg-stone-800 text-white shadow-sm'
                }`}
              >
                {isPlayingMaster ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlayingMaster ? 'Pause Master' : `🔁 Écouter le Mix (${tracks.length} piste${tracks.length > 1 ? 's' : ''})`}</span>
              </button>
            )}
          </div>

          {/* Sélecteur de Visuel & Importation */}
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

        {/* COLONNE DROITE (6/12) : TIMELINE MULTI-PISTES, DÉCOUPE & EQ */}
        <div className="lg:col-span-6 space-y-6">
          {/* GESTIONNAIRE DE PISTES (TIMELINE) */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2 font-display">
                <Layers className="w-4 h-4 text-rose-600" />
                <span>Pistes Audio Enregistrées ({tracks.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-stone-500">
                Superposition & Rognage
              </span>
            </div>

            {tracks.length > 0 ? (
              <div className="space-y-4">
                {tracks.map((track, idx) => {
                  const isSelected = activeTrack?.id === track.id;

                  return (
                    <div
                      key={track.id}
                      onClick={() => setActiveTrackId(track.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/20 shadow-md ring-1 ring-rose-300'
                          : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                      }`}
                    >
                      {/* En-tête de la piste : Titre, Durée, Mute, Solo, Suppr */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={track.name}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleRenameTrack(track.id, e.target.value)}
                            className="text-xs font-bold text-stone-900 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-stone-900 focus:outline-none truncate"
                          />
                          <span className="text-[10px] font-mono text-stone-400 shrink-0">
                            ({track.duration}s)
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* Mute */}
                          <button
                            type="button"
                            onClick={() => handleToggleMute(track.id)}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                              track.is_muted
                                ? 'bg-rose-600 text-white'
                                : 'bg-white hover:bg-stone-200 text-stone-700 border border-stone-200'
                            }`}
                            title={track.is_muted ? 'Piste coupée (Cliquer pour activer)' : 'Couper le son (Mute)'}
                          >
                            {track.is_muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>

                          {/* Solo */}
                          <button
                            type="button"
                            onClick={() => handleToggleSolo(track.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                              track.is_solo
                                ? 'bg-amber-500 text-white font-extrabold'
                                : 'bg-white hover:bg-stone-200 text-stone-700 border border-stone-200'
                            }`}
                            title="Isoler cette piste (Solo)"
                          >
                            <Headphones className="w-3.5 h-3.5 inline mr-0.5" />
                            SOLO
                          </button>

                          {/* Supprimer */}
                          <button
                            type="button"
                            onClick={() => handleDeleteTrack(track.id)}
                            className="p-1.5 rounded-lg bg-white hover:bg-rose-100 text-stone-400 hover:text-rose-600 border border-stone-200 transition-colors"
                            title="Supprimer cette piste"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* ✂️ Rognage Anti-Clic (Début et Fin) */}
                      <div className="bg-white p-3 rounded-xl border border-stone-200/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-bold text-stone-700 flex items-center gap-1">
                            <Scissors className="w-3 h-3 text-rose-600" />
                            <span>Découpe Anti-Clic (Début / Fin)</span>
                          </span>
                          <span className="text-rose-600 font-bold">
                            {track.trim_start.toFixed(2)}s → {track.trim_end.toFixed(2)}s ({(track.trim_end - track.trim_start).toFixed(2)}s)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <div className="flex justify-between text-[10px] text-stone-500 mb-0.5">
                              <span>Couper début (Clic)</span>
                              <span className="font-mono font-bold">{track.trim_start.toFixed(2)}s</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={Math.min(3, track.duration - 0.1)}
                              step="0.02"
                              value={track.trim_start}
                              onChange={(e) => handleUpdateTrim(track.id, parseFloat(e.target.value), track.trim_end)}
                              className="w-full accent-rose-600 bg-stone-100 rounded-lg cursor-pointer h-1.5"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] text-stone-500 mb-0.5">
                              <span>Couper fin</span>
                              <span className="font-mono font-bold">{track.trim_end.toFixed(2)}s</span>
                            </div>
                            <input
                              type="range"
                              min={track.trim_start + 0.1}
                              max={track.duration}
                              step="0.05"
                              value={track.trim_end}
                              onChange={(e) => handleUpdateTrim(track.id, track.trim_start, parseFloat(e.target.value))}
                              className="w-full accent-rose-600 bg-stone-100 rounded-lg cursor-pointer h-1.5"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-stone-300 p-6 space-y-2">
                <Music2 className="w-8 h-8 text-stone-400 mx-auto" />
                <p className="text-xs font-bold text-stone-700">Aucune piste pour le moment</p>
                <p className="text-[11px] text-stone-500">
                  Cliquez sur "Enregistrer la 1ère Piste" pour commencer votre création sonore.
                </p>
              </div>
            )}
          </div>

          {/* 🎛️ CONSOLE DE MIXAGE & ÉGALISEUR DE LA PISTE SÉLECTIONNÉE */}
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

              <div className="grid grid-cols-2 gap-4">
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

                {/* Volume Piste */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-stone-300">Volume Piste</span>
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

          {/* FORMULAIRE DE PUBLICATION */}
          <form onSubmit={handleSaveProject} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
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
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Sound Designer / Compositeur *
                </label>
                <input
                  type="text"
                  required
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="Votre pseudo d'artiste"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Genre Musical
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Note d'Intention (Optionnel)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détaillez vos pistes (beatbox, voix, sifflements, verres d'eau...)"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving || tracks.length === 0 || !projectTitle.trim() || !creatorName.trim()}
              className="w-full py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs sm:text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Publication en cours...' : `Publier le Mix (${tracks.length} piste${tracks.length > 1 ? 's' : ''})`}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
