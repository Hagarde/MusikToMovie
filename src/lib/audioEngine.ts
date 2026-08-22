import { EQSettings, AudioTrack } from './types';

// Convertir un Blob audio en chaîne Base64
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Convertir une chaîne Base64 en Blob audio
export function base64ToBlob(base64: string, type: string = 'audio/webm'): Blob {
  const parts = base64.split(';base64,');
  const contentType = parts.length > 1 ? parts[0].split(':')[1] : type;
  const raw = window.atob(parts.length > 1 ? parts[1] : parts[0]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

// 🌊 Décodage Web Audio DSP pour extraire la vraie forme d'onde (Waveform Peaks)
export async function extractWaveformData(
  base64OrBlob: string | Blob, 
  samplesCount: number = 100
): Promise<number[]> {
  try {
    const blob = typeof base64OrBlob === 'string' ? base64ToBlob(base64OrBlob) : base64OrBlob;
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samplesCount);
    const peaks: number[] = [];

    for (let i = 0; i < samplesCount; i++) {
      const start = i * blockSize;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j]);
      }
      peaks.push(sum / blockSize);
    }

    const max = Math.max(...peaks, 0.001);
    const normalized = peaks.map((p) => Math.max(0.08, Math.min(1.0, p / max)));
    try { audioCtx.close(); } catch (_) {}
    return normalized;
  } catch (e) {
    console.warn('Erreur extraction waveform:', e);
    // Fallback dynamique
    return Array.from({ length: samplesCount }, () => 0.15 + Math.random() * 0.7);
  }
}

// 🎙️ Classe Enregistreur Microphone avec visualiseur en direct
export class MicrophoneRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  public async start(onVisualizerUpdate?: (dataArray: Uint8Array) => void): Promise<void> {
    this.audioChunks = [];

    // Demander l'accès micro natif
    this.microphoneStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      } 
    });

    // Choix du format supporté nativement
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
      mimeType = 'audio/ogg';
    }

    this.mediaRecorder = new MediaRecorder(this.microphoneStream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // Configuration Web Audio API pour le visualiseur d'ondes en temps réel
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx();
    const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (this.analyser && onVisualizerUpdate) {
        this.analyser.getByteFrequencyData(dataArray);
        onVisualizerUpdate(dataArray);
      }
      this.animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    this.mediaRecorder.start(100);
  }

  public stop(): Promise<{ blob: Blob; duration: number }> {
    return new Promise((resolve) => {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      if (!this.mediaRecorder) {
        resolve({ blob: new Blob([]), duration: 0 });
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });

        // Nettoyage du flux micro
        if (this.microphoneStream) {
          this.microphoneStream.getTracks().forEach(track => track.stop());
          this.microphoneStream = null;
        }

        if (this.audioContext) {
          try { this.audioContext.close(); } catch (_) {}
          this.audioContext = null;
        }

        resolve({ blob, duration: 0 });
      };

      this.mediaRecorder.stop();
    });
  }
}

// 🎛️ Canal de Piste Audio Individuel
interface TrackChannel {
  track: AudioTrack;
  audioElement: HTMLAudioElement;
  sourceNode: MediaElementAudioSourceNode;
  bassFilter: BiquadFilterNode;
  midFilter: BiquadFilterNode;
  trebleFilter: BiquadFilterNode;
  gainNode: GainNode;
  timeUpdateListener?: () => void;
}

// 🎛️ Moteur Audio Multi-Pistes (Superposition, Rognage Début/Fin, Mute/Solo, EQ indépendants)
export class MultiTrackAudioEngine {
  private audioContext: AudioContext | null = null;
  private channels: Map<string, TrackChannel> = new Map();
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;

