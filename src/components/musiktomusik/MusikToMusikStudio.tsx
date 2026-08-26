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
  Plus,
  Loader2,
  Copy,
  FolderArchive
} from 'lucide-react';
import { Track, MusikToMusikProject, StemMixConfig, StemSourceChoice, StemType, MashupTrackInfo, GENRES } from '../../lib/types';
import { MashupAudioEngine, EnhancedStemSeparator, NeuralStemSeparator, HDSeparatedStems, isDirectAudioUrl } from '../../lib/stemEngine';
import { runStemBenchmarkSuite, BenchmarkReport } from '../../lib/stemBenchmark';
import { createMusikToMusikProject } from '../../lib/supabase';
import { resolveUniversalTrack, extractYouTubeId, loadYouTubeAPI } from '../../lib/youtube';
import { YouTubeIcon } from '../icons/YouTubeIcon';

interface MusikToMusikStudioProps {
  onBack: () => void;
  onProjectSaved: (newProject: MusikToMusikProject) => void;
  libraryTracks?: Track[];
}

// Bibliothèque de pistes démo permanentes YouTube
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

  // Stems séparés Haute Définition (HPSS)
  const [hdStemsA, setHdStemsA] = useState<HDSeparatedStems | null>(null);
  const [hdStemsB, setHdStemsB] = useState<HDSeparatedStems | null>(null);
  const [isProcessingHD, setIsProcessingHD] = useState<boolean>(false);
  const [processingDeck, setProcessingDeck] = useState<'A' | 'B' | null>(null);
  const [hdProgressStep, setHdProgressStep] = useState<string>('');
  const [hdProgressPercent, setHdProgressPercent] = useState<number>(0);

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

  // Modal de Benchmark & Qualité DSP
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState<boolean>(false);
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState<boolean>(false);

  // Drag & Drop et Assistant Extraction YouTube
  const [isDraggingA, setIsDraggingA] = useState<boolean>(false);
  const [isDraggingB, setIsDraggingB] = useState<boolean>(false);
  const [showYtExtractorModal, setShowYtExtractorModal] = useState<'A' | 'B' | null>(null);
  const [copiedYtLink, setCopiedYtLink] = useState<boolean>(false);

  // Modale dédiée d'import de Pack 4 Stems (Demucs / UVR5)
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

    const finalTitle = stemsPackTitle.trim() || 'Pack 4 Stems Demucs Pro';

    const customTrack: MashupTrackInfo & { genre?: string } = {
      title: finalTitle,
      artist: 'Demucs v4 (Stems Pro)',
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

  // Traitement universel des fichiers déposés ou sélectionnés (MP3 individuel ou Pack 4 Stems UVR5/Demucs)
  const processImportedFiles = (deck: 'A' | 'B', fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    // Cas 1 : Dépôt simultané de plusieurs stems pré-séparés (ex: UVR5 / Demucs / Moises)
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
          artist: 'Demucs v4 (Stems Pro)',
          audio_url: stems.vocalsUrl,
          thumbnail_url: '',
          genre: 'Stems Pro UVR5/Demucs',
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
        if (showYtExtractorModal) setShowYtExtractorModal(null);
        return;
      }
    }

    // Cas 2 : Fichier MP3 / WAV unique
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
    if (showYtExtractorModal) setShowYtExtractorModal(null);
  };

  const handleDropAudio = (deck: 'A' | 'B', e: React.DragEvent) => {
    e.preventDefault();
    if (deck === 'A') setIsDraggingA(false);
    else setIsDraggingB(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImportedFiles(deck, e.dataTransfer.files);
    }
  };

  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    await new Promise((r) => setTimeout(r, 150));
    try {
      const report = runStemBenchmarkSuite(5, 44100);
      setBenchmarkReport(report);
    } catch (e) {
      console.warn('Erreur benchmark:', e);
    } finally {
      setIsRunningBenchmark(false);
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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialisation du moteur DSP
  useEffect(() => {
    engineRef.current = new MashupAudioEngine();

    return () => {
      if (engineRef.current) engineRef.current.dispose();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    };
  }, []);

  // Initialisation du lecteur YouTube Deck A
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
        videoId: trackA.youtube_id,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(85);
            if (isPlaying) event.target.playVideo();
          },
        },
      });
    });

    return () => {
      isCancelled = true;
      if (ytPlayerRefA.current) {
        try { ytPlayerRefA.current.destroy(); } catch (_) {}
        ytPlayerRefA.current = null;
      }
    };
  }, [trackA.youtube_id]);

  // Initialisation du lecteur YouTube Deck B
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
        videoId: trackB.youtube_id,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(85);
            try { event.target.setPlaybackRate(speedRatioB); } catch (_) {}
            if (isPlaying) event.target.playVideo();
          },
        },
      });
    });

    return () => {
      isCancelled = true;
      if (ytPlayerRefB.current) {
        try { ytPlayerRefB.current.destroy(); } catch (_) {}
        ytPlayerRefB.current = null;
      }
    };
  }, [trackB.youtube_id]);

  // Recharger les Decks dans le moteur quand l'audio direct change
  useEffect(() => {
    if (engineRef.current && !hdStemsA && !hdStemsB) {
      const urlA = isDirectAudioUrl(trackA.audio_url) ? trackA.audio_url : '';
      const urlB = isDirectAudioUrl(trackB.audio_url) ? trackB.audio_url : '';
      engineRef.current.loadDecks(urlA, urlB, stemConfig);
      engineRef.current.setSpeedB(speedRatioB);
      engineRef.current.setOffsetB(offsetSecondsB);
      if (isPlaying) {
        engineRef.current.play();
      }
    }
  }, [trackA.audio_url, trackB.audio_url]);

  // Synchroniser les Stems HD avec le moteur quand disponibles
  useEffect(() => {
    if (engineRef.current && (hdStemsA || hdStemsB)) {
      engineRef.current.loadHDStems(hdStemsA, hdStemsB, stemConfig);
      engineRef.current.setSpeedB(speedRatioB);
      engineRef.current.setOffsetB(offsetSecondsB);
      if (isPlaying) {
        engineRef.current.play();
      }
    }
  }, [hdStemsA, hdStemsB]);

  // Mettre à jour la matrice DSP et les volumes YouTube quand la configuration change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.applyStemConfig(stemConfig);
    }

    // Synchronisation du volume YouTube Deck A
    if (ytPlayerRefA.current && typeof ytPlayerRefA.current.setVolume === 'function') {
      if (hdStemsA) {
        try { ytPlayerRefA.current.mute(); } catch (_) {}
        ytPlayerRefA.current.setVolume(0);
      } else {
        const volVocalsA = (!stemConfig.vocals.isMuted && (stemConfig.vocals.source === 'A' || stemConfig.vocals.source === 'both')) ? stemConfig.vocals.volumeA : 0;
        const volDrumsA = (!stemConfig.drums.isMuted && (stemConfig.drums.source === 'A' || stemConfig.drums.source === 'both')) ? stemConfig.drums.volumeA : 0;
        const volBassA = (!stemConfig.bass.isMuted && (stemConfig.bass.source === 'A' || stemConfig.bass.source === 'both')) ? stemConfig.bass.volumeA : 0;
        const volMelodyA = (!stemConfig.melody.isMuted && (stemConfig.melody.source === 'A' || stemConfig.melody.source === 'both')) ? stemConfig.melody.volumeA : 0;

        const totalActiveA = volVocalsA + volDrumsA + volBassA + volMelodyA;
        if (totalActiveA <= 0.001) {
          try { ytPlayerRefA.current.mute(); } catch (_) {}
          ytPlayerRefA.current.setVolume(0);
        } else {
          try { ytPlayerRefA.current.unMute(); } catch (_) {}
          const avgVolA = Math.min(100, Math.round((totalActiveA / 4) * 100));
          ytPlayerRefA.current.setVolume(avgVolA);
        }
      }
    }

    // Synchronisation du volume YouTube Deck B
    if (ytPlayerRefB.current && typeof ytPlayerRefB.current.setVolume === 'function') {
      if (hdStemsB) {
        try { ytPlayerRefB.current.mute(); } catch (_) {}
        ytPlayerRefB.current.setVolume(0);
      } else {
        const volVocalsB = (!stemConfig.vocals.isMuted && (stemConfig.vocals.source === 'B' || stemConfig.vocals.source === 'both')) ? stemConfig.vocals.volumeB : 0;
        const volDrumsB = (!stemConfig.drums.isMuted && (stemConfig.drums.source === 'B' || stemConfig.drums.source === 'both')) ? stemConfig.drums.volumeB : 0;
        const volBassB = (!stemConfig.bass.isMuted && (stemConfig.bass.source === 'B' || stemConfig.bass.source === 'both')) ? stemConfig.bass.volumeB : 0;
        const volMelodyB = (!stemConfig.melody.isMuted && (stemConfig.melody.source === 'B' || stemConfig.melody.source === 'both')) ? stemConfig.melody.volumeB : 0;

        const totalActiveB = volVocalsB + volDrumsB + volBassB + volMelodyB;
        if (totalActiveB <= 0.001) {
          try { ytPlayerRefB.current.mute(); } catch (_) {}
          ytPlayerRefB.current.setVolume(0);
        } else {
          try { ytPlayerRefB.current.unMute(); } catch (_) {}
          const avgVolB = Math.min(100, Math.round((totalActiveB / 4) * 100));
          ytPlayerRefB.current.setVolume(avgVolB);
        }
      }
    }
  }, [stemConfig, hdStemsA, hdStemsB]);

  // Mettre à jour vitesse Deck B
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSpeedB(speedRatioB);
    }
    if (ytPlayerRefB.current && typeof ytPlayerRefB.current.setPlaybackRate === 'function') {
      try {
        ytPlayerRefB.current.setPlaybackRate(speedRatioB);
      } catch (_) {}
    }
  }, [speedRatioB]);

  // Mettre à jour offset Deck B
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setOffsetB(offsetSecondsB);
    }
    if (ytPlayerRefB.current && typeof ytPlayerRefB.current.seekTo === 'function') {
      try {
        ytPlayerRefB.current.seekTo(offsetSecondsB, true);
      } catch (_) {}
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

  // Annuler la séparation en cours
  const handleCancelSeparation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessingHD(false);
    setProcessingDeck(null);
  };

  // Déclencher la séparation Haute Définition par Réseau de Neurones (IA U-Net / STFT)
  const startHDSeparation = async (deck: 'A' | 'B', customTrack?: MashupTrackInfo) => {
    const track = customTrack || (deck === 'A' ? trackA : trackB);

    // Si c'est un flux YouTube pur sans fichier audio direct : ouvrir l'assistant d'extraction MP3 sans faux popup
    if (!isDirectAudioUrl(track.audio_url) && !track.audio_url?.startsWith('data:') && !track.audio_url?.startsWith('blob:')) {
      setShowYtExtractorModal(deck);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsProcessingHD(true);
    setProcessingDeck(deck);
    setHdProgressPercent(10);
    setHdProgressStep('📥 1/6. Initialisation du moteur d inférence ONNX Runtime Web...');

    try {
      const separator = new NeuralStemSeparator();
      const stems = await separator.separateAudio(
        track.audio_url,
        (step: string, pct: number) => {
          setHdProgressStep(step);
          setHdProgressPercent(pct);
        },
        abortControllerRef.current.signal
      );
      if (stems) {
        if (deck === 'A') {
          setHdStemsA(stems);
          if (engineRef.current) {
            engineRef.current.loadHDStems(stems, hdStemsB, stemConfig);
          }
        } else {
          setHdStemsB(stems);
          if (engineRef.current) {
            engineRef.current.loadHDStems(hdStemsA, stems, stemConfig);
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Erreur séparation IA:', err);
      }
    } finally {
      setIsProcessingHD(false);
      setProcessingDeck(null);
      abortControllerRef.current = null;
    }
  };

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
        try { ytPlayerRefB.current.setPlaybackRate(speedRatioB); } catch (_) {}
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

  // Enregistrement du Mashup Live
  const startRecording = () => {
    if (!isPlaying) {
      togglePlay();
    }
    setRecordSeconds(0);
    setIsRecordingMashup(true);
    if (engineRef.current) engineRef.current.startRecording();

    recordIntervalRef.current = setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    setIsRecordingMashup(false);
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);

    if (engineRef.current) {
      const base64 = await engineRef.current.stopRecording();
      setRecordedAudioBase64(base64);
    }
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

      const newTrackInfo: MashupTrackInfo & { genre?: string } = {
        title: res.title || 'Musique YouTube',
        artist: res.artist || 'Artiste YouTube',
        audio_url: '',
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

  // Sélection d'une piste pour un Deck avec Traitement IA Automatique
  const selectTrackForDeck = (deck: 'A' | 'B', trackInfo: MashupTrackInfo & { genre?: string }) => {
    if (deck === 'A') {
      setTrackA(trackInfo);
      setHdStemsA(null);
    } else {
      setTrackB(trackInfo);
      setHdStemsB(null);
    }
    setSelectorTargetDeck(null);
    setResolvedTrackInfo(null);
    setYoutubeUrlInput('');

    // Déclenchement automatique du traitement IA dès la sélection
    setTimeout(() => {
      startHDSeparation(deck, trackInfo);
    }, 150);
  };

  // Upload d'un fichier audio ou pack multi-stems
  const handleUploadAudio = (deck: 'A' | 'B', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImportedFiles(deck, e.target.files);
    }
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
      {/* Conteneurs YouTube Iframe cachés mais actifs */}
      <div className="sr-only pointer-events-none opacity-0 h-0 overflow-hidden">
        <div ref={ytContainerRefA} />
        <div ref={ytContainerRefB} />
      </div>

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
          <button
            type="button"
            onClick={() => {
              setIsBenchmarkOpen(true);
              if (!benchmarkReport) handleRunBenchmark();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:scale-105"
            title="Lancer le banc de test et de mesure scientifique de la séparation DSP"
          >
            <span>🧪 Benchmark DSP & Métriques</span>
          </button>

          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-500/10 to-violet-500/10 text-violet-700 border border-violet-200 text-xs font-extrabold flex items-center gap-1.5 font-mono">
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-600" />
            <span>Studio MusikToMusik • YouTube Stems Lab</span>
          </span>
        </div>
      </div>

      {/* BANNER PRESENTS */}
      <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-violet-950 text-white rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Double Deck DJ + Séparation Stems HPSS & YouTube
            </span>
            <h2 className="text-xl sm:text-3xl font-black font-display tracking-tight text-white">
              Studio Mashup : Fusionnez vos Musiques en Direct
            </h2>
            <p className="text-xs sm:text-sm text-stone-300">
              Choisissez deux musiques et croisez leurs 4 pistes (<strong className="text-rose-400">Voix</strong>, <strong className="text-amber-400">Batterie</strong>, <strong className="text-violet-400">Basse</strong>, <strong className="text-cyan-400">Mélodie</strong>) avec calage BPM et découpage Haute Définition !
            </p>
          </div>

          {/* Boutons de Presets Rapides */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsBenchmarkOpen(true);
                if (!benchmarkReport) handleRunBenchmark();
              }}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-bold transition-transform hover:scale-105 flex items-center gap-1.5 shadow-sm text-violet-300"
              title="Tester et comparer scientifiquement l'isolation des stems"
            >
              <span>🧪 Benchmark Qualité</span>
            </button>
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

      {/* SÉLECTION DES 2 DECKS (MORCEAU A & MORCEAU B AVEC YOUTUBE & BOUTON DÉCOUPAGE HD) */}
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
              <p>🎯 Déposez votre fichier MP3 / WAV ici pour le Deck A !</p>
              <p className="text-xs font-normal text-rose-200 mt-1">Séparation Deep Learning ONNX automatique</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                A
              </span>
              <h3 className="font-extrabold text-sm text-stone-900 font-display">
                Morceau A (Deck Principal)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startHDSeparation('A')}
                disabled={isProcessingHD}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                  hdStemsA
                    ? 'bg-emerald-600 text-white'
                    : isDirectAudioUrl(trackA.audio_url) || trackA.audio_url?.startsWith('data:') || trackA.audio_url?.startsWith('blob:')
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
                title={
                  hdStemsA
                    ? '4 Stems isolés en mémoire'
                    : isDirectAudioUrl(trackA.audio_url) || trackA.audio_url?.startsWith('data:') || trackA.audio_url?.startsWith('blob:')
                    ? 'Lancer la séparation neuronale Ultra-HD sur ce fichier'
                    : 'Extraire le fichier MP3 pour pouvoir séparer les 4 pistes'
                }
              >
                {isProcessingHD && processingDeck === 'A' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>
                  {hdStemsA
                    ? '✨ 4 Stems Prêts'
                    : isDirectAudioUrl(trackA.audio_url) || trackA.audio_url?.startsWith('data:') || trackA.audio_url?.startsWith('blob:')
                    ? '🧠 Séparation Ultra-HD'
                    : '📥 Extraire MP3'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectorTargetDeck('A');
                  setSelectorTab('library');
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm border border-rose-200"
              >
                <YouTubeIcon className="w-3.5 h-3.5" />
                <span>Changer</span>
              </button>
            </div>
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

          {/* Zone de Glisser-Déposer & Assistant MP3 Deck A */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowStemsPackModal('A')}
              className="text-[10px] sm:text-[11px] font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
              title="Importer les 4 fichiers WAV séparés avec Demucs v4 / UVR5 d'un coup"
            >
              <FolderArchive className="w-3.5 h-3.5 text-emerald-600" />
              <span>📦 Pack 4 Stems</span>
            </button>

            <button
              type="button"
              onClick={() => setShowYtExtractorModal('A')}
              className="text-[10px] sm:text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
            >
              <span>📥 Extraire YT</span>
            </button>

            <label className="text-[10px] sm:text-[11px] font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm border border-stone-200" title="Glissez ou choisissez un MP3">
              <span>📂 MP3 Simple</span>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => handleUploadAudio('A', e)}
                className="hidden"
              />
            </label>
          </div>

          {/* Badges d'état des 4 Stems Deck A */}
          {hdStemsA && (
            <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] font-bold text-center">
              <div className={`py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1 ${stemConfig.vocals.isMuted ? 'bg-stone-100 text-stone-400 border-stone-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                <span>🎤 Voix</span>
              </div>
              <div className={`py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1 ${stemConfig.drums.isMuted ? 'bg-stone-100 text-stone-400 border-stone-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                <span>🥁 Drums</span>
              </div>
              <div className={`py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1 ${stemConfig.bass.isMuted ? 'bg-stone-100 text-stone-400 border-stone-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                <span>🎸 Basse</span>
              </div>
              <div className={`py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1 ${stemConfig.melody.isMuted ? 'bg-stone-100 text-stone-400 border-stone-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                <span>🎹 Mélodie</span>
              </div>
            </div>
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
              <p>🎯 Déposez votre fichier MP3 ou vos 4 Stems Pro pour le Deck B !</p>
              <p className="text-xs font-normal text-violet-200 mt-1">Séparation Deep Learning ONNX automatique</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-violet-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                B
              </span>
              <h3 className="font-extrabold text-sm text-stone-900 font-display">
                Morceau B (Deck Fusion & Rythme)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startHDSeparation('B')}
                disabled={isProcessingHD}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                  hdStemsB
                    ? 'bg-emerald-600 text-white'
                    : isDirectAudioUrl(trackB.audio_url) || trackB.audio_url?.startsWith('data:') || trackB.audio_url?.startsWith('blob:')
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
                title={
                  hdStemsB
                    ? '4 Stems isolés en mémoire'
                    : isDirectAudioUrl(trackB.audio_url) || trackB.audio_url?.startsWith('data:') || trackB.audio_url?.startsWith('blob:')
                    ? 'Lancer la séparation neuronale Ultra-HD sur ce fichier'
                    : 'Extraire le fichier MP3 pour pouvoir séparer les 4 pistes'
                }
              >
                {isProcessingHD && processingDeck === 'B' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>
                  {hdStemsB
                    ? '✨ 4 Stems Prêts'
                    : isDirectAudioUrl(trackB.audio_url) || trackB.audio_url?.startsWith('data:') || trackB.audio_url?.startsWith('blob:')
                    ? '🧠 Séparation Ultra-HD'
                    : '📥 Extraire MP3'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectorTargetDeck('B');
                  setSelectorTab('library');
                }}
                className="text-[11px] font-bold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm border border-violet-200"
              >
                <YouTubeIcon className="w-3.5 h-3.5" />
                <span>Changer</span>
              </button>
            </div>
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

          {/* Zone de Glisser-Déposer & Assistant MP3 Deck B */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowStemsPackModal('B')}
              className="text-[10px] sm:text-[11px] font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
              title="Importer les 4 fichiers WAV séparés avec Demucs v4 / UVR5 d'un coup"
            >
              <FolderArchive className="w-3.5 h-3.5 text-emerald-600" />
              <span>📦 Pack 4 Stems</span>
            </button>

            <button
              type="button"
              onClick={() => setShowYtExtractorModal('B')}
              className="text-[10px] sm:text-[11px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
            >
              <span>📥 Extraire YT</span>
            </button>

            <label className="text-[10px] sm:text-[11px] font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm border border-stone-200" title="Glissez ou choisissez un MP3">
              <span>📂 MP3 Simple</span>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => handleUploadAudio('B', e)}
                className="hidden"
              />
            </label>
          </div>

          {/* Badges d'état des 4 Stems Deck B */}
          {hdStemsB && (
            <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] font-bold text-center">
              <div className={`py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1 ${stemConfig.vocals.isMuted ? 'bg-stone-100 text-stone-400 border-stone-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                <span>🎤 Voix</span>
              </div>
              <div className={`py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1 ${stemConfig.drums.isMuted ? 'bg-stone-100 text-stone-400 border-stone-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                <span>🥁 Drums</span>
              </div>
              <div className={`py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1 ${stemConfig.bass.isMuted ? 'bg-stone-100 text-stone-400 border-stone-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                <span>🎸 Basse</span>
              </div>
              <div className={`py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1 ${stemConfig.melody.isMuted ? 'bg-stone-100 text-stone-400 border-stone-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                <span>🎹 Mélodie</span>
              </div>
            </div>
          )}
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
            Filtres DSP Web Audio & Mixeur Multi-Sources
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

      {/* ⏳ MODALE DE PROGRESSION ONNX HAUTE DÉFINITION AVEC ANNULATION */}
      {isProcessingHD && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-stone-950 border-2 border-rose-500/50 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-5 text-center relative">
            {/* Bouton Fermer / Annuler en haut à droite */}
            <button
              type="button"
              onClick={handleCancelSeparation}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
              title="Annuler l'analyse"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-violet-600 flex items-center justify-center mx-auto shadow-lg shadow-rose-600/30 animate-pulse">
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black font-display text-white">
                Séparation Ultra-HD (Deep Learning ONNX)
              </h3>
              <p className="text-xs text-stone-400">
                Inférence neuronale Deck {processingDeck} • Isolation des 4 Pistes
              </p>
            </div>

            {/* Jauge de progression */}
            <div className="space-y-2">
              <div className="w-full bg-stone-900 rounded-full h-3 p-0.5 border border-stone-800 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-500 via-pink-500 to-violet-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${hdProgressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-stone-400">
                <span>Calcul spectral & tenseurs</span>
                <span className="text-rose-400 font-bold">{hdProgressPercent}%</span>
              </div>
            </div>

            {/* Étape en temps réel */}
            <div className="bg-stone-900/80 rounded-2xl p-3.5 border border-stone-800 text-xs text-stone-300 font-mono">
              <p className="animate-pulse">{hdProgressStep}</p>
            </div>

            {/* Bouton Annuler l'analyse */}
            <button
              type="button"
              onClick={handleCancelSeparation}
              className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-rose-950/50 text-stone-300 hover:text-rose-300 text-xs font-bold transition-all border border-stone-800 hover:border-rose-700/80 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <X className="w-4 h-4 text-rose-400" />
              <span>Annuler l'analyse en cours</span>
            </button>
          </div>
        </div>
      )}

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
                            audio_url: isDirectAudioUrl(t.audio_url) ? t.audio_url : '',
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

      {/* 🧪 MODALE DE BENCHMARK & RAPPORT SCIENTIFIQUE DSP */}
      {isBenchmarkOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-stone-950 border-2 border-violet-500/50 rounded-3xl max-w-2xl w-full p-6 sm:p-8 text-white shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header Modale */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-rose-600 flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-display text-white">
                    Banc de Test & Benchmark DSP (Séparation Stems)
                  </h3>
                  <p className="text-xs text-stone-400">
                    Mesure acoustique normalisée du SIR (Signal-to-Interference Ratio) et du taux de fuite
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBenchmarkOpen(false)}
                className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bouton pour relancer le benchmark */}
            <div className="flex items-center justify-between bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-stone-200">Test sur Signal Témoin Calibré (Ground Truth 5s)</span>
                <p className="text-[11px] text-stone-400">Évalue 4 pistes indépendantes (Voix, Batterie, Basse, Mélodie)</p>
              </div>

              <button
                type="button"
                onClick={handleRunBenchmark}
                disabled={isRunningBenchmark}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {isRunningBenchmark ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>{isRunningBenchmark ? 'Mesure en cours...' : 'Relancer le Test'}</span>
              </button>
            </div>

            {/* Tableau Comparatif des 3 Algorithmes */}
            {benchmarkReport && (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-stone-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-900/90 text-stone-400 font-mono text-[10px] uppercase border-b border-stone-800">
                        <th className="p-3">Algorithme Testé</th>
                        <th className="p-3 text-center">Score Global</th>
                        <th className="p-3 text-center">SIR Voix</th>
                        <th className="p-3 text-center">SIR Beat</th>
                        <th className="p-3 text-center">SIR Basse</th>
                        <th className="p-3 text-center">SIR Mélodie</th>
                        <th className="p-3 text-right">Vitesse</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/80 font-mono text-[11px]">
                      {benchmarkReport.results.map((res, idx) => {
                        const isBest = res.name === benchmarkReport.recommendedAlgorithm;
                        return (
                          <tr
                            key={res.name}
                            className={`transition-colors ${
                              isBest ? 'bg-violet-950/40 text-violet-200' : 'bg-stone-950/60 text-stone-300'
                            }`}
                          >
                            <td className="p-3 font-sans font-bold">
                              <div className="flex items-center gap-1.5">
                                {isBest && <span className="text-amber-400 font-bold text-xs">★</span>}
                                <span>{res.name}</span>
                              </div>
                              <span className="text-[10px] font-normal text-stone-400 block font-sans">
                                {res.description}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-md font-bold ${
                                res.overallScore >= 50
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-stone-800 text-stone-300'
                              }`}>
                                {res.overallScore}/100
                              </span>
                            </td>
                            <td className="p-3 text-center font-semibold text-rose-300">{res.stems.vocals.sirDb} dB</td>
                            <td className="p-3 text-center font-semibold text-amber-300">{res.stems.drums.sirDb} dB</td>
                            <td className="p-3 text-center font-semibold text-violet-300">{res.stems.bass.sirDb} dB</td>
                            <td className="p-3 text-center font-semibold text-cyan-300">{res.stems.melody.sirDb} dB</td>
                            <td className="p-3 text-right font-mono text-stone-400">
                              {res.durationMs}ms ({res.realtimeFactor}x RT)
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Synthèse & Recommandation */}
                <div className="bg-gradient-to-r from-violet-950/60 to-stone-900 p-4 rounded-2xl border border-violet-800/60 space-y-1">
                  <span className="text-[10px] font-mono text-violet-400 uppercase font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Analyse du Banc de Test
                  </span>
                  <p className="text-xs text-stone-200">{benchmarkReport.summary}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📥 ASSISTANT D'EXTRACTION YOUTUBE VERS MP3 */}
      {showYtExtractorModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 text-stone-900 shadow-2xl border border-stone-200 space-y-5 max-h-[90vh] flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-full text-white font-black text-xs flex items-center justify-center ${
                  showYtExtractorModal === 'A' ? 'bg-rose-600' : 'bg-violet-600'
                }`}>
                  {showYtExtractorModal}
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900 font-display">
                    Assistant d'Extraction MP3 • Deck {showYtExtractorModal}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Récupérez le fichier audio réel pour la séparation Deep Learning ONNX
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowYtExtractorModal(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Étape 1 : Copier le lien YouTube */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-stone-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px]">1</span>
                  Lien YouTube du morceau actuel :
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const ytId = showYtExtractorModal === 'A' ? trackA.youtube_id : trackB.youtube_id;
                    const urlToCopy = ytId ? `https://www.youtube.com/watch?v=${ytId}` : 'https://www.youtube.com/';
                    navigator.clipboard.writeText(urlToCopy);
                    setCopiedYtLink(true);
                    setTimeout(() => setCopiedYtLink(false), 2000);
                  }}
                  className="text-xs font-bold px-3 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-white transition-all flex items-center gap-1 shadow-sm"
                >
                  {copiedYtLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedYtLink ? 'Copié !' : 'Copier le lien'}</span>
                </button>
              </div>

              <p className="text-xs font-mono text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200 truncate">
                {showYtExtractorModal === 'A'
                  ? (trackA.youtube_id ? `https://www.youtube.com/watch?v=${trackA.youtube_id}` : 'Aucune vidéo sélectionnée')
                  : (trackB.youtube_id ? `https://www.youtube.com/watch?v=${trackB.youtube_id}` : 'Aucune vidéo sélectionnée')}
              </p>
            </div>

            {/* Étape 2 : Convertisseurs fiables en 1-clic */}
            <div className="space-y-2">
              <span className="text-xs font-black text-stone-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px]">2</span>
                Ouvrez un extracteur MP3 gratuit & propre :
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href="https://10downloader.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-bold text-emerald-950 group-hover:text-emerald-800">10Downloader.com</p>
                    <p className="text-[10px] text-emerald-700">100% sans pub • MP3 direct</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                </a>

                <a
                  href="https://y2mate.nu/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100/80 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-bold text-rose-950 group-hover:text-rose-800">Y2Mate.nu</p>
                    <p className="text-[10px] text-rose-700">Téléchargement audio ultra-rapide</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-rose-600" />
                </a>

                <a
                  href="https://loader.to/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl border border-violet-200 bg-violet-50 hover:bg-violet-100/80 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-bold text-violet-950 group-hover:text-violet-800">Loader.to</p>
                    <p className="text-[10px] text-violet-700">Qualité studio 320 kbps</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-violet-600" />
                </a>

                <a
                  href="https://mp3-convert.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-2xl border border-cyan-200 bg-cyan-50 hover:bg-cyan-100/80 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-bold text-cyan-950 group-hover:text-cyan-800">MP3-Convert.org</p>
                    <p className="text-[10px] text-cyan-700">Extraction MP3 instantanée</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-cyan-600" />
                </a>
              </div>
            </div>

            {/* Étape 3 : Glisser-déposer le fichier téléchargé */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropAudio(showYtExtractorModal, e)}
              className="border-2 border-dashed border-stone-300 hover:border-rose-500 bg-stone-50 hover:bg-rose-50/50 rounded-2xl p-6 text-center space-y-3 transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center mx-auto shadow-md">
                <Sparkles className="w-5 h-5 text-rose-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-stone-900">
                  3. Déposez votre fichier .mp3 téléchargé ici
                </p>
                <p className="text-[11px] text-stone-500">
                  Ou cliquez sur le bouton ci-dessous pour le sélectionner sur votre ordinateur
                </p>
              </div>

              <label className="inline-block text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 py-2.5 px-5 rounded-xl transition-all cursor-pointer shadow-md">
                <span>📂 Sélectionner le fichier MP3</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    handleUploadAudio(showYtExtractorModal, e);
                    setShowYtExtractorModal(null);
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 📦 MODALE DÉDIÉE D'IMPORTATION DE PACK 4 STEMS DEMUCS / UVR5 */}
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
                  Pistes séparées avec le script <code className="text-emerald-300 font-mono">extraire_pistes.bat</code> ou Demucs / UVR5
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
    </div>
  );
};
