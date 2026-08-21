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
  Radio
} from 'lucide-react';
import { MovieToMusikProject, EQSettings, GENRES } from '../../lib/types';
import { MicrophoneRecorder, FilteredAudioPlayer, blobToBase64 } from '../../lib/audioEngine';
import { createMovieToMusikProject } from '../../lib/supabase';

interface MovieToMusikStudioProps {
  onBack: () => void;
  onProjectSaved: (newProject: MovieToMusikProject) => void;
}

// 4 Presets Visuels Cinéma intégrés prêts à l'emploi
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
  // Étape 1 : Visuel
  const [visualType, setVisualType] = useState<'video' | 'gif' | 'image'>('image');
  const [visualUrl, setVisualUrl] = useState<string>(PRESET_VISUALS[0].url);
  const [visualTitle, setVisualTitle] = useState<string>(PRESET_VISUALS[0].title);

  // Étape 2 : Enregistrement Micro
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string>('');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Étape 3 : Mixeur & Égaliseur EQ 3 Bandes
  const [eqSettings, setEqSettings] = useState<EQSettings>({
    bass: 0,
    mid: 0,
    treble: 0,
    volume: 1.0,
  });
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  // Étape 4 : Métadonnées
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [creatorName, setCreatorName] = useState<string>('');
  const [genre, setGenre] = useState<string>(GENRES[0]);
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const recorderRef = useRef<MicrophoneRecorder | null>(null);
  const audioPlayerRef = useRef<FilteredAudioPlayer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialisation du recorder & player
  useEffect(() => {
    recorderRef.current = new MicrophoneRecorder();
    audioPlayerRef.current = new FilteredAudioPlayer();

    return () => {
      if (recorderRef.current) recorderRef.current.stop();
      if (audioPlayerRef.current) audioPlayerRef.current.dispose();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Gestion du visuel importé
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

  // Démarrer l'enregistrement avec compte à rebours 3-2-1
  const startRecordingFlow = () => {
    if (isPlayingPreview && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingPreview(false);
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
    setRecordedBlob(null);
    setRecordedAudioBase64('');
    setIsRecording(true);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
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

  // Arrêter l'enregistrement
  const stopRecording = async () => {
    if (!recorderRef.current) return;
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (videoRef.current) {
      videoRef.current.pause();
    }

    const { blob } = await recorderRef.current.stop();
    setRecordedBlob(blob);
    const base64 = await blobToBase64(blob);
    setRecordedAudioBase64(base64);

    // Initialiser immédiatement le lecteur avec l'égaliseur EQ
    if (audioPlayerRef.current) {
      audioPlayerRef.current.init(base64, eqSettings);
    }
  };

  // Mise à jour de l'EQ en direct
  const handleEqChange = (key: keyof EQSettings, value: number) => {
    const nextSettings = { ...eqSettings, [key]: value };
    setEqSettings(nextSettings);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.updateEQ(nextSettings);
    }
  };

  // Lecture / Pause de la pré-écoute synchronisée
  const togglePlayPreview = async () => {
    if (!audioPlayerRef.current || !recordedAudioBase64) return;

    if (isPlayingPreview) {
      audioPlayerRef.current.pause();
      if (videoRef.current) videoRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
      await audioPlayerRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  // Sauvegarde du projet MovieToMusik
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !creatorName.trim() || !recordedAudioBase64) return;

    setIsSaving(true);
    try {
      const newProject = await createMovieToMusikProject({
        title: projectTitle.trim(),
        creator_name: creatorName.trim(),
        genre,
        visual_type: visualType,
        visual_url: visualUrl,
        audio_data: recordedAudioBase64,
        duration: Math.max(1, recordingSeconds),
        eq_settings: eqSettings,
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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Barre supérieure : Retour & Titre Studio */}
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
            <span>Studio Bruitage & Composition Micro</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLONNE GAUCHE (7/12) : ÉCRAN VISUEL & CABINE MICRO */}
        <div className="lg:col-span-7 space-y-6">
          {/* Lecteur / Moniteur Visuel */}
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
              <span>{isRecording ? 'Capture en cours...' : 'Prêt à enregistrer'}</span>
            </div>
            <canvas
              ref={canvasRef}
              width={600}
              height={60}
              className="w-full h-14 bg-stone-950 rounded-xl border border-stone-800/80"
            />
          </div>

          {/* Commandes Enregistrement & Pré-écoute */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecordingFlow}
                className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2.5 transition-transform hover:scale-105 shadow-md shadow-rose-200"
              >
                <Mic className="w-5 h-5" />
                <span>{recordedBlob ? 'Refaire une prise Micro' : 'Enregistrer au Micro (Voix / Bruitage)'}</span>
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

            {recordedAudioBase64 && !isRecording && (
              <button
                type="button"
                onClick={togglePlayPreview}
                className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all ${
                  isPlayingPreview
                    ? 'bg-rose-600 text-white shadow-rose-200'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300'
                }`}
              >
                {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlayingPreview ? 'Arrêter la boucle' : '🔁 Écouter le mix synchro'}</span>
              </button>
            )}
          </div>

          {/* Sélecteur de Visuel & Importation personnalisée */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                <Film className="w-4 h-4 text-stone-700" />
                Changer de Visuel (Presets ou Importez le vôtre)
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

        {/* COLONNE DROITE (5/12) : TABLE DE MIXAGE EQ & FORMULAIRE */}
        <div className="lg:col-span-5 space-y-6">
          {/* CONSOLE DE MIXAGE & EQ 3 BANDES NATIVE */}
          <div className="bg-stone-900 text-white rounded-3xl p-6 border border-stone-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-sm font-display tracking-wide">Mixeur & Égaliseur EQ 3 Bandes</h3>
              </div>
              <span className="text-[10px] font-mono text-stone-400 bg-stone-800 px-2 py-0.5 rounded-full">
                Web Audio DSP
              </span>
            </div>

            <div className="space-y-4">
              {/* 1. Graves / Bass */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-stone-300 font-bold">🔊 Graves (Bass 200Hz)</span>
                  <span className="text-rose-400 font-bold">{eqSettings.bass > 0 ? `+${eqSettings.bass}` : eqSettings.bass} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={eqSettings.bass}
                  onChange={(e) => handleEqChange('bass', parseFloat(e.target.value))}
                  className="w-full accent-rose-500 bg-stone-800 rounded-lg cursor-pointer h-2"
                />
              </div>

              {/* 2. Médiums / Voice */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-stone-300 font-bold">🎚️ Médiums (Corps & Voix 1.2kHz)</span>
                  <span className="text-rose-400 font-bold">{eqSettings.mid > 0 ? `+${eqSettings.mid}` : eqSettings.mid} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={eqSettings.mid}
                  onChange={(e) => handleEqChange('mid', parseFloat(e.target.value))}
                  className="w-full accent-rose-500 bg-stone-800 rounded-lg cursor-pointer h-2"
                />
              </div>

              {/* 3. Aigus / Treble */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-stone-300 font-bold">✨ Aigus (Brillance & Air 3.5kHz)</span>
                  <span className="text-rose-400 font-bold">{eqSettings.treble > 0 ? `+${eqSettings.treble}` : eqSettings.treble} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={eqSettings.treble}
                  onChange={(e) => handleEqChange('treble', parseFloat(e.target.value))}
                  className="w-full accent-rose-500 bg-stone-800 rounded-lg cursor-pointer h-2"
                />
              </div>

              {/* 4. Volume Master */}
              <div className="space-y-1.5 pt-2 border-t border-stone-800">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-stone-300 font-bold flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-stone-400" />
                    Volume Master
                  </span>
                  <span className="text-emerald-400 font-bold">{Math.round(eqSettings.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={eqSettings.volume}
                  onChange={(e) => handleEqChange('volume', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 bg-stone-800 rounded-lg cursor-pointer h-2"
                />
              </div>
            </div>
          </div>

          {/* FORMULAIRE DE PUBLICATION */}
          <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-stone-900 uppercase font-mono tracking-wider">
              📝 Informations de la Composition
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
                placeholder="Ex: Tempête de Synthétiseur, Beatbox Cyberpunk..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Sound Designer / Compositeur *
              </label>
              <input
                type="text"
                required
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Votre nom ou pseudo d'artiste"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Genre Musical / Ambiance
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

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Note d'Intention & Description Sonore (Optionnel)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Expliquez comment vous avez créé les sons (voix, bruitages d'objets, instruments...)"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving || !recordedAudioBase64 || !projectTitle.trim() || !creatorName.trim()}
              className="w-full py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs sm:text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Publication en cours...' : 'Publier dans MovieToMusik'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
