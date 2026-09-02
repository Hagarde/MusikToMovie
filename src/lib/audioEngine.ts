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
  reverbGain: GainNode;
  delayGain: GainNode;
  timeUpdateListener?: () => void;
}

// Générateur d'impulsion synthétique pour réverbération à convolution
export function createReverbImpulseBuffer(ctx: BaseAudioContext, duration: number = 2.0, decay: number = 2.0): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);
  for (let i = 0; i < length; i++) {
    const n = length - i;
    left[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
    right[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
  }
  return impulse;
}

// 🎛️ Moteur Audio Multi-Pistes (Superposition, Rognage Début/Fin, Mute/Solo, EQ, Reverb & Delay)
export class MultiTrackAudioEngine {
  private audioContext: AudioContext | null = null;
  private channels: Map<string, TrackChannel> = new Map();
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private isPlaying: boolean = false;

  private initAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.audioContext.destination);

      // Bus de réverbération
      this.reverbNode = this.audioContext.createConvolver();
      this.reverbNode.buffer = createReverbImpulseBuffer(this.audioContext, 2.0, 2.0);
      this.reverbNode.connect(this.masterGain);

      // Bus de délai / écho
      this.delayNode = this.audioContext.createDelay(1.0);
      this.delayNode.delayTime.value = 0.25;
      this.delayFeedback = this.audioContext.createGain();
      this.delayFeedback.gain.value = 0.35;
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.masterGain);
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

      // 5. Départs Réverb & Délai
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = t.eq_settings?.reverb || 0;

      const delayGain = ctx.createGain();
      delayGain.gain.value = t.eq_settings?.delay || 0;

      // Chaîne : Source -> Bass -> Mid -> Treble -> Gain -> Master
      sourceNode
        .connect(bassFilter)
        .connect(midFilter)
        .connect(trebleFilter);

      trebleFilter.connect(gainNode).connect(this.masterGain!);
      if (this.reverbNode) trebleFilter.connect(reverbGain).connect(this.reverbNode);
      if (this.delayNode) trebleFilter.connect(delayGain).connect(this.delayNode);

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
        reverbGain,
        delayGain,
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
    if (settings.reverb !== undefined) ch.reverbGain.gain.value = settings.reverb;
    if (settings.delay !== undefined) ch.delayGain.gain.value = settings.delay;
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


// 💽 Export du Mix vers un fichier WAV
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
  const channels: Float32Array[] = [];
  const sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;
  
  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }
  
  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16);         // length = 16
  setUint16(1);          // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);              // block-align
  setUint16(16);         // 16-bit
  
  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length
  
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  while(pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, sample, true); 
      pos += 2;
    }
    offset++;
  }
  
  return new Blob([view], {type: "audio/wav"});
}

export async function exportMixToWav(tracks: AudioTrack[], maxDuration: number): Promise<Blob> {
  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, Math.max(1, Math.ceil(sampleRate * maxDuration)), sampleRate);
  
  // Bus de réverbération dans le rendu offline
  const reverbConvolver = offlineCtx.createConvolver();
  reverbConvolver.buffer = createReverbImpulseBuffer(offlineCtx, 2.0, 2.0);
  reverbConvolver.connect(offlineCtx.destination);

  // Bus de délai dans le rendu offline
  const delayNode = offlineCtx.createDelay(1.0);
  delayNode.delayTime.value = 0.25;
  const delayFeedback = offlineCtx.createGain();
  delayFeedback.gain.value = 0.35;
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayNode.connect(offlineCtx.destination);

  const hasSolo = tracks.some(t => t.is_solo);
  
  for (const t of tracks) {
    if (!t.audio_data) continue;
    const isMuted = t.is_muted || (hasSolo && !t.is_solo);
    if (isMuted) continue;
    
    try {
      const blob = base64ToBlob(t.audio_data);
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = await offlineCtx.decodeAudioData(arrayBuffer);
      
      const source = offlineCtx.createBufferSource();
      source.buffer = buffer;
      
      const bass = offlineCtx.createBiquadFilter();
      bass.type = 'lowshelf'; bass.frequency.value = 200; bass.gain.value = t.eq_settings?.bass || 0;
      
      const mid = offlineCtx.createBiquadFilter();
      mid.type = 'peaking'; mid.frequency.value = 1200; mid.Q.value = 1.0; mid.gain.value = t.eq_settings?.mid || 0;
      
      const treble = offlineCtx.createBiquadFilter();
      treble.type = 'highshelf'; treble.frequency.value = 3500; treble.gain.value = t.eq_settings?.treble || 0;
      
      const gain = offlineCtx.createGain();
      gain.gain.value = t.eq_settings?.volume ?? 1.0;
      
      source.connect(bass).connect(mid).connect(treble);
      treble.connect(gain).connect(offlineCtx.destination);

      if (t.eq_settings?.reverb) {
        const revGain = offlineCtx.createGain();
        revGain.gain.value = t.eq_settings.reverb;
        treble.connect(revGain).connect(reverbConvolver);
      }

      if (t.eq_settings?.delay) {
        const delGain = offlineCtx.createGain();
        delGain.gain.value = t.eq_settings.delay;
        treble.connect(delGain).connect(delayNode);
      }
      
      const offset = t.start_offset || 0;
      const trimStart = t.trim_start || 0;
      const trimEnd = t.trim_end || t.duration;
      const duration = Math.max(0.1, trimEnd - trimStart);
      
      source.start(offset, trimStart, duration);
    } catch (e) {
      console.error("Erreur mix track", t.name, e);
    }
  }
  
  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWavBlob(renderedBuffer);
}

// 🔊 Synthèse procédurale de bruitages cinématiques (SFX)
export async function generateCinematicSFX(
  type: 'thunder' | 'rain' | 'click' | 'laser' | 'nebula'
): Promise<Blob> {
  const sampleRate = 44100;
  const duration = type === 'rain' ? 4.0 : type === 'nebula' ? 3.5 : type === 'thunder' ? 3.0 : 0.8;
  const ctx = new OfflineAudioContext(2, Math.floor(sampleRate * duration), sampleRate);

  if (type === 'thunder') {
    const noiseBuffer = ctx.createBuffer(2, Math.floor(sampleRate * duration), sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = noiseBuffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.9;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, 0);
    filter.frequency.exponentialRampToValueAtTime(60, duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.0, 0);
    gain.gain.exponentialRampToValueAtTime(0.01, duration);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(0);
  } else if (type === 'rain') {
    const noiseBuffer = ctx.createBuffer(2, Math.floor(sampleRate * duration), sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = noiseBuffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.8;
    noise.connect(filter).connect(ctx.destination);
    noise.start(0);
  } else if (type === 'laser') {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, 0);
    osc.frequency.exponentialRampToValueAtTime(80, 0.35);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, 0);
    gain.gain.exponentialRampToValueAtTime(0.01, 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(0);
    osc.stop(0.35);
  } else if (type === 'click') {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(3000, 0);
    osc.frequency.exponentialRampToValueAtTime(200, 0.04);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, 0);
    gain.gain.exponentialRampToValueAtTime(0.01, 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start(0);
    osc.stop(0.04);
  } else {
    // Nebula / Accord ambiant
    [261.63, 329.63, 392.00, 523.25].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, 0);
      gain.gain.exponentialRampToValueAtTime(0.005, duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(0);
      osc.stop(duration);
    });
  }

  const rendered = await ctx.startRendering();
  return audioBufferToWavBlob(rendered);
}
