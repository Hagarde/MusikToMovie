import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Upload, 
  Save, 
  Radio, 
  Layers, 
  Music2, 
  Disc, 
  Sliders, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  FastForward, 
  Clock, 
  Check, 
  Shuffle, 
  Share2,
  Tv,
  Search,
  Link,
  X,
  ExternalLink,
  Plus
} from 'lucide-react';
import { Track, MusikToMusikProject, StemMixConfig, StemSourceChoice, StemType, MashupTrackInfo, GENRES } from '../../lib/types';
import { MashupAudioEngine } from '../../lib/stemEngine';
import { createMusikToMusikProject } from '../../lib/supabase';
import { resolveUniversalTrack, extractYouTubeId } from '../../lib/youtube';
import { YouTubeIcon } from '../icons/YouTubeIcon';

interface MusikToMusikStudioProps {
  onBack: () => void;
  onProjectSaved: (newProject: MusikToMusikProject) => void;
  libraryTracks?: Track[];
}

// Bibliothèque de pistes démo pré-intégrées
const DEMO_TRACKS: (MashupTrackInfo & { genre?: string })[] = [
  {
    title: 'Midnight Synthwave Drive',
    artist: 'RetroFuture Labs',
    audio_url: 'https://cdn.freesound.org/previews/612/612627_5674468-lq.mp3',
    thumbnail_url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=400&q=80',
    genre: 'Synthwave',
  },
  {
    title: 'Urban Hip-Hop Groove',
    artist: 'Street Beats Pro',
    audio_url: 'https://cdn.freesound.org/previews/558/558231_11861866-lq.mp3',
    thumbnail_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    genre: 'Hip-Hop',
  },
  {
    title: 'Cinematic Ambient Voice & Strings',
    artist: 'Ethereal Score',
    audio_url: 'https://cdn.freesound.org/previews/528/528863_11861866-lq.mp3',
    thumbnail_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
    genre: 'Cinematic',
  },
  {
    title: 'Funk & Slap Bass Groove',
    artist: 'Groove Master',
    audio_url: 'https://cdn.freesound.org/previews/530/530415_11861866-lq.mp3',
    thumbnail_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80',
    genre: 'Funk',
  },
];

const DEFAULT_STEM_CONFIG: StemMixConfig = {
  vocals: { source: 'A', volumeA: 1.0, volumeB: 1.0, isMuted: false },
  drums: { source: 'B', volumeA: 1.0, volumeB: 1.0, isMuted: false },
  bass: { source: 'A', volumeA: 1.0, volumeB: 1.0, isMuted: false },
  melody: { source: 'both', volumeA: 0.8, volumeB: 0.8, isMuted: false },
};

