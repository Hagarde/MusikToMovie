import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Save, 
  Music2, 
  Disc, 
  Sliders, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Clock, 
  Check, 
  Share2,
  Search,
  X,
  FolderArchive,
  Terminal,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  FileAudio
} from 'lucide-react';
import { Track, MusikToMusikProject, StemMixConfig, StemSourceChoice, StemType, MashupTrackInfo, GENRES } from '../../lib/types';
import { MashupAudioEngine, HDSeparatedStems } from '../../lib/stemEngine';
import { createMusikToMusikProject } from '../../lib/supabase';

interface MusikToMusikStudioProps {
  onBack: () => void;
  onProjectSaved: (newProject: MusikToMusikProject) => void;
  libraryTracks?: Track[];
}

// Morceaux de démo par défaut
const DEFAULT_DEMO_TRACKS: (MashupTrackInfo & { genre?: string })[] = [
  {
    title: 'Time (Inception Soundtrack)',
    artist: 'Hans Zimmer',
    audio_url: '',
    youtube_id: 'RxabLA7UQ9k',
    thumbnail_url: 'https://img.youtube.com/vi/RxabLA7UQ9k/hqdefault.jpg',
    genre: 'Cinématique',
  },
  {
    title: 'Blade Runner 2049 (Synth Atmosphere)',
    artist: 'Hans Zimmer & Vangelis',
    audio_url: '',
    youtube_id: 's36eQwgPNSE',
    thumbnail_url: 'https://img.youtube.com/vi/s36eQwgPNSE/hqdefault.jpg',
    genre: 'Cyberpunk',
  },
  {
    title: 'Interstellar - Main Theme',
    artist: 'Hans Zimmer',
    audio_url: '',
    youtube_id: 'UDVtMYqUAyw',
    thumbnail_url: 'https://img.youtube.com/vi/UDVtMYqUAyw/hqdefault.jpg',
    genre: 'Science-Fiction',
  },
  {
    title: 'The Dark Knight - Action Beat',
    artist: 'Hans Zimmer',
    audio_url: '',
    youtube_id: '2r1pP294t44',
    thumbnail_url: 'https://img.youtube.com/vi/2r1pP294t44/hqdefault.jpg',
    genre: 'Thriller',
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
  // Morceau A (Deck A) & Morceau B (Deck B)
  const [trackA, setTrackA] = useState<MashupTrackInfo & { genre?: string }>(DEFAULT_DEMO_TRACKS[0]);
  const [trackB, setTrackB] = useState<MashupTrackInfo & { genre?: string }>(DEFAULT_DEMO_TRACKS[1]);

  // Stems séparés Haute Définition (Demucs v4)
  const [hdStemsA, setHdStemsA] = useState<HDSeparatedStems | null>(null);
  const [hdStemsB, setHdStemsB] = useState<HDSeparatedStems | null>(null);

  // Guide déroulant des étapes
  const [showGuideDetails, setShowGuideDetails] = useState<boolean>(false);

  // Modal de sélection de Morceau dans la bibliothèque
  const [selectorTargetDeck, setSelectorTargetDeck] = useState<'A' | 'B' | null>(null);
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

  // Drag & Drop visuel
  const [isDraggingA, setIsDraggingA] = useState<boolean>(false);
  const [isDraggingB, setIsDraggingB] = useState<boolean>(false);

  // Modale dédiée d'import de Pack 4 Stems (Demucs v4)
  const [showStemsPackModal, setShowStemsPackModal] = useState<'A' | 'B' | null>(null);
  const [stemsPackVocals, setStemsPackVocals] = useState<File | null>(null);
  const [stemsPackDrums, setStemsPackDrums] = useState<File | null>(null);
  const [stemsPackBass, setStemsPackBass] = useState<File | null>(null);
  const [stemsPackMelody, setStemsPackMelody] = useState<File | null>(null);
  const [stemsPackTitle, setStemsPackTitle] = useState<string>('');

  // Moteur Audio DSP Web Audio
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

  // Détection automatique des 4 fichiers dans un pack
  const handleStemsPackFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    let titleGuess = '';
    for (const f of files) {
      const name = f.name.toLowerCase();
      if (!titleGuess && f.name.length > 8 && !['vocals.wav', 'drums.wav', 'bass.wav', 'melody.wav', 'other.wav'].includes(name)) {
        titleGuess = f.name.replace(/\.[^/.]+$/, '').replace(/[_-](vocals|drums|bass|other|melody)/i, '');
      }
      if (name.includes('voc') || name.includes('chant') || name.includes('acapella') || name.includes('lead')) {
        setStemsPackVocals(f);
      } else if (name.includes('drum') || name.includes('beat') || name.includes('percu') || name.includes('batterie')) {
        setStemsPackDrums(f);
      } else if (name.includes('bass') || name.includes('basse') || name.includes('sub')) {
        setStemsPackBass(f);
      } else if (name.includes('melod') || name.includes('other') || name.includes('inst') || name.includes('guitar') || name.includes('synth')) {
        setStemsPackMelody(f);
      }
    }
    if (titleGuess && !stemsPackTitle) {
      setStemsPackTitle(titleGuess);
    }
  };

  // Application du Pack 4 Stems sur le Deck ciblé
  const handleApplyStemsPack = () => {
    if (!showStemsPackModal) return;
    const deck = showStemsPackModal;
    const vocUrl = stemsPackVocals ? URL.createObjectURL(stemsPackVocals) : '';
    const drmUrl = stemsPackDrums ? URL.createObjectURL(stemsPackDrums) : '';
    const basUrl = stemsPackBass ? URL.createObjectURL(stemsPackBass) : '';
    const melUrl = stemsPackMelody ? URL.createObjectURL(stemsPackMelody) : '';

    const fallbackUrl = vocUrl || drmUrl || basUrl || melUrl;
    if (!fallbackUrl) {
      alert('Veuillez sélectionner au moins 1 fichier audio pour le pack de stems.');
      return;
    }

    const stems: HDSeparatedStems = {
      vocalsUrl: vocUrl || fallbackUrl,
      drumsUrl: drmUrl || fallbackUrl,
      bassUrl: basUrl || fallbackUrl,
      melodyUrl: melUrl || fallbackUrl,
      duration: 180,
    };

    const finalTitle = stemsPackTitle.trim() || (deck === 'A' ? 'Deck A (Stems Demucs v4)' : 'Deck B (Stems Demucs v4)');

    const customTrack: MashupTrackInfo & { genre?: string } = {
      title: finalTitle,
      artist: 'Demucs v4 (Studio Pro)',
      audio_url: stems.vocalsUrl,
      thumbnail_url: '',
      genre: 'Stems Pro',
    };

    if (deck === 'A') {
      setTrackA(customTrack);
      setHdStemsA(stems);
      if (engineRef.current) engineRef.current.loadHDStems(stems, hdStemsB, stemConfig);
    } else {
      setTrackB(customTrack);
      setHdStemsB(stems);
      if (engineRef.current) engineRef.current.loadHDStems(hdStemsA, stems, stemConfig);
    }

    setShowStemsPackModal(null);
    setStemsPackVocals(null);
    setStemsPackDrums(null);
    setStemsPackBass(null);
    setStemsPackMelody(null);
    setStemsPackTitle('');
  };

  // Traitement direct par Drag & Drop sur un Deck
  const processImportedFiles = (deck: 'A' | 'B', fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    if (files.length > 1) {
      let vocUrl = '', drmUrl = '', basUrl = '', melUrl = '';
      for (const f of files) {
        const name = f.name.toLowerCase();
        const url = URL.createObjectURL(f);
        if (name.includes('voc') || name.includes('chant') || name.includes('acapella') || name.includes('lead')) {
          vocUrl = url;
        } else if (name.includes('drum') || name.includes('beat') || name.includes('percu') || name.includes('batterie')) {
          drmUrl = url;
        } else if (name.includes('bass') || name.includes('basse') || name.includes('sub')) {
          basUrl = url;
        } else if (name.includes('melod') || name.includes('other') || name.includes('inst') || name.includes('guitar') || name.includes('synth')) {
          melUrl = url;
        }
      }

      if (vocUrl || drmUrl || basUrl || melUrl) {
        const stems: HDSeparatedStems = {
          vocalsUrl: vocUrl || drmUrl || basUrl || melUrl,
          drumsUrl: drmUrl || vocUrl || basUrl || melUrl,
          bassUrl: basUrl || vocUrl || drmUrl || melUrl,
          melodyUrl: melUrl || vocUrl || drmUrl || basUrl,
          duration: 180,
        };

        const customTrack: MashupTrackInfo & { genre?: string } = {
          title: files[0].name.replace(/\.[^/.]+$/, '').replace(/[_-](vocals|drums|bass|other|melody)/i, '') || (deck === 'A' ? 'Deck A (Stems Pro)' : 'Deck B (Stems Pro)'),
          artist: 'Demucs v4 (Studio Pro)',
          audio_url: stems.vocalsUrl,
          thumbnail_url: '',
          genre: 'Stems Pro',
        };

        if (deck === 'A') {
          setTrackA(customTrack);
          setHdStemsA(stems);
          if (engineRef.current) engineRef.current.loadHDStems(stems, hdStemsB, stemConfig);
        } else {
          setTrackB(customTrack);
          setHdStemsB(stems);
          if (engineRef.current) engineRef.current.loadHDStems(hdStemsA, stems, stemConfig);
        }
        return;
      }
    }

    // Fichier unique glissé
    const file = files[0];
    const objectUrl = URL.createObjectURL(file);
    const customTrack: MashupTrackInfo & { genre?: string } = {
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Fichier Audio Local',
      audio_url: objectUrl,
      thumbnail_url: '',
      genre: file.name.split('.').pop()?.toUpperCase() || 'Audio',
    };
    selectTrackForDeck(deck, customTrack);
  };

  const handleDropAudio = (deck: 'A' | 'B', e: React.DragEvent) => {
    e.preventDefault();
    if (deck === 'A') setIsDraggingA(false);
    else setIsDraggingB(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImportedFiles(deck, e.dataTransfer.files);
    }
  };

  // Charger une piste standard dans l'AudioEngine
  const selectTrackForDeck = async (deck: 'A' | 'B', track: MashupTrackInfo & { genre?: string }) => {
    if (deck === 'A') {
      setTrackA(track);
      setHdStemsA(null);
      if (track.audio_url && engineRef.current) {
        engineRef.current.loadDecks(track.audio_url, trackB.audio_url || '', stemConfig);
      }
    } else {
      setTrackB(track);
      setHdStemsB(null);
      if (track.audio_url && engineRef.current) {
        engineRef.current.loadDecks(trackA.audio_url || '', track.audio_url, stemConfig);
      }
    }
  };

  // Synchronisation des Faders et Volumes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.applyStemConfig(stemConfig);
    }
  }, [stemConfig, hdStemsA, hdStemsB]);

  // Vitesse Deck B
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSpeedB(speedRatioB);
    }
  }, [speedRatioB]);

  // Offset Deck B
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setOffsetB(offsetSecondsB);
    }
  }, [offsetSecondsB]);

  // Visualiseur Canvas Master
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
  const togglePlay = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    if (nextPlaying) {
      if (engineRef.current) engineRef.current.play();
    } else {
      if (engineRef.current) engineRef.current.pause();
    }
  };

  // Enregistrement Audio Master
  const toggleRecord = async () => {
    if (!isRecordingMashup) {
      if (engineRef.current) {
        engineRef.current.startRecording();
        setIsRecordingMashup(true);
        setRecordSeconds(0);
        recordIntervalRef.current = setInterval(() => {
          setRecordSeconds((s) => s + 1);
        }, 1000);
        if (!isPlaying) togglePlay();
      }
    } else {
      if (engineRef.current) {
        const base64Wav = await engineRef.current.stopRecording();
        setIsRecordingMashup(false);
        if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
        if (base64Wav) {
          setRecordedAudioBase64(base64Wav);
        }
      }
    }
  };

  // Modification Matrice de Stems
  const handleStemSourceChange = (stem: StemType, source: StemSourceChoice) => {
    setStemConfig((prev) => ({
      ...prev,
      [stem]: { ...prev[stem], source },
    }));
  };

  const handleStemMuteToggle = (stem: StemType) => {
    setStemConfig((prev) => ({
      ...prev,
      [stem]: { ...prev[stem], isMuted: !prev[stem].isMuted },
    }));
  };

  const handleStemVolumeChange = (stem: StemType, deck: 'A' | 'B', volume: number) => {
    setStemConfig((prev) => ({
      ...prev,
      [stem]: {
        ...prev[stem],
        [deck === 'A' ? 'volumeA' : 'volumeB']: volume,
      },
    }));
  };

  // Sauvegarde & Publication
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !creatorName.trim()) {
      alert('Veuillez renseigner un titre et votre pseudo.');
      return;
    }

    setIsSaving(true);
    try {
      const newProject = await createMusikToMusikProject({
        title: title.trim(),
        description: description.trim(),
        creator_name: creatorName.trim(),
        genre,
        trackA: {
          title: trackA.title,
          artist: trackA.artist,
          audio_url: trackA.audio_url,
          youtube_id: trackA.youtube_id,
          thumbnail_url: trackA.thumbnail_url,
          genre: trackA.genre,
        },
        trackB: {
          title: trackB.title,
          artist: trackB.artist,
          audio_url: trackB.audio_url,
          youtube_id: trackB.youtube_id,
          thumbnail_url: trackB.thumbnail_url,
          genre: trackB.genre,
        },
        stem_config: stemConfig,
        speed_ratio_B: speedRatioB,
        offset_seconds_B: offsetSecondsB,
        duration: 180,
        recorded_audio_data: recordedAudioBase64 || undefined,
      });

      if (newProject) {
        onProjectSaved(newProject);
      }
    } catch (err: any) {
      console.error(err);
      alert('Erreur lors de la publication du projet.');
    } finally {
      setIsSaving(false);
    }
  };

  const stemsList: { id: StemType; label: string; icon: string; desc: string }[] = [
    { id: 'vocals', label: 'Voix & Chants', icon: '🎤', desc: 'Acapella Studio' },
    { id: 'drums', label: 'Batterie & Beat', icon: '🥁', desc: 'Kick, Snare, Hi-hats' },
    { id: 'bass', label: 'Ligne de Basse', icon: '🎸', desc: 'Sub-bass & 808' },
    { id: 'melody', label: 'Mélodie & Synthés', icon: '🎹', desc: 'Guitares, pianos, pads' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {/* 1. HEADER DU STUDIO ÉPURÉ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-2xl hover:bg-stone-100 text-stone-600 transition-colors"
            title="Retour à la galerie"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-rose-500 to-violet-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Demucs v4
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-stone-900 font-display">
                Studio de Mixage Stems
              </h1>
            </div>
            <p className="text-xs text-stone-500">
              Contrôlez indépendamment les 4 pistes isolées (Voix, Batterie, Basse, Mélodie)
            </p>
          </div>
        </div>

        {/* Master Transport & Enregistrement */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={togglePlay}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
                : 'bg-stone-900 hover:bg-black text-white shadow-stone-900/25'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'LECTURE MASTER'}</span>
          </button>

          <button
            type="button"
            onClick={toggleRecord}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all border cursor-pointer ${
              isRecordingMashup
                ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-md shadow-red-600/30'
                : recordedAudioBase64
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isRecordingMashup ? 'bg-white' : 'bg-red-500'}`} />
            <span>
              {isRecordingMashup
                ? `REC (${recordSeconds}s)`
                : recordedAudioBase64
                ? 'Master Capturé ✅'
                : 'Enregistrer'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. BANNIÈRE WORKFLOW COMPACTE */}
      <div className="bg-stone-900 text-white p-4 sm:p-5 rounded-3xl border border-stone-800 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowGuideDetails(!showGuideDetails)}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                Comment extraire et charger vos stems ?
              </h2>
              <p className="text-[11px] text-stone-400">
                1 double-clic sur <code className="text-emerald-400 font-mono">extraire_pistes.bat</code> génère vos 4 fichiers WAV.
              </p>
            </div>
          </div>
          <button className="text-stone-400 hover:text-white p-1 rounded-lg">
            {showGuideDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showGuideDetails && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 mt-3 border-t border-stone-800 text-xs animate-in fade-in">
            <div className="bg-stone-950/80 p-3 rounded-2xl border border-stone-800 space-y-1">
              <div className="text-emerald-400 font-extrabold text-xs flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">1</span>
                Extraire en Local
              </div>
              <p className="text-stone-300 text-[11px]">
                Lancez <code className="text-emerald-300 font-mono">extraire_pistes.bat</code> et entrez un lien YouTube ou MP3.
              </p>
            </div>

            <div className="bg-stone-950/80 p-3 rounded-2xl border border-stone-800 space-y-1">
              <div className="text-rose-400 font-extrabold text-xs flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 flex items-center justify-center text-[10px]">2</span>
                Charger les Stems
              </div>
              <p className="text-stone-300 text-[11px]">
                Glissez les 4 fichiers WAV d'un coup sur le Deck A ou le Deck B.
              </p>
            </div>

            <div className="bg-stone-950/80 p-3 rounded-2xl border border-stone-800 space-y-1">
              <div className="text-violet-400 font-extrabold text-xs flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px]">3</span>
                Mixer & Exporter
              </div>
              <p className="text-stone-300 text-[11px]">
                Ajustez les faders, callez le tempo et enregistrez le résultat final !
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. LES 2 PLATINES (DECK A & DECK B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* DECK A */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingA(true); }}
          onDragLeave={() => setIsDraggingA(false)}
          onDrop={(e) => handleDropAudio('A', e)}
          className={`bg-white rounded-3xl p-5 border-2 transition-all space-y-3.5 relative overflow-hidden ${
            isDraggingA ? 'border-rose-500 bg-rose-50/60 ring-4 ring-rose-200' : 'border-rose-200 shadow-sm'
          }`}
        >
          {isDraggingA && (
            <div className="absolute inset-0 bg-rose-600/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white font-black text-sm p-4 text-center animate-in fade-in">
              <UploadCloud className="w-8 h-8 mb-1 animate-bounce" />
              <p>Déposez vos fichiers audio / stems pour le Deck A !</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                A
              </span>
              <h3 className="font-extrabold text-sm text-stone-900 font-display">
                Deck A
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectorTargetDeck('A')}
              className="text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Music2 className="w-3.5 h-3.5 text-stone-500" />
              <span>Bibliothèque</span>
            </button>
          </div>

          {/* Morceau sélectionné A */}
          <div className="p-3 bg-stone-900 text-white rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Disc className="w-7 h-7 text-rose-400 animate-spin shrink-0" style={{ animationDuration: isPlaying ? '3s' : '0s' }} />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-white">{trackA.title}</p>
                <p className="text-[10px] text-stone-400 truncate">{trackA.artist}</p>
              </div>
            </div>
            {hdStemsA ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                4 Stems Actifs ✅
              </span>
            ) : (
              <span className="text-[10px] text-stone-400 bg-stone-800 px-2 py-0.5 rounded-full shrink-0">
                Audio Standard
              </span>
            )}
          </div>

          {/* Bouton Principal : Importer Pack 4 Stems */}
          <button
            type="button"
            onClick={() => setShowStemsPackModal('A')}
            className="w-full text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <FolderArchive className="w-4 h-4" />
            <span>📦 Importer le Pack 4 Stems (Demucs v4)</span>
          </button>
        </div>

        {/* DECK B */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingB(true); }}
          onDragLeave={() => setIsDraggingB(false)}
          onDrop={(e) => handleDropAudio('B', e)}
          className={`bg-white rounded-3xl p-5 border-2 transition-all space-y-3.5 relative overflow-hidden ${
            isDraggingB ? 'border-violet-500 bg-violet-50/60 ring-4 ring-violet-200' : 'border-violet-200 shadow-sm'
          }`}
        >
          {isDraggingB && (
            <div className="absolute inset-0 bg-violet-600/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white font-black text-sm p-4 text-center animate-in fade-in">
              <UploadCloud className="w-8 h-8 mb-1 animate-bounce" />
              <p>Déposez vos fichiers audio / stems pour le Deck B !</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                B
              </span>
              <h3 className="font-extrabold text-sm text-stone-900 font-display">
                Deck B
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectorTargetDeck('B')}
              className="text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Music2 className="w-3.5 h-3.5 text-stone-500" />
              <span>Bibliothèque</span>
            </button>
          </div>

          {/* Morceau sélectionné B */}
          <div className="p-3 bg-stone-900 text-white rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Disc className="w-7 h-7 text-violet-400 animate-spin shrink-0" style={{ animationDuration: isPlaying ? `${3 / speedRatioB}s` : '0s' }} />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-white">{trackB.title}</p>
                <p className="text-[10px] text-stone-400 truncate">{trackB.artist}</p>
              </div>
            </div>
            {hdStemsB ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                4 Stems Actifs ✅
              </span>
            ) : (
              <span className="text-[10px] text-stone-400 bg-stone-800 px-2 py-0.5 rounded-full shrink-0">
                Audio Standard
              </span>
            )}
          </div>

          {/* Bouton Principal : Importer Pack 4 Stems */}
          <button
            type="button"
            onClick={() => setShowStemsPackModal('B')}
            className="w-full text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <FolderArchive className="w-4 h-4" />
            <span>📦 Importer le Pack 4 Stems (Demucs v4)</span>
          </button>
        </div>
      </div>

      {/* 4. MATRICE DE MIXAGE CHIRURGICALE DES 4 STEMS */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-md">
              <Sliders className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-stone-900 font-display">
                Matrice de Mixage Stems (4 Pistes)
              </h2>
              <p className="text-[11px] text-stone-500">
                Assignez chaque instrument au Deck A, Deck B ou à la Fusion
              </p>
            </div>
          </div>
        </div>

        {/* Grille des 4 Faders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {stemsList.map((stem) => {
            const conf = stemConfig[stem.id];
            return (
              <div
                key={stem.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  conf.isMuted
                    ? 'bg-stone-50 border-stone-200 opacity-60'
                    : 'bg-white border-stone-200 shadow-sm hover:border-stone-400'
                }`}
              >
                {/* Header du Stem */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{stem.icon}</span>
                    <div>
                      <p className="text-xs font-black text-stone-900">{stem.label}</p>
                      <p className="text-[10px] text-stone-400">{stem.desc}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStemMuteToggle(stem.id)}
                    className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                      conf.isMuted ? 'bg-red-100 text-red-700' : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                    }`}
                    title={conf.isMuted ? 'Activer la piste' : 'Mute'}
                  >
                    {conf.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Sélecteur de Source A / B / Both */}
                <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-xl text-[10px] font-extrabold text-center">
                  <button
                    type="button"
                    onClick={() => handleStemSourceChange(stem.id, 'A')}
                    className={`py-1 rounded-lg transition-all cursor-pointer ${
                      conf.source === 'A' ? 'bg-rose-600 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Deck A
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStemSourceChange(stem.id, 'both')}
                    className={`py-1 rounded-lg transition-all cursor-pointer ${
                      conf.source === 'both' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Fusion
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStemSourceChange(stem.id, 'B')}
                    className={`py-1 rounded-lg transition-all cursor-pointer ${
                      conf.source === 'B' ? 'bg-violet-600 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Deck B
                  </button>
                </div>

                {/* Slider Volume */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-stone-500">
                    <span>Volume</span>
                    <span>{Math.round(conf.volumeA * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={conf.source === 'B' ? conf.volumeB : conf.volumeA}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleStemVolumeChange(stem.id, 'A', val);
                      handleStemVolumeChange(stem.id, 'B', val);
                    }}
                    className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. CALAGE TEMPO & SPECTROGRAMME */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calage Tempo Deck B */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-stone-900">
              Calage Tempo (Deck B)
            </h3>
          </div>
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs font-mono text-stone-600 mb-1">
                <span>Vitesse</span>
                <span className="font-bold text-violet-700">{speedRatioB.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.01"
                value={speedRatioB}
                onChange={(e) => setSpeedRatioB(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
            <button
              type="button"
              onClick={() => setSpeedRatioB(1.0)}
              className="w-full py-1 text-[10px] font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              Reset Tempo (1.00x)
            </button>
          </div>
        </div>

        {/* Visualiseur Master */}
        <div className="lg:col-span-2 bg-stone-950 rounded-3xl p-5 border border-stone-800 shadow-sm space-y-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>SPECTROGRAMME MASTER DSP</span>
            </div>
            <span className="text-[10px] font-mono text-stone-400">44.1 kHz • Temps Réel</span>
          </div>

          <div className="h-16 w-full bg-stone-900/60 rounded-2xl overflow-hidden border border-stone-800 flex items-center justify-center">
            <canvas ref={canvasRef} width={600} height={64} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* 6. FORMULAIRE DE PUBLICATION */}
      <form onSubmit={handleSaveProject} className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-violet-600 text-white flex items-center justify-center shadow-md">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-stone-900 font-display">
              Publier le Mashup dans la Galerie
            </h2>
            <p className="text-[11px] text-stone-500">
              Partagez votre création avec la communauté
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Titre du Mashup *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Inception x Blade Runner"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Votre Pseudo DJ *
            </label>
            <input
              type="text"
              required
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="Ex: DJ Zimmer"
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
            Note de Mixage & Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Détails du mix..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2 text-xs text-stone-900 focus:outline-none focus:border-stone-900 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving || !title.trim() || !creatorName.trim()}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white font-extrabold text-xs sm:text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Publication en cours...' : '🚀 Sauvegarder & Partager dans la Galerie'}</span>
        </button>
      </form>

      {/* 📦 MODALE D'IMPORTATION PACK 4 STEMS DEMUCS V4 */}
      {showStemsPackModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-stone-950 border-2 border-emerald-500/50 rounded-3xl max-w-lg w-full p-5 text-white shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowStemsPackModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <FolderArchive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white font-display">
                  Importer un Pack 4 Stems (Deck {showStemsPackModal})
                </h3>
                <p className="text-[11px] text-stone-400">
                  Issu du script <code className="text-emerald-300 font-mono">extraire_pistes.bat</code>
                </p>
              </div>
            </div>

            {/* Zone de Dépôt Global */}
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleStemsPackFiles(e.dataTransfer.files);
                }
              }}
              className="border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-1"
            >
              <UploadCloud className="w-6 h-6 text-emerald-400 animate-bounce" />
              <p className="text-xs font-bold text-white">
                📂 Déposez vos 4 fichiers WAV d'un coup ici (ou cliquez)
              </p>
              <p className="text-[10px] text-emerald-300/70">
                Auto-détection : vocals.wav, drums.wav, bass.wav, melody.wav
              </p>
              <input
                type="file"
                multiple
                accept="audio/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleStemsPackFiles(e.target.files);
                  }
                }}
                className="hidden"
              />
            </label>

            {/* Titre */}
            <div>
              <label className="block text-[11px] font-bold text-stone-300 mb-1">
                Titre du Morceau
              </label>
              <input
                type="text"
                value={stemsPackTitle}
                onChange={(e) => setStemsPackTitle(e.target.value)}
                placeholder="Ex: Titre du son (Demucs)"
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 4 Cartes de Statut des Stems */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${stemsPackVocals ? 'bg-rose-950/40 border-rose-600/60 text-white' : 'bg-stone-900 border-stone-800 text-stone-400'}`}>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-rose-400">🎤 Voix</p>
                  <p className="text-[10px] truncate">{stemsPackVocals ? stemsPackVocals.name : 'En attente...'}</p>
                </div>
                <label className="text-[10px] font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 px-2 py-0.5 rounded cursor-pointer shrink-0">
                  <span>{stemsPackVocals ? 'OK' : 'Choisir'}</span>
                  <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setStemsPackVocals(e.target.files[0])} className="hidden" />
                </label>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${stemsPackDrums ? 'bg-orange-950/40 border-orange-600/60 text-white' : 'bg-stone-900 border-stone-800 text-stone-400'}`}>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-orange-400">🥁 Drums</p>
                  <p className="text-[10px] truncate">{stemsPackDrums ? stemsPackDrums.name : 'En attente...'}</p>
                </div>
                <label className="text-[10px] font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 px-2 py-0.5 rounded cursor-pointer shrink-0">
                  <span>{stemsPackDrums ? 'OK' : 'Choisir'}</span>
                  <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setStemsPackDrums(e.target.files[0])} className="hidden" />
                </label>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${stemsPackBass ? 'bg-amber-950/40 border-amber-600/60 text-white' : 'bg-stone-900 border-stone-800 text-stone-400'}`}>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-amber-400">🎸 Basse</p>
                  <p className="text-[10px] truncate">{stemsPackBass ? stemsPackBass.name : 'En attente...'}</p>
                </div>
                <label className="text-[10px] font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 px-2 py-0.5 rounded cursor-pointer shrink-0">
                  <span>{stemsPackBass ? 'OK' : 'Choisir'}</span>
                  <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setStemsPackBass(e.target.files[0])} className="hidden" />
                </label>
              </div>

              <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${stemsPackMelody ? 'bg-emerald-950/40 border-emerald-600/60 text-white' : 'bg-stone-900 border-stone-800 text-stone-400'}`}>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-emerald-400">🎹 Mélodie</p>
                  <p className="text-[10px] truncate">{stemsPackMelody ? stemsPackMelody.name : 'En attente...'}</p>
                </div>
                <label className="text-[10px] font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 px-2 py-0.5 rounded cursor-pointer shrink-0">
                  <span>{stemsPackMelody ? 'OK' : 'Choisir'}</span>
                  <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setStemsPackMelody(e.target.files[0])} className="hidden" />
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyStemsPack}
              disabled={!stemsPackVocals && !stemsPackDrums && !stemsPackBass && !stemsPackMelody}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Valider & Charger sur le Deck {showStemsPackModal}</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. MODALE DE SÉLECTION DANS LA BIBLIOTHÈQUE */}
      {selectorTargetDeck && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-stone-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full text-white font-black text-xs flex items-center justify-center ${
                  selectorTargetDeck === 'A' ? 'bg-rose-600' : 'bg-violet-600'
                }`}>
                  {selectorTargetDeck}
                </span>
                <h3 className="font-extrabold text-sm text-stone-900 font-display">
                  Sélectionner un Morceau (Deck {selectorTargetDeck})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectorTargetDeck(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recherche */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Rechercher parmi vos morceaux..."
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-stone-900"
              />
            </div>

            {/* Liste des Morceaux */}
            <div className="space-y-1.5 overflow-y-auto max-h-[50vh] pr-1">
              {(libraryTracks.length > 0 ? libraryTracks : DEFAULT_DEMO_TRACKS)
                .filter((t) => t.title.toLowerCase().includes(librarySearch.toLowerCase()) || (t.artist || '').toLowerCase().includes(librarySearch.toLowerCase()))
                .map((t) => (
                  <button
                    key={(t as any).id || t.title}
                    type="button"
                    onClick={() => {
                      selectTrackForDeck(selectorTargetDeck, {
                        title: t.title,
                        artist: t.artist || 'Artiste',
                        audio_url: t.audio_url,
                        genre: t.genre || 'Audio',
                      });
                      setSelectorTargetDeck(null);
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-stone-900 truncate group-hover:text-rose-600">{t.title}</p>
                      <p className="text-[10px] text-stone-400 truncate">{t.artist || 'Artiste'}</p>
                    </div>
                    <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-1 rounded-lg shrink-0">
                      Charger
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