  private initAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.audioContext.destination);
    }
    return this.audioContext;
  }

  public loadTracks(tracks: AudioTrack[]): void {
    this.dispose();
    const ctx = this.initAudioContext();

    const hasSolo = tracks.some(t => t.is_solo);

    tracks.forEach((t) => {
      if (!t.audio_data) return;

      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = t.audio_data;
      audio.loop = false; // La boucle est gérée par le moteur

      const sourceNode = ctx.createMediaElementSource(audio);

      // 1. Filtre Graves (Bass Low-Shelf à 200 Hz)
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 200;
      bassFilter.gain.value = t.eq_settings?.bass || 0;

      // 2. Filtre Médiums (Mid Peaking à 1200 Hz)
      const midFilter = ctx.createBiquadFilter();
      midFilter.type = 'peaking';
      midFilter.frequency.value = 1200;
      midFilter.Q.value = 1.0;
      midFilter.gain.value = t.eq_settings?.mid || 0;

      // 3. Filtre Aigus (Treble High-Shelf à 3500 Hz)
      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 3500;
      trebleFilter.gain.value = t.eq_settings?.treble || 0;

      // 4. Gain de la piste (Volume + Gestion Mute / Solo)
      const gainNode = ctx.createGain();
      const isMutedEffective = t.is_muted || (hasSolo && !t.is_solo);
      gainNode.gain.value = isMutedEffective ? 0 : (t.eq_settings?.volume ?? 1.0);

      // Chaîne : Source -> Bass -> Mid -> Treble -> Gain -> Master
      sourceNode
        .connect(bassFilter)
        .connect(midFilter)
        .connect(trebleFilter)
        .connect(gainNode)
        .connect(this.masterGain!);

      // Surveillance du rognage de fin (trim_end) et boucle (trim_start)
      const timeUpdateListener = () => {
        const trimStart = t.trim_start || 0;
        const trimEnd = t.trim_end && t.trim_end > trimStart ? t.trim_end : (t.duration || 999);

        if (audio.currentTime >= trimEnd) {
          audio.currentTime = trimStart;
          if (this.isPlaying) {
            audio.play().catch(() => {});
          }
        }
      };

      audio.addEventListener('timeupdate', timeUpdateListener);

      this.channels.set(t.id, {
        track: t,
        audioElement: audio,
        sourceNode,
        bassFilter,
        midFilter,
        trebleFilter,
        gainNode,
        timeUpdateListener,
      });
    });
  }

  public updateTrackEQ(trackId: string, settings: EQSettings): void {
    const ch = this.channels.get(trackId);
    if (!ch) return;
    ch.bassFilter.gain.value = settings.bass;
    ch.midFilter.gain.value = settings.mid;
    ch.trebleFilter.gain.value = settings.treble;
    ch.gainNode.gain.value = ch.track.is_muted ? 0 : settings.volume;
  }

  public updateTracksState(tracks: AudioTrack[]): void {
    const hasSolo = tracks.some(t => t.is_solo);

    tracks.forEach(t => {
      const ch = this.channels.get(t.id);
      if (!ch) return;
      ch.track = t;

      const isMutedEffective = t.is_muted || (hasSolo && !t.is_solo);
      ch.gainNode.gain.value = isMutedEffective ? 0 : (t.eq_settings?.volume ?? 1.0);
    });
  }

  public async play(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isPlaying = true;
    const playPromises: Promise<void>[] = [];

    this.channels.forEach((ch) => {
      const startSecs = ch.track.trim_start || 0;
      if (ch.audioElement.currentTime < startSecs || ch.audioElement.currentTime >= (ch.track.trim_end || ch.track.duration || 999)) {
        ch.audioElement.currentTime = startSecs;
      }
      playPromises.push(ch.audioElement.play().catch(() => {}));
    });

    await Promise.all(playPromises);
  }

  public pause(): void {
    this.isPlaying = false;
    this.channels.forEach((ch) => {
      ch.audioElement.pause();
    });
  }

  public seek(timeInSeconds: number): void {
    this.channels.forEach((ch) => {
      const start = ch.track.trim_start || 0;
      const end = ch.track.trim_end || ch.track.duration || 999;
      const clamped = Math.max(start, Math.min(start + timeInSeconds, end));
      ch.audioElement.currentTime = clamped;
    });
  }

  public getCurrentPlayheadTime(): number {
    for (const [, ch] of this.channels) {
      if (!ch.audioElement.paused) {
        return ch.audioElement.currentTime;
      }
    }
    return 0;
  }

  public restartAll(): void {
    this.channels.forEach((ch) => {
      ch.audioElement.currentTime = ch.track.trim_start || 0;
      if (this.isPlaying) {
        ch.audioElement.play().catch(() => {});
      }
    });
  }

  public dispose(): void {
    this.isPlaying = false;
    this.channels.forEach((ch) => {
      if (ch.timeUpdateListener) {
        ch.audioElement.removeEventListener('timeupdate', ch.timeUpdateListener);
      }
      ch.audioElement.pause();
      ch.audioElement.src = '';
    });
    this.channels.clear();

    if (this.audioContext) {
      try { this.audioContext.close(); } catch (_) {}
      this.audioContext = null;
    }
  }
}

// 🎛️ Lecteur Simple rétrocompatible
export class FilteredAudioPlayer {
  private engine: MultiTrackAudioEngine = new MultiTrackAudioEngine();

  public init(audioUrlOrBase64: string, eqSettings: EQSettings): HTMLAudioElement {
    const defaultTrack: AudioTrack = {
      id: 'single-track',
      name: 'Piste Principale',
      audio_data: audioUrlOrBase64,
      duration: 60,
      trim_start: 0,
      trim_end: 60,
      is_muted: false,
      eq_settings: eqSettings,
    };
    this.engine.loadTracks([defaultTrack]);
    return new Audio();
  }

  public updateEQ(settings: EQSettings): void {
    this.engine.updateTrackEQ('single-track', settings);
  }

  public play(): Promise<void> {
    return this.engine.play();
  }

  public pause(): void {
    this.engine.pause();
  }

  public seek(sec: number): void {
    this.engine.seek(sec);
  }

  public dispose(): void {
    this.engine.dispose();
  }
}