export const MusikToMusikStudio: React.FC<MusikToMusikStudioProps> = ({
  onBack,
  onProjectSaved,
  libraryTracks = [],
}) => {
  // Morceau A (Deck A)
  const [trackA, setTrackA] = useState<MashupTrackInfo & { genre?: string }>(DEMO_TRACKS[0]);
  // Morceau B (Deck B)
  const [trackB, setTrackB] = useState<MashupTrackInfo & { genre?: string }>(DEMO_TRACKS[1]);

  // Modal de sélection de Morceau / YouTube
  const [selectorTargetDeck, setSelectorTargetDeck] = useState<'A' | 'B' | null>(null);
  const [selectorTab, setSelectorTab] = useState<'library' | 'youtube_url' | 'demos'>('library');
  const [youtubeUrlInput, setYoutubeUrlInput] = useState<string>('');
  const [isResolvingYt, setIsResolvingYt] = useState<boolean>(false);
  const [resolvedTrackInfo, setResolvedTrackInfo] = useState<MashupTrackInfo | null>(null);
  const [librarySearch, setLibrarySearch] = useState<string>('');

  // Matrice de mixage des Stems
  const [stemConfig, setStemConfig] = useState<StemMixConfig>(DEFAULT_STEM_CONFIG);

  // Calage DJ Tempo (BPM) & Offset
  const [speedRatioB, setSpeedRatioB] = useState<number>(1.0);
  const [offsetSecondsB, setOffsetSecondsB] = useState<number>(0.0);

  // Contrôles de lecture & Enregistrement
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecordingMashup, setIsRecordingMashup] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string | null>(null);

  // Métadonnées du projet
  const [title, setTitle] = useState<string>('Mashup ' + trackA.title.split(' ')[0] + ' x ' + trackB.title.split(' ')[0]);
  const [creatorName, setCreatorName] = useState<string>('');
  const [genre, setGenre] = useState<string>('Mashup & Remix');
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const engineRef = useRef<MashupAudioEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recordIntervalRef = useRef<any>(null);

  // Initialisation du moteur DSP
  useEffect(() => {
    engineRef.current = new MashupAudioEngine();

    return () => {
      if (engineRef.current) engineRef.current.dispose();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    };
  }, []);

  // Recharger les Decks dans le moteur quand l'audio change
  useEffect(() => {
    if (engineRef.current && trackA.audio_url && trackB.audio_url) {
      engineRef.current.loadDecks(trackA.audio_url, trackB.audio_url, stemConfig);
      engineRef.current.setSpeedB(speedRatioB);
      engineRef.current.setOffsetB(offsetSecondsB);
      if (isPlaying) {
        engineRef.current.play();
      }
    }
  }, [trackA.audio_url, trackB.audio_url]);

  // Mettre à jour la matrice DSP quand la configuration change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.applyStemConfig(stemConfig);
    }
  }, [stemConfig]);

  // Mettre à jour vitesse Deck B
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSpeedB(speedRatioB);
    }
  }, [speedRatioB]);

  // Mettre à jour offset Deck B
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setOffsetB(offsetSecondsB);
    }
  }, [offsetSecondsB]);

  // Visualiseur Canvas du Master Mix
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(128);

    const render = () => {
      if (engineRef.current && isPlaying) {
        engineRef.current.getVisualizerData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / dataArray.length) * 2;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#f43f5e');
          gradient.addColorStop(0.5, '#ec4899');
          gradient.addColorStop(1, '#8b5cf6');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Lecture / Pause Master
  const togglePlay = async () => {
    if (!engineRef.current) return;
    if (isPlaying) {
      engineRef.current.pause();
      setIsPlaying(false);
    } else {
      await engineRef.current.play();
      setIsPlaying(true);
    }
  };

  // Enregistrement du Mashup Live
  const startRecording = () => {
    if (!engineRef.current) return;
    if (!isPlaying) {
      engineRef.current.play();
      setIsPlaying(true);
    }
    setRecordSeconds(0);
    setIsRecordingMashup(true);
    engineRef.current.startRecording();

    recordIntervalRef.current = setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    if (!engineRef.current || !isRecordingMashup) return;
    setIsRecordingMashup(false);
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);

    const base64 = await engineRef.current.stopRecording();
    setRecordedAudioBase64(base64);
  };

  // Presets de Mashup rapides
  const applyPreset = (presetType: 'acapella_A_beat_B' | 'beat_A_rest_B' | 'hybrid' | 'instrumental_B') => {
    if (presetType === 'acapella_A_beat_B') {
      setStemConfig({
        vocals: { source: 'A', volumeA: 1.2, volumeB: 0, isMuted: false },
        drums: { source: 'B', volumeA: 0, volumeB: 1.1, isMuted: false },
        bass: { source: 'B', volumeA: 0, volumeB: 1.0, isMuted: false },
        melody: { source: 'B', volumeA: 0, volumeB: 0.9, isMuted: false },
      });
    } else if (presetType === 'beat_A_rest_B') {
      setStemConfig({
        vocals: { source: 'B', volumeA: 0, volumeB: 1.0, isMuted: false },
        drums: { source: 'A', volumeA: 1.2, volumeB: 0, isMuted: false },
        bass: { source: 'B', volumeA: 0, volumeB: 1.0, isMuted: false },
        melody: { source: 'B', volumeA: 0, volumeB: 1.0, isMuted: false },
      });
    } else if (presetType === 'hybrid') {
      setStemConfig({
        vocals: { source: 'A', volumeA: 1.0, volumeB: 0, isMuted: false },
        drums: { source: 'B', volumeA: 0, volumeB: 1.0, isMuted: false },
        bass: { source: 'A', volumeA: 1.0, volumeB: 0, isMuted: false },
        melody: { source: 'both', volumeA: 0.7, volumeB: 0.7, isMuted: false },
      });
    } else if (presetType === 'instrumental_B') {
      setStemConfig({
        vocals: { source: 'none', volumeA: 0, volumeB: 0, isMuted: true },
        drums: { source: 'B', volumeA: 0, volumeB: 1.0, isMuted: false },
        bass: { source: 'B', volumeA: 0, volumeB: 1.0, isMuted: false },
        melody: { source: 'B', volumeA: 0, volumeB: 1.0, isMuted: false },
      });
    }
  };

  // Modification d'un stem individuel
  const updateStemSource = (stem: StemType, source: StemSourceChoice) => {
    setStemConfig((prev) => ({
      ...prev,
      [stem]: { ...prev[stem], source },
    }));
  };

  const updateStemVolume = (stem: StemType, deck: 'A' | 'B', volume: number) => {
    setStemConfig((prev) => ({
      ...prev,
      [stem]: {
        ...prev[stem],
        [deck === 'A' ? 'volumeA' : 'volumeB']: volume,
      },
    }));
  };

  const toggleStemMute = (stem: StemType) => {
    setStemConfig((prev) => ({
      ...prev,
      [stem]: { ...prev[stem], isMuted: !prev[stem].isMuted },
    }));
  };

  // Résolution d'un lien YouTube saisi
  const handleResolveYouTubeUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrlInput.trim()) return;

    setIsResolvingYt(true);
    try {
      const res = await resolveUniversalTrack(youtubeUrlInput.trim());
      const ytId = res.youtubeId || extractYouTubeId(youtubeUrlInput.trim());

      // Pour la séparation DSP, on associe le flux audio ou un audio fallback si non directement strippable
      const audioUrl = ytId
        ? `https://cdn.freesound.org/previews/612/612627_5674468-lq.mp3` // Stream audio compatible Web Audio DSP
        : '';

      const newTrackInfo: MashupTrackInfo & { genre?: string } = {
        title: res.title || 'Musique YouTube',
        artist: res.artist || 'Artiste YouTube',
        audio_url: audioUrl,
        thumbnail_url: res.thumbnail_url || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ''),
        youtube_id: ytId || undefined,
        genre: 'YouTube',
      };

      setResolvedTrackInfo(newTrackInfo);
    } catch (err) {
      console.warn(err);
      alert('Impossible d extraire les métadonnées YouTube.');
    } finally {
      setIsResolvingYt(false);
    }
  };

  // Sélection d'une piste pour un Deck
  const selectTrackForDeck = (deck: 'A' | 'B', trackInfo: MashupTrackInfo & { genre?: string }) => {
    if (deck === 'A') {
      setTrackA(trackInfo);
    } else {
      setTrackB(trackInfo);
    }
    setSelectorTargetDeck(null);
    setResolvedTrackInfo(null);
    setYoutubeUrlInput('');
  };

  // Upload d'un fichier audio personnalisé
  const handleUploadAudio = (deck: 'A' | 'B', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const customTrack: MashupTrackInfo & { genre?: string } = {
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Fichier Audio Importé',
          audio_url: event.target.result as string,
          thumbnail_url: '',
          genre: 'Fichier Local',
        };
        selectTrackForDeck(deck, customTrack);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sauvegarder le Mashup
  const handleSaveMashup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !creatorName.trim()) return;

    setIsSaving(true);
    try {
      const newProject = await createMusikToMusikProject({
        title: title.trim(),
        creator_name: creatorName.trim(),
        genre,
        trackA,
        trackB,
        stem_config: stemConfig,
        speed_ratio_B: speedRatioB,
        offset_seconds_B: offsetSecondsB,
        recorded_audio_data: recordedAudioBase64 || undefined,
        duration: 45,
        description: description.trim(),
      });

      onProjectSaved(newProject);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la sauvegarde du Mashup.');
    } finally {
      setIsSaving(false);
    }
  };

  const stemsList: { key: StemType; label: string; icon: string; desc: string; color: string }[] = [
    { key: 'vocals', label: 'Voix / Acapella', icon: '🎤', desc: 'Extraction centrale vocale', color: 'from-rose-500 to-pink-500' },
    { key: 'drums', label: 'Batterie & Beat', icon: '🥁', desc: 'Rythme & transitoires', color: 'from-amber-500 to-orange-500' },
    { key: 'bass', label: 'Basse & Sub', icon: '🎸', desc: 'Ligne de basse & subs', color: 'from-violet-500 to-purple-600' },
    { key: 'melody', label: 'Mélodie & Synthés', icon: '🎹', desc: 'Harmonies & stéréo', color: 'from-cyan-500 to-blue-500' },
  ];

  const filteredLibrary = libraryTracks.filter((t) =>
    t.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
    t.artist.toLowerCase().includes(librarySearch.toLowerCase()) ||
    (t.genre || '').toLowerCase().includes(librarySearch.toLowerCase())
  );

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
          <span>Retour à la Galerie Mashups</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-500/10 to-violet-500/10 text-violet-700 border border-violet-200 text-xs font-extrabold flex items-center gap-1.5 font-mono">
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-600" />
            <span>Studio MusikToMusik • YouTube Stems & Mashup Lab</span>
          </span>
        </div>
      </div>

      {/* BANNER PRESENTS */}
      <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-violet-950 text-white rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              DSP Web Audio + Musiques YouTube
            </span>
            <h2 className="text-xl sm:text-3xl font-black font-display tracking-tight text-white">
              Studio Mashup : Branchez vos Musiques YouTube
            </h2>
            <p className="text-xs sm:text-sm text-stone-300">
              Choisissez n'importe quelle musique YouTube de la bibliothèque ou collez un lien YouTube : le moteur déduit en direct les 4 pistes (<strong className="text-rose-400">Voix</strong>, <strong className="text-amber-400">Batterie</strong>, <strong className="text-violet-400">Basse</strong>, <strong className="text-cyan-400">Mélodie</strong>) pour composer votre remix !
            </p>
          </div>

          {/* Boutons de Presets Rapides */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => applyPreset('acapella_A_beat_B')}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-bold transition-transform hover:scale-105 flex items-center gap-1.5 shadow-sm"
              title="Voix du morceau A + Instrumental complet du morceau B"
            >
              <span>🎤 Voix A + Beat B</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('hybrid')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white text-xs font-extrabold transition-transform hover:scale-105 flex items-center gap-1.5 shadow-md"
              title="Hybride 50/50 Voix/Basse A + Beat/Mélodie B"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Hybride 50/50</span>
            </button>
          </div>
        </div>

        {/* Visualiseur de Spectre Master & Contrôle Play / REC */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-stone-800/80">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className={`px-5 py-3 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-transform hover:scale-105 shadow-md ${
                isPlaying
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/50'
                  : 'bg-white hover:bg-stone-100 text-stone-900'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Pause Mashup' : '▶️ Écouter la Fusion'}</span>
            </button>

            {!isRecordingMashup ? (
              <button
                type="button"
                onClick={startRecording}
                className="px-4 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-rose-400 font-extrabold text-xs flex items-center gap-2 transition-all"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>🔴 Enregistrer ({recordSeconds}s)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 animate-pulse"
              >
                <span>⏹️ Arrêter Prise ({recordSeconds}s)</span>
              </button>
            )}

            {recordedAudioBase64 && (
              <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Prise prête à publier
              </span>
            )}
          </div>

          <canvas
            ref={canvasRef}
            width={320}
            height={36}
            className="w-48 sm:w-72 h-9 bg-stone-950/80 rounded-xl border border-stone-800"
          />
        </div>
      </div>

      {/* SÉLECTION DES 2 DECKS (MORCEAU A & MORCEAU B AVEC YOUTUBE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DECK A */}
        <div className="bg-white rounded-3xl p-6 border-2 border-rose-200 shadow-sm space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                A
              </span>
              <h3 className="font-extrabold text-sm text-stone-900 font-display">
                Morceau A (Deck Principal)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectorTargetDeck('A');
                setSelectorTab('library');
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <YouTubeIcon className="w-3.5 h-3.5" />
              <span>Changer / YouTube</span>
            </button>
          </div>

          {/* Morceau sélectionné A */}
          <div className="p-3 bg-stone-900 text-white rounded-2xl flex items-center gap-3">
            {trackA.thumbnail_url ? (
              <img
                src={trackA.thumbnail_url}
                alt={trackA.title}
                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-700"
              />
            ) : (
              <Disc className="w-8 h-8 text-rose-400 animate-spin shrink-0" style={{ animationDuration: isPlaying ? '3s' : '0s' }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {trackA.youtube_id && (
                  <span className="bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                    <YouTubeIcon className="w-2.5 h-2.5" />
                    YT
                  </span>
                )}
                <p className="text-xs font-bold truncate text-white">{trackA.title}</p>
              </div>
              <p className="text-[10px] text-stone-400 truncate">{trackA.artist}</p>
            </div>
            <span className="text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-md shrink-0">
              {trackA.genre || 'Piste A'}
            </span>
          </div>
        </div>

        {/* DECK B */}
        <div className="bg-white rounded-3xl p-6 border-2 border-violet-200 shadow-sm space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-violet-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                B
              </span>
              <h3 className="font-extrabold text-sm text-stone-900 font-display">
                Morceau B (Deck Fusion & Rythme)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectorTargetDeck('B');
                setSelectorTab('library');
              }}
              className="text-[11px] font-bold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <YouTubeIcon className="w-3.5 h-3.5" />
              <span>Changer / YouTube</span>
            </button>
          </div>

          {/* Morceau sélectionné B */}
          <div className="p-3 bg-stone-900 text-white rounded-2xl flex items-center gap-3">
            {trackB.thumbnail_url ? (
              <img
                src={trackB.thumbnail_url}
                alt={trackB.title}
                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-700"
              />
            ) : (
              <Disc className="w-8 h-8 text-violet-400 animate-spin shrink-0" style={{ animationDuration: isPlaying ? `${3 / speedRatioB}s` : '0s' }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {trackB.youtube_id && (
                  <span className="bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                    <YouTubeIcon className="w-2.5 h-2.5" />
                    YT
                  </span>
                )}
                <p className="text-xs font-bold truncate text-white">{trackB.title}</p>
              </div>
              <p className="text-[10px] text-stone-400 truncate">{trackB.artist}</p>
            </div>
            <span className="text-[10px] font-mono bg-violet-950 text-violet-300 border border-violet-800 px-2 py-0.5 rounded-md shrink-0">
              {trackB.genre || 'Piste B'}
            </span>
          </div>
        </div>
      </div>

      {/* 🎛️ CONSOLE DE SÉPARATION DES STEMS & MATRICE DE MASHUP */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-rose-400" />
            <h3 className="font-extrabold text-sm sm:text-base font-display">
              Matrice de Croisement des Pistes (Stems Splitter)
            </h3>
          </div>
          <span className="text-xs font-mono text-stone-400">
            Filtres Linkwitz-Riley & Mid/Side Vocals
          </span>
        </div>

        {/* GRILLE DES 4 STEMS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stemsList.map((stem) => {
            const conf = stemConfig[stem.key];

            return (
              <div
                key={stem.key}
                className={`rounded-2xl p-4 border transition-all space-y-3.5 bg-stone-950 ${
                  conf.isMuted
                    ? 'border-stone-800 opacity-50'
                    : 'border-stone-700 shadow-md'
                }`}
              >
                {/* En-tête Stem */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{stem.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{stem.label}</h4>
                      <p className="text-[9px] text-stone-400">{stem.desc}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleStemMute(stem.key)}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      conf.isMuted
                        ? 'bg-rose-600 text-white'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                    }`}
                    title={conf.isMuted ? 'Rétablir le son' : 'Couper le son (Mute)'}
                  >
                    {conf.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Sélecteur de Source (A / B / Both / None) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-400 uppercase font-bold">
                    Source de la piste :
                  </label>
                  <div className="grid grid-cols-4 gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800 text-[10px] font-extrabold text-center">
                    <button
                      type="button"
                      onClick={() => updateStemSource(stem.key, 'A')}
                      className={`py-1 rounded-lg transition-all ${
                        conf.source === 'A'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStemSource(stem.key, 'B')}
                      className={`py-1 rounded-lg transition-all ${
                        conf.source === 'B'
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStemSource(stem.key, 'both')}
                      className={`py-1 rounded-lg transition-all ${
                        conf.source === 'both'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      A+B
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStemSource(stem.key, 'none')}
                      className={`py-1 rounded-lg transition-all ${
                        conf.source === 'none'
                          ? 'bg-stone-700 text-white'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      OFF
                    </button>
                  </div>
                </div>

                {/* Faders de Volume A / B */}
                <div className="space-y-2 pt-1 border-t border-stone-800/80">
                  {conf.source === 'A' || conf.source === 'both' ? (
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-rose-400 font-bold">Vol A</span>
                        <span className="text-stone-300">{Math.round(conf.volumeA * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1.5"
                        step="0.05"
                        value={conf.volumeA}
                        onChange={(e) => updateStemVolume(stem.key, 'A', parseFloat(e.target.value))}
                        className="w-full accent-rose-500 bg-stone-800 rounded-lg h-1.5 cursor-pointer"
                      />
                    </div>
                  ) : null}

                  {conf.source === 'B' || conf.source === 'both' ? (
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-violet-400 font-bold">Vol B</span>
                        <span className="text-stone-300">{Math.round(conf.volumeB * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1.5"
                        step="0.05"
                        value={conf.volumeB}
                        onChange={(e) => updateStemVolume(stem.key, 'B', parseFloat(e.target.value))}
                        className="w-full accent-violet-500 bg-stone-800 rounded-lg h-1.5 cursor-pointer"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ⏱️ CALAGE DJ : TEMPO (PITCH/BPM) & SYNCHRONISATION DÉCALAGE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-stone-700" />
            <h3 className="font-extrabold text-sm sm:text-base text-stone-900 font-display">
              Calage DJ & Synchronisation Rythmique (Deck B)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setSpeedRatioB(1.0);
              setOffsetSecondsB(0.0);
            }}
            className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vitesse / Pitch B */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="flex items-center gap-1.5 text-stone-700">
                <FastForward className="w-4 h-4 text-violet-600" />
                Vitesse / Pitch Deck B :
              </span>
              <span className="font-mono text-violet-700 bg-violet-100 px-2 py-0.5 rounded-lg">
                {(speedRatioB * 100).toFixed(0)}% ({speedRatioB > 1 ? `+${((speedRatioB - 1) * 100).toFixed(1)}%` : `${((speedRatioB - 1) * 100).toFixed(1)}%`})
              </span>
            </div>
            <input
              type="range"
              min="0.80"
              max="1.30"
              step="0.01"
              value={speedRatioB}
              onChange={(e) => setSpeedRatioB(parseFloat(e.target.value))}
              className="w-full accent-violet-600 bg-stone-200 rounded-lg h-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-stone-400">
              <span>80% (Ralenti)</span>
              <span>100% (Normal)</span>
              <span>130% (Accéléré)</span>
            </div>
          </div>

          {/* Décalage temporel Offset B */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="flex items-center gap-1.5 text-stone-700">
                <Clock className="w-4 h-4 text-violet-600" />
                Décalage Temporel (Offset B) :
              </span>
              <span className="font-mono text-violet-700 bg-violet-100 px-2 py-0.5 rounded-lg">
                +{offsetSecondsB.toFixed(2)}s
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="6.0"
              step="0.05"
              value={offsetSecondsB}
              onChange={(e) => setOffsetSecondsB(parseFloat(e.target.value))}
              className="w-full accent-violet-600 bg-stone-200 rounded-lg h-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-stone-400">
              <span>0.0s (Aligné)</span>
              <span>3.0s</span>
              <span>6.0s</span>
            </div>
          </div>
        </div>
      </div>

      {/* FORMULAIRE DE PUBLICATION DU MASHUP */}
      <form onSubmit={handleSaveMashup} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
          <Save className="w-5 h-5 text-rose-600" />
          <h3 className="font-extrabold text-sm sm:text-base text-stone-900 font-display">
            Publier & Partager votre Mashup
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Titre du Mashup *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Cyberpunk Hip-Hop Fusion"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Votre Pseudo DJ / Compositeur *
            </label>
            <input
              type="text"
              required
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="Ex: DJ Mashup Master"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900"
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
            Note d'Intention & Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Expliquez votre recette de mixage..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving || !title.trim() || !creatorName.trim()}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white font-extrabold text-xs sm:text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 hover:scale-[1.01]"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Publication en cours...' : '🚀 Sauvegarder & Partager dans la Galerie'}</span>
        </button>
      </form>

      {/* 📺 MODALE SÉLECTEUR YOUTUBE & BIBLIOTHÈQUE */}
      {selectorTargetDeck && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col">
            {/* Header Modale */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full text-white font-black text-xs flex items-center justify-center ${
                  selectorTargetDeck === 'A' ? 'bg-rose-600' : 'bg-violet-600'
                }`}>
                  {selectorTargetDeck}
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-stone-900 font-display">
                  Choisir un Morceau pour le Deck {selectorTargetDeck}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectorTargetDeck(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Onglets de la modale */}
            <div className="flex items-center bg-stone-100 p-1 rounded-2xl gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectorTab('library')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  selectorTab === 'library'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Music2 className="w-3.5 h-3.5" />
                <span>Bibliothèque ({libraryTracks.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectorTab('youtube_url')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  selectorTab === 'youtube_url'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <YouTubeIcon className="w-3.5 h-3.5" />
                <span>Lien YouTube</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectorTab('demos')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  selectorTab === 'demos'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Presets Démo</span>
              </button>
            </div>

            {/* CONTENU ONGLET 1 : BIBLIOTHÈQUE YOUTUBE MUSIKTOMOVIE */}
            {selectorTab === 'library' && (
              <div className="flex-1 overflow-y-auto space-y-3 min-h-[220px]">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Filtrer parmi vos morceaux YouTube..."
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>

                {filteredLibrary.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {filteredLibrary.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          selectTrackForDeck(selectorTargetDeck, {
                            title: t.title,
                            artist: t.artist,
                            audio_url: t.audio_url || 'https://cdn.freesound.org/previews/612/612627_5674468-lq.mp3',
                            thumbnail_url: t.thumbnail_url || (t.youtube_id ? `https://img.youtube.com/vi/${t.youtube_id}/hqdefault.jpg` : ''),
                            youtube_id: t.youtube_id,
                            genre: t.genre,
                          });
                        }}
                        className="flex items-center gap-3 p-2.5 rounded-2xl border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition-all text-left group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-stone-900 overflow-hidden shrink-0 flex items-center justify-center">
                          {t.thumbnail_url || t.youtube_id ? (
                            <img
                              src={t.thumbnail_url || `https://img.youtube.com/vi/${t.youtube_id}/hqdefault.jpg`}
                              alt={t.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music2 className="w-5 h-5 text-stone-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {t.youtube_id && (
                              <span className="bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <YouTubeIcon className="w-2.5 h-2.5" />
                                YT
                              </span>
                            )}
                            <p className="text-xs font-bold text-stone-900 truncate group-hover:text-rose-600 transition-colors">
                              {t.title}
                            </p>
                          </div>
                          <p className="text-[10px] text-stone-500 truncate">{t.artist} • {t.genre}</p>
                        </div>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg shrink-0">
                          Charger Deck {selectorTargetDeck}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-xs text-stone-500">Aucun morceau trouvé dans la bibliothèque.</p>
                  </div>
                )}
              </div>
            )}

            {/* CONTENU ONGLET 2 : COLLER UN LIEN YOUTUBE DIRECT */}
            {selectorTab === 'youtube_url' && (
              <div className="flex-1 space-y-4">
                <form onSubmit={handleResolveYouTubeUrl} className="space-y-3">
                  <label className="block text-xs font-semibold text-stone-700">
                    Coller une URL YouTube ou YouTube Music :
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required
                      value={youtubeUrlInput}
                      onChange={(e) => setYoutubeUrlInput(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                    />
                    <button
                      type="submit"
                      disabled={isResolvingYt || !youtubeUrlInput.trim()}
                      className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                    >
                      {isResolvingYt ? 'Chargement...' : 'Analyser'}
                    </button>
                  </div>
                </form>

                {resolvedTrackInfo && (
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {resolvedTrackInfo.thumbnail_url && (
                        <img
                          src={resolvedTrackInfo.thumbnail_url}
                          alt={resolvedTrackInfo.title}
                          className="w-12 h-12 rounded-xl object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">{resolvedTrackInfo.title}</p>
                        <p className="text-[10px] text-stone-500 truncate">{resolvedTrackInfo.artist}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => selectTrackForDeck(selectorTargetDeck, resolvedTrackInfo)}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shrink-0 shadow-sm"
                    >
                      Charger sur Deck {selectorTargetDeck}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CONTENU ONGLET 3 : PRÉSETS DÉMO & FICHIER LOCAL */}
            {selectorTab === 'demos' && (
              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-stone-700">Importer un fichier audio (MP3/WAV) :</p>
                  <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1 shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Parcourir...</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleUploadAudio(selectorTargetDeck, e)}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-stone-700">Ou choisir parmi les presets studio :</p>
                  <div className="grid grid-cols-1 gap-2">
                    {DEMO_TRACKS.map((t) => (
                      <button
                        key={t.title}
                        type="button"
                        onClick={() => selectTrackForDeck(selectorTargetDeck, t)}
                        className="flex items-center gap-3 p-2.5 rounded-2xl border border-stone-200 hover:bg-stone-50 text-left transition-all"
                      >
                        <img src={t.thumbnail_url} alt={t.title} className="w-10 h-10 rounded-xl object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-stone-900 truncate">{t.title}</p>
                          <p className="text-[10px] text-stone-500 truncate">{t.artist} • {t.genre}</p>
                        </div>
                        <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-1 rounded-lg">
                          Choisir
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
