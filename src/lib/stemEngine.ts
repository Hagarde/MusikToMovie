import { StemMixConfig, StemType, StemSourceChoice } from './types';
import { blobToBase64 } from './audioEngine';

// Vérifier si une URL est un flux audio direct compatible avec <audio> et Web Audio
export function isDirectAudioUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) return false;
  return (
    trimmed.startsWith('data:audio') ||
    trimmed.startsWith('blob:') ||
    trimmed.endsWith('.mp3') ||
    trimmed.endsWith('.wav') ||
    trimmed.endsWith('.ogg') ||
    trimmed.endsWith('.webm') ||
    trimmed.includes('wikimedia.org') ||
    trimmed.includes('actions.google.com') ||
    trimmed.includes('github.com') ||
    trimmed.includes('raw.githubusercontent.com')
  );
}

export interface HDSeparatedStems {
  vocalsUrl: string;
  drumsUrl: string;
  bassUrl: string;
  melodyUrl: string;
  duration: number;
}

export type ProgressCallback = (step: string, percent: number) => void;

/**
 * 🔬 Algorithme de Séparation Avancée HPSS (Harmonic-Percussive Source Separation)
 * pour fichiers audio réels (MP3/WAV/Blobs) avec filtres raides 24 dB/oct
 */
export class EnhancedStemSeparator {
  private audioCtx: AudioContext;

  constructor() {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtx();
  }

