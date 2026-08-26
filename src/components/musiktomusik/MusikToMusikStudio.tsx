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
  RotateCcw, 
  Clock, 
  Check, 
  Shuffle, 
  Share2,
  Tv,
  Search,
  Link,
  X,
  Loader2,
  FolderArchive,
  Terminal,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Track, MusikToMusikProject, StemMixConfig, StemSourceChoice, StemType, MashupTrackInfo, GENRES } from '../../lib/types';
import { MashupAudioEngine, HDSeparatedStems } from '../../lib/stemEngine';
import { createMusikToMusikProject } from '../../lib/supabase';
import { resolveUniversalTrack, loadYouTubeAPI } from '../../lib/youtube';
import { YouTubeIcon } from '../icons/YouTubeIcon';

interface MusikToMusikStudioProps {
  onBack: () => void;
  onProjectSaved: (newProject: MusikToMusikProject) => void;
  libraryTracks?: Track[];
}

// Bibliothèque de pistes démo permanentes
const DEMO_TRACKS: (MashupTrackInfo & { genre?: string })[] = [
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
  // Morceau A (Deck A)
  const [trackA, setTrackA] = useState<MashupTrackInfo & { genre?: string }>(DEMO_TRACKS[0]);
  // Morceau B (Deck B)
  const [trackB, setTrackB] = useState<MashupTrackInfo & { genre?: string }>(DEMO_TRACKS[1]);

  // Stems séparés Haute Définition (Demucs v4)
  const [hdStemsA, setHdStemsA] = useState<HDSeparatedStems | null>(null);
  const [hdStemsB, setHdStemsB] = useState<HDSeparatedStems | null>(null);

  // Guide déroulant des étapes
  const [showGuideDetails, setShowGuideDetails] = useState<boolean>(true);

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

  // Drag & Drop
  const [isDraggingA, setIsDraggingA] = useState<boolean>(false);
  const [isDraggingB, setIsDraggingB] = useState<boolean>(false);

  // Modale dédiée d'import de Pack 4 Stems (Demucs v4)
  const [showStemsPackModal, setShowStemsPackModal] = useState<'A' | 'B' | null>(null);
  const [stemsPackVocals, setStemsPackVocals] = useState<File | null>(null);
  const [stemsPackDrums, setStemsPackDrums] = useState<File | null>(null);
  const [stemsPackBass, setStemsPackBass] = useState<File | null>(null);
  const [stemsPackMelody, setStemsPackMelody] = useState<File | null>(null);
  const [stemsPackTitle, setStemsPackTitle] = useState<string>('');

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

    const finalTitle = stemsPackTitle.trim() || 'Morceau Stems Pro (Demucs v4)';

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

  // Traitement universel des fichiers déposés directement sur un Deck
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
          title: files[0].name.replace(/\.[^/.]+$/, '').replace(/[_-](vocals|drums|bass|other|melody)/i, '') || 'Pack 4 Stems Demucs',
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

    // Fichier unique
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

  // YouTube IFrame Player refs
  const ytContainerRefA = useRef<HTMLDivElement | null>(null);
  const ytContainerRefB = useRef<HTMLDivElement | null>(null);
  const ytPlayerRefA = useRef<any>(null);
  const ytPlayerRefB = useRef<any>(null);

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

  // Initialisation YouTube Deck A
  useEffect(() => {
    if (!trackA.youtube_id) {
      if (ytPlayerRefA.current) {
        try { ytPlayerRefA.current.destroy(); } catch (_) {}
        ytPlayerRefA.current = null;
      }
      return;
    }

    let isCancelled = false;
    loadYouTubeAPI().then((YT) => {
      if (isCancelled || !ytContainerRefA.current) return;
      if (ytPlayerRefA.current) {
        try { ytPlayerRefA.current.destroy(); } catch (_) {}
      }

      ytPlayerRefA.current = new YT.Player(ytContainerRefA.current, {
        height: '100%',
        width: '100%',
        videoId: trackA.youtube_id,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (isPlaying && ytPlayerRefA.current) {
              ytPlayerRefA.current.playVideo();
            }
          },
        },
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [trackA.youtube_id]);

  // Initialisation YouTube Deck B
  useEffect(() => {
    if (!trackB.youtube_id) {
      if (ytPlayerRefB.current) {
        try { ytPlayerRefB.current.destroy(); } catch (_) {}
        ytPlayerRefB.current = null;
      }
      return;
    }

    let isCancelled = false;
    loadYouTubeAPI().then((YT) => {
      if (isCancelled || !ytContainerRefB.current) return;
      if (ytPlayerRefB.current) {
        try { ytPlayerRefB.current.destroy(); } catch (_) {}
      }

      ytPlayerRefB.current = new YT.Player(ytContainerRefB.current, {
        height: '100%',
        width: '100%',
        videoId: trackB.youtube_id,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (isPlaying && ytPlayerRefB.current) {
              ytPlayerRefB.current.playVideo();
            }
          },
        },
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [trackB.youtube_id]);

  // Charger pistes locales dans l'AudioEngine
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

  // Visualiseur Canvas
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
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    if (nextPlaying) {
      if (engineRef.current) engineRef.current.play();
      if (ytPlayerRefA.current && typeof ytPlayerRefA.current.playVideo === 'function') {
        ytPlayerRefA.current.playVideo();
      }
      if (ytPlayerRefB.current && typeof ytPlayerRefB.current.playVideo === 'function') {
        ytPlayerRefB.current.playVideo();
      }
    } else {
      if (engineRef.current) engineRef.current.pause();
      if (ytPlayerRefA.current && typeof ytPlayerRefA.current.pauseVideo === 'function') {
        ytPlayerRefA.current.pauseVideo();
      }
      if (ytPlayerRefB.current && typeof ytPlayerRefB.current.pauseVideo === 'function') {
        ytPlayerRefB.current.pauseVideo();
      }
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

  // Résolution d'un lien YouTube dans la modale
  const handleResolveYouTubeUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrlInput.trim() || !selectorTargetDeck) return;

    setIsResolvingYt(true);
    try {
      const resolved = await resolveUniversalTrack(youtubeUrlInput.trim());
      setResolvedTrackInfo({
        title: resolved.title,
        artist: resolved.artist,
        audio_url: '',
        youtube_id: resolved.youtubeId,
        thumbnail_url: resolved.thumbnail_url,
        genre: 'YouTube',
      });
    } catch (err) {
      console.error(err);
      alert('Impossible de résoudre cette vidéo YouTube.');
    } finally {
      setIsResolvingYt(false);
    }
  };

  const handleConfirmResolvedTrack = () => {
    if (!resolvedTrackInfo || !selectorTargetDeck) return;
    selectTrackForDeck(selectorTargetDeck, resolvedTrackInfo);
    setSelectorTargetDeck(null);
    setResolvedTrackInfo(null);
    setYoutubeUrlInput('');
  };

  // Sauvegarde & Partage
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

  const stemsList: { id: StemType; label: string; icon: string; color: string; desc: string }[] = [
    { id: 'vocals', label: 'Voix & Chants', icon: '🎤', color: 'rose', desc: 'Acapella de studio' },
    { id: 'drums', label: 'Batterie & Rythme', icon: '🥁', color: 'orange', desc: 'Kick, Snare, Hi-hats' },
    { id: 'bass', label: 'Ligne de Basse', icon: '🎸', color: 'amber', desc: 'Sub-bass & 808' },
    { id: 'melody', label: 'Mélodie & Synthés', icon: '🎹', color: 'emerald', desc: 'Guitares, pianos, pads' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {/* 1. HEADER DU STUDIO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-stone-200 shadow-sm">
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
                Demucs v4 HTDemucs
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-stone-900 font-display">
                Studio de Mixage Stems Pro
              </h1>
            </div>
            <p className="text-xs text-stone-500">
              Isolation chirurgicale 4 pistes sans bavure & Fusion Master
            </p>
          </div>
        </div>

        {/* Master Transport & Enregistrement */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={togglePlay}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
                : 'bg-gradient-to-r from-rose-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white shadow-rose-600/25'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? 'PAUSE MASTER' : 'LECTURE MASTER'}</span>
          </button>

          <button
            type="button"
            onClick={toggleRecord}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all border ${
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
                ? '✅ Master Capturé'
                : 'Enregistrer'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. 🚀 BANNIÈRE DU PROCESSUS EN 3 ÉTAPES CLAIRES */}
      <div className="bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-5 sm:p-6 rounded-3xl border border-stone-800 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowGuideDetails(!showGuideDetails)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black font-display text-white flex items-center gap-2">
                Le Processus Studio Pro en 3 Étapes
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                  100% Qualité Pure
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Comment séparer et charger vos musiques YouTube ou MP3 facilement
              </p>
            </div>
          </div>
          <button className="text-stone-400 hover:text-white p-1 rounded-lg">
            {showGuideDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {showGuideDetails && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5 mt-4 border-t border-stone-800 text-xs animate-in fade-in">
            {/* Étape 1 */}
            <div className="bg-stone-900/90 p-4 rounded-2xl border border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px] border border-emerald-500/40">1</span>
                <span>Extraire en Local (Demucs v4)</span>
              </div>
              <p className="text-stone-300 text-[11px] leading-relaxed">
                Double-cliquez sur <code className="text-emerald-300 font-mono bg-stone-950 px-1 py-0.5 rounded border border-stone-800">extraire_pistes.bat</code> à la racine du projet et collez votre lien YouTube (ou MP3).
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono bg-stone-950 p-2 rounded-xl border border-stone-800/80">
                <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Génère 4 fichiers WAV parfaits</span>
              </div>
            </div>

            {/* Étape 2 */}
            <div className="bg-stone-900/90 p-4 rounded-2xl border border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-extrabold text-xs">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center text-[11px] border border-rose-500/40">2</span>
                <span>Charger le Pack 4 Stems</span>
              </div>
              <p className="text-stone-300 text-[11px] leading-relaxed">
                Cliquez sur le bouton vert <strong className="text-white">📦 Pack 4 Stems</strong> sur le Deck A et le Deck B, puis déposez vos 4 fichiers WAV d'un coup.
              </p>
              <div className="text-[10px] text-stone-400 flex items-center gap-1">
                <span>🎤 vocals • 🥁 drums • 🎸 bass • 🎹 melody</span>
              </div>
            </div>

            {/* Étape 3 */}
            <div className="bg-stone-900/90 p-4 rounded-2xl border border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-violet-400 font-extrabold text-xs">
                <span className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-[11px] border border-violet-500/40">3</span>
                <span>Mixer & Sauvegarder</span>
              </div>
              <p className="text-stone-300 text-[11px] leading-relaxed">
                Ajustez les faders de chaque piste, activez Solo/Mute, callez le tempo et cliquez sur <strong className="text-white">Enregistrer</strong> pour exporter votre mashup !
              </p>
              <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Zéro bruit de fond, acapella sec</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. LES 2 PLATINES DJ (DECK A & DECK B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DECK A */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingA(true); }}
          onDragLeave={() => setIsDraggingA(false)}
          onDrop={(e) => handleDropAudio('A', e)}
          className={`bg-white rounded-3xl p-6 border-2 transition-all space-y-4 relative overflow-hidden ${
            isDraggingA ? 'border-rose-500 bg-rose-50/60 ring-4 ring-rose-200' : 'border-rose-200 shadow-sm'
          }`}
        >
          {isDraggingA && (
            <div className="absolute inset-0 bg-rose-600/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white font-black text-sm p-4 text-center animate-in fade-in">
              <Sparkles className="w-10 h-10 mb-2 animate-bounce" />
              <p>🎯 Déposez vos 4 fichiers WAV Demucs pour le Deck A !</p>
              <p className="text-xs font-normal text-rose-200 mt-1">Reconnaissance automatique Voix, Drums, Basse, Mélodie</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                A
              </span>
              <h3 className="font-extrabold text-sm text-stone-900 font-display">
                Deck A (Piste Acapella / Lead)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectorTargetDeck('A');
                setSelectorTab('library');
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm border border-rose-200"
            >
              <Music2 className="w-3.5 h-3.5" />
              <span>Changer Démo</span>
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
              {trackA.genre || 'Deck A'}
            </span>
          </div>

          {/* Bouton Principal : Importer Pack 4 Stems */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowStemsPackModal('A')}
              className="w-full text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <FolderArchive className="w-4 h-4" />
              <span>📦 Importer le Pack 4 Stems (Demucs v4)</span>
            </button>
          </div>

          {/* Badges d'état des 4 Stems Deck A */}
          {hdStemsA ? (
            <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] font-bold text-center">
              <div className="py-1 px-1.5 rounded-lg border bg-rose-50 text-rose-700 border-rose-200 flex items-center justify-center gap-1">
                <span>🎤 Voix</span>
              </div>
              <div className="py-1 px-1.5 rounded-lg border bg-orange-50 text-orange-700 border-orange-200 flex items-center justify-center gap-1">
                <span>🥁 Drums</span>
              </div>
              <div className="py-1 px-1.5 rounded-lg border bg-amber-50 text-amber-700 border-amber-200 flex items-center justify-center gap-1">
                <span>🎸 Basse</span>
              </div>
              <div className="py-1 px-1.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center justify-center gap-1">
                <span>🎹 Mélodie</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-center text-stone-500 pt-1">
              💡 Glissez vos 4 fichiers WAV directement sur cette carte pour charger les stems.
            </p>
          )}
        </div>

        {/* DECK B */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingB(true); }}
          onDragLeave={() => setIsDraggingB(false)}
          onDrop={(e) => handleDropAudio('B', e)}
          className={`bg-white rounded-3xl p-6 border-2 transition-all space-y-4 relative overflow-hidden ${
            isDraggingB ? 'border-violet-500 bg-violet-50/60 ring-4 ring-violet-200' : 'border-violet-200 shadow-sm'
          }`}
        >
          {isDraggingB && (
            <div className="absolute inset-0 bg-violet-600/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white font-black text-sm p-4 text-center animate-in fade-in">
              <Sparkles className="w-10 h-10 mb-2 animate-bounce" />
              <p>🎯 Déposez vos 4 fichiers WAV Demucs pour le Deck B !</p>
              <p className="text-xs font-normal text-violet-200 mt-1">Reconnaissance automatique Voix, Drums, Basse, Mélodie</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-violet-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                B
              </span>
              <h3 className="font-extrabold text-sm text-stone-900 font-display">
                Deck B (Piste Rythme / Beat)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectorTargetDeck('B');
                setSelectorTab('library');
              }}
              className="text-[11px] font-bold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm border border-violet-200"
            >
              <Music2 className="w-3.5 h-3.5" />
              <span>Changer Démo</span>
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
              {trackB.genre || 'Deck B'}
            </span>
          </div>

          {/* Bouton Principal : Importer Pack 4 Stems */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowStemsPackModal('B')}
              className="w-full text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <FolderArchive className="w-4 h-4" />
              <span>📦 Importer le Pack 4 Stems (Demucs v4)</span>
            </button>
          </div>

          {/* Badges d'état des 4 Stems Deck B */}
          {hdStemsB ? (
            <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] font-bold text-center">
              <div className="py-1 px-1.5 rounded-lg border bg-rose-50 text-rose-700 border-rose-200 flex items-center justify-center gap-1">
                <span>🎤 Voix</span>
              </div>
              <div className="py-1 px-1.5 rounded-lg border bg-orange-50 text-orange-700 border-orange-200 flex items-center justify-center gap-1">
                <span>🥁 Drums</span>
              </div>
              <div className="py-1 px-1.5 rounded-lg border bg-amber-50 text-amber-700 border-amber-200 flex items-center justify-center gap-1">
                <span>🎸 Basse</span>
              </div>
              <div className="py-1 px-1.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center justify-center gap-1">
                <span>🎹 Mélodie</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-center text-stone-500 pt-1">
              💡 Glissez vos 4 fichiers WAV directement sur cette carte pour charger les stems.
            </p>
          )}
        </div>
      </div>

      {/* 4. MATRICE DE MIXAGE CHIRURGICALE DES 4 STEMS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-md">
              <Sliders className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900 font-display">
                Matrice de Mixage Stems Pro (4 Pistes)
              </h2>
              <p className="text-xs text-stone-500">
                Ajustez les volumes indépendants et isolez les instruments
              </p>
            </div>
          </div>
        </div>

        {/* Grille des 4 Faders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stemsList.map((stem) => {
            const conf = stemConfig[stem.id];
            return (
              <div
                key={stem.id}
                className={`p-4 rounded-2xl border transition-all space-y-3.5 ${
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
                    className={`p-1.5 rounded-xl transition-colors ${
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
                    className={`py-1.5 rounded-lg transition-all ${
                      conf.source === 'A' ? 'bg-rose-600 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Deck A
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStemSourceChange(stem.id, 'both')}
                    className={`py-1.5 rounded-lg transition-all ${
                      conf.source === 'both' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Fusion
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStemSourceChange(stem.id, 'B')}
                    className={`py-1.5 rounded-lg transition-all ${
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

      {/* 5. CALAGE TEMPO & VISUALISEUR AUDIO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calage Tempo Deck B */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-stone-900">
              Synchronisation BPM (Deck B)
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono text-stone-600 mb-1">
                <span>Vitesse Lecture</span>
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
              className="w-full py-1.5 text-[10px] font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
            >
              Réinitialiser Tempo (1.00x)
            </button>
          </div>
        </div>

        {/* Visualiseur Master */}
        <div className="lg:col-span-2 bg-stone-950 rounded-3xl p-6 border border-stone-800 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white text-xs font-black">
              <Sparkles className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>SPECTROGRAMME MASTER DSP</span>
            </div>
            <span className="text-[10px] font-mono text-stone-400">44.1 kHz • Float32</span>
          </div>

          <div className="h-20 w-full bg-stone-900/60 rounded-2xl overflow-hidden border border-stone-800 flex items-center justify-center">
            <canvas ref={canvasRef} width={600} height={80} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* 6. FORMULAIRE DE SAUVEGARDE & PUBLICATION */}
      <form onSubmit={handleSaveProject} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-violet-600 text-white flex items-center justify-center shadow-md">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-stone-900 font-display">
              Publier le Mashup dans la Galerie
            </h2>
            <p className="text-xs text-stone-500">
              Partagez votre création avec la communauté MusikToMovie
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white font-extrabold text-xs sm:text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 hover:scale-[1.01] cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Publication en cours...' : '🚀 Sauvegarder & Partager dans la Galerie'}</span>
        </button>
      </form>

      {/* 📦 MODALE DÉDIÉE D'IMPORTATION DE PACK 4 STEMS DEMUCS V4 */}
      {showStemsPackModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-stone-950 border-2 border-emerald-500/50 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-5 relative">
            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={() => setShowStemsPackModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <FolderArchive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-display">
                  Importer un Pack 4 Stems (Deck {showStemsPackModal})
                </h3>
                <p className="text-xs text-stone-400">
                  Fichiers séparés avec le script <code className="text-emerald-300 font-mono">extraire_pistes.bat</code>
                </p>
              </div>
            </div>

            {/* Zone Principale de Dépôt Global des 4 Fichiers */}
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleStemsPackFiles(e.dataTransfer.files);
                }
              }}
              className="border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-1.5"
            >
              <Sparkles className="w-6 h-6 text-emerald-400 animate-bounce" />
              <p className="text-xs font-bold text-white">
                📂 Déposez vos 4 fichiers WAV d'un coup ici (ou cliquez pour parcourir)
              </p>
              <p className="text-[10px] text-emerald-300/70">
                Reconnaissance automatique : vocals.wav, drums.wav, bass.wav, melody.wav
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

            {/* Titre du Morceau */}
            <div>
              <label className="block text-[11px] font-bold text-stone-300 mb-1">
                Titre du Morceau
              </label>
              <input
                type="text"
                value={stemsPackTitle}
                onChange={(e) => setStemsPackTitle(e.target.value)}
                placeholder="Ex: Jaymee - Princes de la Ville (Demucs)"
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 4 Cartes de Statut des Stems */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Voix */}
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${stemsPackVocals ? 'bg-rose-950/40 border-rose-600/60 text-white' : 'bg-stone-900 border-stone-800 text-stone-400'}`}>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-rose-400">🎤 Voix (Vocals)</p>
                  <p className="text-[10px] truncate">{stemsPackVocals ? stemsPackVocals.name : 'En attente...'}</p>
                </div>
                <label className="text-[10px] font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 px-2 py-1 rounded-lg cursor-pointer shrink-0">
                  <span>{stemsPackVocals ? 'Modifier' : 'Choisir'}</span>
                  <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setStemsPackVocals(e.target.files[0])} className="hidden" />
                </label>
              </div>

              {/* Drums */}
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${stemsPackDrums ? 'bg-orange-950/40 border-orange-600/60 text-white' : 'bg-stone-900 border-stone-800 text-stone-400'}`}>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-orange-400">🥁 Batterie (Drums)</p>
                  <p className="text-[10px] truncate">{stemsPackDrums ? stemsPackDrums.name : 'En attente...'}</p>
                </div>
                <label className="text-[10px] font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 px-2 py-1 rounded-lg cursor-pointer shrink-0">
                  <span>{stemsPackDrums ? 'Modifier' : 'Choisir'}</span>
                  <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setStemsPackDrums(e.target.files[0])} className="hidden" />
                </label>
              </div>

              {/* Basse */}
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${stemsPackBass ? 'bg-amber-950/40 border-amber-600/60 text-white' : 'bg-stone-900 border-stone-800 text-stone-400'}`}>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-amber-400">🎸 Basse (Bass)</p>
                  <p className="text-[10px] truncate">{stemsPackBass ? stemsPackBass.name : 'En attente...'}</p>
                </div>
                <label className="text-[10px] font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 px-2 py-1 rounded-lg cursor-pointer shrink-0">
                  <span>{stemsPackBass ? 'Modifier' : 'Choisir'}</span>
                  <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setStemsPackBass(e.target.files[0])} className="hidden" />
                </label>
              </div>

              {/* Mélodie */}
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${stemsPackMelody ? 'bg-emerald-950/40 border-emerald-600/60 text-white' : 'bg-stone-900 border-stone-800 text-stone-400'}`}>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-emerald-400">🎹 Mélodie (Other)</p>
                  <p className="text-[10px] truncate">{stemsPackMelody ? stemsPackMelody.name : 'En attente...'}</p>
                </div>
                <label className="text-[10px] font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 px-2 py-1 rounded-lg cursor-pointer shrink-0">
                  <span>{stemsPackMelody ? 'Modifier' : 'Choisir'}</span>
                  <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setStemsPackMelody(e.target.files[0])} className="hidden" />
                </label>
              </div>
            </div>

            {/* Bouton Valider */}
            <button
              type="button"
              onClick={handleApplyStemsPack}
              disabled={!stemsPackVocals && !stemsPackDrums && !stemsPackBass && !stemsPackMelody}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>🚀 Valider & Charger sur le Deck {showStemsPackModal}</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. MODALE DE SÉLECTION DE MORCEAU / DÉMO */}
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

            {/* Onglets */}
            <div className="flex items-center bg-stone-100 p-1 rounded-2xl gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectorTab('library')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  selectorTab === 'library' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Music2 className="w-3.5 h-3.5" />
                <span>Bibliothèque ({libraryTracks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectorTab('demos')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  selectorTab === 'demos' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Démo Hans Zimmer</span>
              </button>
            </div>

            {/* Contenu Bibliothèque */}
            {selectorTab === 'library' && (
              <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Rechercher une piste..."
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-stone-900"
                  />
                </div>
                <div className="space-y-1.5">
                  {libraryTracks
                    .filter((t) => t.title.toLowerCase().includes(librarySearch.toLowerCase()))
                    .map((t) => (
                      <button
                        key={t.id}
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
                        className="w-full text-left p-3 rounded-2xl hover:bg-stone-50 border border-transparent hover:border-stone-200 flex items-center justify-between transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-stone-900 truncate group-hover:text-rose-600">{t.title}</p>
                          <p className="text-[10px] text-stone-400 truncate">{t.artist || 'Artiste local'}</p>
                        </div>
                        <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-1 rounded-lg">
                          Charger
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Contenu Démos */}
            {selectorTab === 'demos' && (
              <div className="space-y-2 overflow-y-auto max-h-[50vh] pr-1">
                {DEMO_TRACKS.map((demo) => (
                  <button
                    key={demo.title}
                    type="button"
                    onClick={() => {
                      selectTrackForDeck(selectorTargetDeck, demo);
                      setSelectorTargetDeck(null);
                    }}
                    className="w-full text-left p-3 rounded-2xl hover:bg-stone-50 border border-transparent hover:border-stone-200 flex items-center gap-3 transition-colors group"
                  >
                    <img src={demo.thumbnail_url} alt={demo.title} className="w-10 h-10 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-stone-900 truncate group-hover:text-violet-600">{demo.title}</p>
                      <p className="text-[10px] text-stone-400">{demo.artist} • {demo.genre}</p>
                    </div>
                    <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-1 rounded-lg">
                      Sélectionner
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