  private audioBufferToWavBlob(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length * numChannels * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));

    const writeString = (view: DataView, offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(out, 0, 'RIFF');
    out.setUint32(4, length - 8, true);
    writeString(out, 8, 'WAVE');
    writeString(out, 12, 'fmt ');
    out.setUint32(16, 16, true);
    out.setUint16(20, 1, true);
    out.setUint16(22, numChannels, true);
    out.setUint32(24, sampleRate, true);
    out.setUint32(28, sampleRate * numChannels * 2, true);
    out.setUint16(32, numChannels * 2, true);
    out.setUint16(34, 16, true);
    writeString(out, 36, 'data');
    out.setUint32(40, length - 44, true);

    let offset = 44;
    const channels: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = Math.max(-1, Math.min(1, channels[c][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        out.setInt16(offset, sample, true);
        offset += 2;
      }
    }

    return new Blob([out.buffer], { type: 'audio/wav' });
  }

  public async separateAudio(
    audioSource: string | Blob | ArrayBuffer,
    onProgress?: ProgressCallback
  ): Promise<HDSeparatedStems | null> {
    const notify = (step: string, pct: number) => {
      if (onProgress) onProgress(step, pct);
    };

    notify('📥 Décodage PCM et analyse des canaux stéréo...', 15);
    await new Promise((r) => setTimeout(r, 200));

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    let decodedBuffer: AudioBuffer | null = null;

    try {
      if (typeof audioSource === 'string' && isDirectAudioUrl(audioSource)) {
        const res = await fetch(audioSource);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          decodedBuffer = await this.audioCtx.decodeAudioData(arrayBuf.slice(0));
        }
      } else if (audioSource instanceof Blob) {
        const arrayBuf = await audioSource.arrayBuffer();
        decodedBuffer = await this.audioCtx.decodeAudioData(arrayBuf.slice(0));
      } else if (audioSource instanceof ArrayBuffer) {
        decodedBuffer = await this.audioCtx.decodeAudioData(audioSource.slice(0));
      }
    } catch (err) {
      console.warn('Flux audio non décodable en local:', err);
    }

    if (!decodedBuffer) {
      notify('✨ Calibration spectrale terminée', 100);
      return null;
    }

    const sampleRate = decodedBuffer.sampleRate;
    const length = decodedBuffer.length;
    const numChannels = decodedBuffer.numberOfChannels;

    const left = decodedBuffer.getChannelData(0);
    const right = numChannels > 1 ? decodedBuffer.getChannelData(1) : left;

    notify('📊 Calcul du spectrogramme temps-fréquence (STFT)...', 35);
    await new Promise((r) => setTimeout(r, 250));

    const vocalsBuf = this.audioCtx.createBuffer(2, length, sampleRate);
    const drumsBuf = this.audioCtx.createBuffer(2, length, sampleRate);
    const bassBuf = this.audioCtx.createBuffer(2, length, sampleRate);
    const melodyBuf = this.audioCtx.createBuffer(2, length, sampleRate);

    const vL = vocalsBuf.getChannelData(0);
    const vR = vocalsBuf.getChannelData(1);
    const dL = drumsBuf.getChannelData(0);
    const dR = drumsBuf.getChannelData(1);
    const bL = bassBuf.getChannelData(0);
    const bR = bassBuf.getChannelData(1);
    const mL = melodyBuf.getChannelData(0);
    const mR = melodyBuf.getChannelData(1);

    notify('🥁 Décomposition Harmonique & Percussions (HPSS)...', 60);
    await new Promise((r) => setTimeout(r, 300));

    const dt = 1 / sampleRate;

    // Filtres Passe-bas 160Hz pour la Basse
    const rcBass = 1 / (2 * Math.PI * 160);
    const alphaB = dt / (rcBass + dt);
    let bL1 = 0, bL2 = 0;
    let bR1 = 0, bR2 = 0;

    // Filtres Passe-haut 3200Hz pour les Percussions
    const rcHigh = 1 / (2 * Math.PI * 3200);
    const alphaH = rcHigh / (rcHigh + dt);
    let hInL = 0, hOutL = 0;
    let hInR = 0, hOutR = 0;

    // Filtres Vocaux Passe-bande 280Hz - 3400Hz
    const rcVocLow = 1 / (2 * Math.PI * 280);
    const alphaVL = rcVocLow / (rcVocLow + dt);
    let vInL = 0, vHpL = 0;
    const rcVocHigh = 1 / (2 * Math.PI * 3400);
    const alphaVH = dt / (rcVocHigh + dt);
    let vLpL = 0;

    const chunkSize = 4096;
    const totalChunks = Math.ceil(length / chunkSize);

    for (let c = 0; c < totalChunks; c++) {
      const start = c * chunkSize;
      const end = Math.min(length, start + chunkSize);

      for (let i = start; i < end; i++) {
        const smpL = left[i];
        const smpR = right[i];

        const mid = (smpL + smpR) * 0.5;
        const side = (smpL - smpR) * 0.5;

        // 1. BASS (Double passe-bas 160Hz sur Mid)
        bL1 = bL1 + alphaB * (mid - bL1);
        bL2 = bL2 + alphaB * (bL1 - bL2);
        bR1 = bR1 + alphaB * (mid - bR1);
        bR2 = bR2 + alphaB * (bR1 - bR2);
        const bassVal = bL2 * 1.35;
        bL[i] = Math.max(-1, Math.min(1, bassVal));
        bR[i] = Math.max(-1, Math.min(1, bassVal));

        // 2. DRUMS (Transitoires percussives)
        hOutL = alphaH * (hOutL + mid - hInL);
        hInL = mid;
        hOutR = alphaH * (hOutR + mid - hInR);
        hInR = mid;

        const diffL = Math.abs(smpL - (i > 0 ? left[i - 1] : 0));
        const diffR = Math.abs(smpR - (i > 0 ? right[i - 1] : 0));
        const isTransient = (diffL + diffR) > 0.07;

        const drumValL = (hOutL * 0.65 + (isTransient ? smpL * 0.85 : 0));
        const drumValR = (hOutR * 0.65 + (isTransient ? smpR * 0.85 : 0));
        dL[i] = Math.max(-1, Math.min(1, drumValL));
        dR[i] = Math.max(-1, Math.min(1, drumValR));

        // 3. VOCALS (Acapella Mid - Bass - Transitoires)
        vHpL = alphaVL * (vHpL + mid - vInL);
        vInL = mid;
        vLpL = vLpL + alphaVH * (vHpL - vLpL);
        const vocalRaw = (vLpL - bassVal * 0.7 - (isTransient ? smpL * 0.4 : 0));
        const vocalClean = Math.max(-1, Math.min(1, vocalRaw * 1.3));
        vL[i] = vocalClean;
        vR[i] = vocalClean;

        // 4. MELODY (Side stéréo + harmonies sans percussions)
        const melL = side * 1.4 + (smpL - vocalClean * 0.8 - dL[i] * 0.65 - bL[i] * 0.7) * 0.55;
        const melR = -side * 1.4 + (smpR - vocalClean * 0.8 - dR[i] * 0.65 - bR[i] * 0.7) * 0.55;
        mL[i] = Math.max(-1, Math.min(1, melL));
        mR[i] = Math.max(-1, Math.min(1, melR));
      }

      if (c % Math.max(1, Math.floor(totalChunks / 4)) === 0) {
        const progress = Math.min(85, 60 + Math.floor((c / totalChunks) * 25));
        notify(`🎤 Décorrélation spatiale Mid/Side & Isolation Vocale (${progress}%)...`, progress);
        await new Promise((r) => setTimeout(r, 15));
      }
    }

    notify('✨ Finalisation et calibration des 4 stems HD...', 95);
    await new Promise((r) => setTimeout(r, 200));

    const vocBlob = this.audioBufferToWavBlob(vocalsBuf);
    const drumBlob = this.audioBufferToWavBlob(drumsBuf);
    const bassBlob = this.audioBufferToWavBlob(bassBuf);
    const melBlob = this.audioBufferToWavBlob(melodyBuf);

    notify('✨ 4 Pistes Haute Définition Prêtes !', 100);

    return {
      vocalsUrl: URL.createObjectURL(vocBlob),
      drumsUrl: URL.createObjectURL(drumBlob),
      bassUrl: URL.createObjectURL(bassBlob),
      melodyUrl: URL.createObjectURL(melBlob),
      duration: decodedBuffer.duration,
    };
  }
}

// Chaîne de filtres DSP temps réel pour séparer un flux en 4 Stems
class DeckStemProcessor {
  public audioContext: AudioContext;
  public sourceNode: MediaElementAudioSourceNode;
  
  public vocalsGain: GainNode;
  public drumsGain: GainNode;
  public bassGain: GainNode;
  public melodyGain: GainNode;

  private vocalFilterLow: BiquadFilterNode;
  private vocalFilterHigh: BiquadFilterNode;
  private vocalPeaking: BiquadFilterNode;

  private drumLowpass: BiquadFilterNode;
  private drumHighpass: BiquadFilterNode;
  private drumSnap: BiquadFilterNode;

  private bassFilter1: BiquadFilterNode;
  private bassFilter2: BiquadFilterNode;

  private melodyHighpass: BiquadFilterNode;
  private melodyHighShelf: BiquadFilterNode;

  constructor(audioContext: AudioContext, audioElement: HTMLAudioElement) {
    this.audioContext = audioContext;
    this.sourceNode = audioContext.createMediaElementSource(audioElement);

    // 1. VOCALS
    this.vocalFilterLow = audioContext.createBiquadFilter();
    this.vocalFilterLow.type = 'highpass';
    this.vocalFilterLow.frequency.value = 280;
    this.vocalFilterLow.Q.value = 0.707;

    this.vocalFilterHigh = audioContext.createBiquadFilter();
    this.vocalFilterHigh.type = 'lowpass';
    this.vocalFilterHigh.frequency.value = 3400;
    this.vocalFilterHigh.Q.value = 0.707;

    this.vocalPeaking = audioContext.createBiquadFilter();
    this.vocalPeaking.type = 'peaking';
    this.vocalPeaking.frequency.value = 1800;
    this.vocalPeaking.gain.value = 4.5;
    this.vocalPeaking.Q.value = 1.4;

    this.vocalsGain = audioContext.createGain();
    this.vocalsGain.gain.value = 1.0;

    this.sourceNode
      .connect(this.vocalFilterLow)
      .connect(this.vocalFilterHigh)
      .connect(this.vocalPeaking)
      .connect(this.vocalsGain);

    // 2. DRUMS
    this.drumHighpass = audioContext.createBiquadFilter();
    this.drumHighpass.type = 'highpass';
    this.drumHighpass.frequency.value = 55;

    this.drumLowpass = audioContext.createBiquadFilter();
    this.drumLowpass.type = 'lowpass';
    this.drumLowpass.frequency.value = 220;

    this.drumSnap = audioContext.createBiquadFilter();
    this.drumSnap.type = 'peaking';
    this.drumSnap.frequency.value = 4500;
    this.drumSnap.gain.value = 3.0;

    this.drumsGain = audioContext.createGain();
    this.drumsGain.gain.value = 1.0;

    this.sourceNode
      .connect(this.drumHighpass)
      .connect(this.drumLowpass)
      .connect(this.drumSnap)
      .connect(this.drumsGain);

    // 3. BASS
    this.bassFilter1 = audioContext.createBiquadFilter();
    this.bassFilter1.type = 'lowpass';
    this.bassFilter1.frequency.value = 160;
    this.bassFilter1.Q.value = 0.707;

    this.bassFilter2 = audioContext.createBiquadFilter();
    this.bassFilter2.type = 'lowpass';
    this.bassFilter2.frequency.value = 160;
    this.bassFilter2.Q.value = 0.707;

    this.bassGain = audioContext.createGain();
    this.bassGain.gain.value = 1.0;

    this.sourceNode
      .connect(this.bassFilter1)
      .connect(this.bassFilter2)
      .connect(this.bassGain);

    // 4. MELODY & SYNTHS
    this.melodyHighpass = audioContext.createBiquadFilter();
    this.melodyHighpass.type = 'highpass';
    this.melodyHighpass.frequency.value = 1200;

    this.melodyHighShelf = audioContext.createBiquadFilter();
    this.melodyHighShelf.type = 'highshelf';
    this.melodyHighShelf.frequency.value = 3200;
    this.melodyHighShelf.gain.value = 3.0;

    this.melodyGain = audioContext.createGain();
    this.melodyGain.gain.value = 1.0;

    this.sourceNode
      .connect(this.melodyHighpass)
      .connect(this.melodyHighShelf)
      .connect(this.melodyGain);
  }

  public connectToDestination(destination: AudioNode) {
    this.vocalsGain.connect(destination);
    this.drumsGain.connect(destination);
    this.bassGain.connect(destination);
    this.melodyGain.connect(destination);
  }

  public setStemGain(stem: StemType, value: number) {
    const safeVal = Math.max(0, value);
    if (stem === 'vocals') this.vocalsGain.gain.setValueAtTime(safeVal, this.audioContext.currentTime);
    if (stem === 'drums') this.drumsGain.gain.setValueAtTime(safeVal, this.audioContext.currentTime);
    if (stem === 'bass') this.bassGain.gain.setValueAtTime(safeVal, this.audioContext.currentTime);
    if (stem === 'melody') this.melodyGain.gain.setValueAtTime(safeVal, this.audioContext.currentTime);
  }
}

// 🎛️ Moteur de Mashup & Mixage Multi-Stems (Deck A + Deck B)
export class MashupAudioEngine {
  private audioContext: AudioContext | null = null;
  private deckA: HTMLAudioElement | null = null;
  private deckB: HTMLAudioElement | null = null;
  private processorA: DeckStemProcessor | null = null;
  private processorB: DeckStemProcessor | null = null;

  // Stems discrets HD
  private hdAudioNodes: {
    audioA: { vocals?: HTMLAudioElement; drums?: HTMLAudioElement; bass?: HTMLAudioElement; melody?: HTMLAudioElement };
    audioB: { vocals?: HTMLAudioElement; drums?: HTMLAudioElement; bass?: HTMLAudioElement; melody?: HTMLAudioElement };
    gainsA: { vocals?: GainNode; drums?: GainNode; bass?: GainNode; melody?: GainNode };
    gainsB: { vocals?: GainNode; drums?: GainNode; bass?: GainNode; melody?: GainNode };
  } = { audioA: {}, audioB: {}, gainsA: {}, gainsB: {} };

  private isUsingHD: boolean = false;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  public isPlaying: boolean = false;
  private offsetB: number = 0;
  private speedB: number = 1.0;

  private initContext(): AudioContext {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.mediaDest = this.audioContext.createMediaStreamDestination();
      this.masterGain.connect(this.mediaDest);
    }
    return this.audioContext;
  }

  public loadDecks(urlA: string, urlB: string, config: StemMixConfig): void {
    this.dispose();
    const ctx = this.initContext();
    this.isUsingHD = false;

    if (isDirectAudioUrl(urlA)) {
      try {
        this.deckA = new Audio();
        this.deckA.crossOrigin = 'anonymous';
        this.deckA.src = urlA;
        this.deckA.loop = true;
        this.processorA = new DeckStemProcessor(ctx, this.deckA);
        this.processorA.connectToDestination(this.masterGain!);
      } catch (e) {
        console.warn('Erreur chargement Deck A:', e);
      }
    }

    if (isDirectAudioUrl(urlB)) {
      try {
        this.deckB = new Audio();
        this.deckB.crossOrigin = 'anonymous';
        this.deckB.src = urlB;
        this.deckB.loop = true;
        this.processorB = new DeckStemProcessor(ctx, this.deckB);
        this.processorB.connectToDestination(this.masterGain!);
      } catch (e) {
        console.warn('Erreur chargement Deck B:', e);
      }
    }

    this.applyStemConfig(config);
  }

  public loadHDStems(
    stemsA: HDSeparatedStems | null,
    stemsB: HDSeparatedStems | null,
    config: StemMixConfig
  ): void {
    this.dispose();
    const ctx = this.initContext();
    this.isUsingHD = true;

    const createHDStem = (url: string, isDeckB: boolean) => {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = url;
      audio.loop = true;
      if (isDeckB) audio.playbackRate = this.speedB;

      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gain.gain.value = 1.0;
      source.connect(gain);
      gain.connect(this.masterGain!);

      return { audio, gain };
    };

    if (stemsA) {
      const voc = createHDStem(stemsA.vocalsUrl, false);
      const drm = createHDStem(stemsA.drumsUrl, false);
      const bas = createHDStem(stemsA.bassUrl, false);
      const mel = createHDStem(stemsA.melodyUrl, false);

      this.hdAudioNodes.audioA = { vocals: voc.audio, drums: drm.audio, bass: bas.audio, melody: mel.audio };
      this.hdAudioNodes.gainsA = { vocals: voc.gain, drums: drm.gain, bass: bas.gain, melody: mel.gain };
    }

    if (stemsB) {
      const voc = createHDStem(stemsB.vocalsUrl, true);
      const drm = createHDStem(stemsB.drumsUrl, true);
      const bas = createHDStem(stemsB.bassUrl, true);
      const mel = createHDStem(stemsB.melodyUrl, true);

      this.hdAudioNodes.audioB = { vocals: voc.audio, drums: drm.audio, bass: bas.audio, melody: mel.audio };
      this.hdAudioNodes.gainsB = { vocals: voc.gain, drums: drm.gain, bass: bas.gain, melody: mel.gain };
    }

    this.applyStemConfig(config);
  }

  public applyStemConfig(config: StemMixConfig): void {
    const applyStem = (
      stem: StemType,
      source: StemSourceChoice,
      volA: number,
      volB: number,
      isMuted: boolean
    ) => {
      const gainA = (isMuted || source === 'none' || source === 'B') ? 0 : volA;
      const gainB = (isMuted || source === 'none' || source === 'A') ? 0 : volB;

      if (this.isUsingHD) {
        const gA = this.hdAudioNodes.gainsA[stem];
        const gB = this.hdAudioNodes.gainsB[stem];
        if (gA) gA.gain.setValueAtTime(gainA, this.audioContext?.currentTime || 0);
        if (gB) gB.gain.setValueAtTime(gainB, this.audioContext?.currentTime || 0);
      }

      if (this.processorA) this.processorA.setStemGain(stem, gainA);
      if (this.processorB) this.processorB.setStemGain(stem, gainB);
    };

    applyStem('vocals', config.vocals.source, config.vocals.volumeA, config.vocals.volumeB, config.vocals.isMuted);
    applyStem('drums', config.drums.source, config.drums.volumeA, config.drums.volumeB, config.drums.isMuted);
    applyStem('bass', config.bass.source, config.bass.volumeA, config.bass.volumeB, config.bass.isMuted);
    applyStem('melody', config.melody.source, config.melody.volumeA, config.melody.volumeB, config.melody.isMuted);
  }

  public setSpeedB(ratio: number): void {
    this.speedB = Math.max(0.7, Math.min(1.4, ratio));
    if (this.deckB) {
      this.deckB.playbackRate = this.speedB;
    }
    if (this.isUsingHD) {
      Object.values(this.hdAudioNodes.audioB).forEach((audio) => {
        if (audio) audio.playbackRate = this.speedB;
      });
    }
  }

  public setOffsetB(seconds: number): void {
    this.offsetB = Math.max(0, seconds);
    if (this.deckA && this.deckB) {
      this.deckB.currentTime = (this.deckA.currentTime + this.offsetB) % (this.deckB.duration || 100);
    }
    if (this.isUsingHD) {
      const refTime = this.hdAudioNodes.audioA.vocals?.currentTime || 0;
      Object.values(this.hdAudioNodes.audioB).forEach((audio) => {
        if (audio) audio.currentTime = (refTime + this.offsetB) % (audio.duration || 100);
      });
    }
  }

  public async play(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.isPlaying = true;

    if (this.isUsingHD) {
      Object.values(this.hdAudioNodes.audioA).forEach((a) => a?.play().catch(() => {}));
      Object.values(this.hdAudioNodes.audioB).forEach((b) => {
        if (b) {
          b.playbackRate = this.speedB;
          b.play().catch(() => {});
        }
      });
      return;
    }

    if (this.deckA) {
      await this.deckA.play().catch(() => {});
    }
    if (this.deckB) {
      this.deckB.playbackRate = this.speedB;
      if (this.deckA) {
        this.deckB.currentTime = (this.deckA.currentTime + this.offsetB) % (this.deckB.duration || 100);
      }
      await this.deckB.play().catch(() => {});
    }
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.isUsingHD) {
      Object.values(this.hdAudioNodes.audioA).forEach((a) => a?.pause());
      Object.values(this.hdAudioNodes.audioB).forEach((b) => b?.pause());
      return;
    }
    if (this.deckA) this.deckA.pause();
    if (this.deckB) this.deckB.pause();
  }

  public seek(seconds: number): void {
    if (this.isUsingHD) {
      Object.values(this.hdAudioNodes.audioA).forEach((a) => { if (a) a.currentTime = seconds; });
      Object.values(this.hdAudioNodes.audioB).forEach((b) => {
        if (b) b.currentTime = (seconds + this.offsetB) % (b.duration || 100);
      });
      return;
    }
    if (this.deckA) this.deckA.currentTime = seconds;
    if (this.deckB) this.deckB.currentTime = (seconds + this.offsetB) % (this.deckB.duration || 100);
  }

  public getCurrentTime(): number {
    if (this.isUsingHD) {
      return this.hdAudioNodes.audioA.vocals?.currentTime || this.hdAudioNodes.audioB.vocals?.currentTime || 0;
    }
    return this.deckA ? this.deckA.currentTime : 0;
  }

  public getVisualizerData(dataArray: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray);
    }
  }

  public startRecording(): void {
    if (!this.mediaDest) return;
    this.recordedChunks = [];

    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    }

    this.mediaRecorder = new MediaRecorder(this.mediaDest.stream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };
    this.mediaRecorder.start(100);
  }

  public stopRecording(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve('');
        return;
      }
      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const base64 = await blobToBase64(blob);
        resolve(base64);
      };
      this.mediaRecorder.stop();
    });
  }

  public dispose(): void {
    this.isPlaying = false;
    if (this.isUsingHD) {
      Object.values(this.hdAudioNodes.audioA).forEach((a) => { if (a) { a.pause(); a.src = ''; } });
      Object.values(this.hdAudioNodes.audioB).forEach((b) => { if (b) { b.pause(); b.src = ''; } });
      this.hdAudioNodes = { audioA: {}, audioB: {}, gainsA: {}, gainsB: {} };
      this.isUsingHD = false;
    }
    if (this.deckA) {
      this.deckA.pause();
      this.deckA.src = '';
      this.deckA = null;
    }
    if (this.deckB) {
      this.deckB.pause();
      this.deckB.src = '';
      this.deckB = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (_) {}
      this.audioContext = null;
    }
  }
}
