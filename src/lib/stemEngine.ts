import { StemMixConfig, StemType, StemSourceChoice } from './types';
import { blobToBase64 } from './audioEngine';

// Chaîne de filtres DSP pour séparer un flux en 4 Stems (Vocals, Drums, Bass, Melody)
class DeckStemProcessor {
  public audioContext: AudioContext;
  public sourceNode: MediaElementAudioSourceNode;
  
  // Stems Gain Nodes
  public vocalsGain: GainNode;
  public drumsGain: GainNode;
  public bassGain: GainNode;
  public melodyGain: GainNode;

  // Filtres Vocals (Mid/Center extraction 300Hz - 3400Hz)
  private vocalFilterLow: BiquadFilterNode;
  private vocalFilterHigh: BiquadFilterNode;
  private vocalPeaking: BiquadFilterNode;

  // Filtres Drums (Percussion pass 60Hz - 220Hz + High transients)
  private drumLowpass: BiquadFilterNode;
  private drumHighpass: BiquadFilterNode;
  private drumSnap: BiquadFilterNode;

  // Filtres Bass (Sub 20Hz - 180Hz)
  private bassFilter1: BiquadFilterNode;
  private bassFilter2: BiquadFilterNode;

  // Filtres Melody (Harmonies, Synths, Highs > 2500Hz + side band)
  private melodyHighpass: BiquadFilterNode;
  private melodyHighShelf: BiquadFilterNode;

  constructor(audioContext: AudioContext, audioElement: HTMLAudioElement) {
    this.audioContext = audioContext;
    this.sourceNode = audioContext.createMediaElementSource(audioElement);

    // 1. Branche VOCALS
    this.vocalFilterLow = audioContext.createBiquadFilter();
    this.vocalFilterLow.type = 'highpass';
    this.vocalFilterLow.frequency.value = 280;

    this.vocalFilterHigh = audioContext.createBiquadFilter();
    this.vocalFilterHigh.type = 'lowpass';
    this.vocalFilterHigh.frequency.value = 3500;

    this.vocalPeaking = audioContext.createBiquadFilter();
    this.vocalPeaking.type = 'peaking';
    this.vocalPeaking.frequency.value = 1500;
    this.vocalPeaking.gain.value = 4.0;
    this.vocalPeaking.Q.value = 1.2;

    this.vocalsGain = audioContext.createGain();
    this.vocalsGain.gain.value = 1.0;

    this.sourceNode
      .connect(this.vocalFilterLow)
      .connect(this.vocalFilterHigh)
      .connect(this.vocalPeaking)
      .connect(this.vocalsGain);

    // 2. Branche DRUMS
    this.drumHighpass = audioContext.createBiquadFilter();
    this.drumHighpass.type = 'highpass';
    this.drumHighpass.frequency.value = 55;

    this.drumLowpass = audioContext.createBiquadFilter();
    this.drumLowpass.type = 'lowpass';
    this.drumLowpass.frequency.value = 220;

    this.drumSnap = audioContext.createBiquadFilter();
    this.drumSnap.type = 'peaking';
    this.drumSnap.frequency.value = 4500;
    this.drumSnap.gain.value = 2.0;

    this.drumsGain = audioContext.createGain();
    this.drumsGain.gain.value = 1.0;

    this.sourceNode
      .connect(this.drumHighpass)
      .connect(this.drumLowpass)
      .connect(this.drumSnap)
      .connect(this.drumsGain);

    // 3. Branche BASS
    this.bassFilter1 = audioContext.createBiquadFilter();
    this.bassFilter1.type = 'lowpass';
    this.bassFilter1.frequency.value = 180;

    this.bassFilter2 = audioContext.createBiquadFilter();
    this.bassFilter2.type = 'lowpass';
    this.bassFilter2.frequency.value = 180;

    this.bassGain = audioContext.createGain();
    this.bassGain.gain.value = 1.0;

    this.sourceNode
      .connect(this.bassFilter1)
      .connect(this.bassFilter2)
      .connect(this.bassGain);

    // 4. Branche MELODY & SYNTHS
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
    if (stem === 'vocals') this.vocalsGain.gain.value = value;
    if (stem === 'drums') this.drumsGain.gain.value = value;
    if (stem === 'bass') this.bassGain.gain.value = value;
    if (stem === 'melody') this.melodyGain.gain.value = value;
  }
}

// 🎛️ Moteur de Mashup & Mixage Multi-Stems (Deck A + Deck B)
export class MashupAudioEngine {
  private audioContext: AudioContext | null = null;
  private deckA: HTMLAudioElement | null = null;
  private deckB: HTMLAudioElement | null = null;
  private processorA: DeckStemProcessor | null = null;
  private processorB: DeckStemProcessor | null = null;
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

      // Destination pour l'enregistrement master direct
      this.mediaDest = this.audioContext.createMediaStreamDestination();
      this.masterGain.connect(this.mediaDest);
    }
    return this.audioContext;
  }

  public loadDecks(urlA: string, urlB: string, config: StemMixConfig): void {
    this.dispose();
    const ctx = this.initContext();

    this.deckA = new Audio();
    this.deckA.crossOrigin = 'anonymous';
    this.deckA.src = urlA;
    this.deckA.loop = true;

    this.deckB = new Audio();
    this.deckB.crossOrigin = 'anonymous';
    this.deckB.src = urlB;
    this.deckB.loop = true;

    this.processorA = new DeckStemProcessor(ctx, this.deckA);
    this.processorB = new DeckStemProcessor(ctx, this.deckB);

    this.processorA.connectToDestination(this.masterGain!);
    this.processorB.connectToDestination(this.masterGain!);

    this.applyStemConfig(config);
  }

  // Appliquer la matrice de mixage Stems
  public applyStemConfig(config: StemMixConfig): void {
    if (!this.processorA || !this.processorB) return;

    const applyStem = (
      stem: StemType,
      source: StemSourceChoice,
      volA: number,
      volB: number,
      isMuted: boolean
    ) => {
      if (isMuted || source === 'none') {
        this.processorA!.setStemGain(stem, 0);
        this.processorB!.setStemGain(stem, 0);
        return;
      }

      if (source === 'A') {
        this.processorA!.setStemGain(stem, volA);
        this.processorB!.setStemGain(stem, 0);
      } else if (source === 'B') {
        this.processorA!.setStemGain(stem, 0);
        this.processorB!.setStemGain(stem, volB);
      } else if (source === 'both') {
        this.processorA!.setStemGain(stem, volA);
        this.processorB!.setStemGain(stem, volB);
      }
    };

    applyStem('vocals', config.vocals.source, config.vocals.volumeA, config.vocals.volumeB, config.vocals.isMuted);
    applyStem('drums', config.drums.source, config.drums.volumeA, config.drums.volumeB, config.drums.isMuted);
    applyStem('bass', config.bass.source, config.bass.volumeA, config.bass.volumeB, config.bass.isMuted);
    applyStem('melody', config.melody.source, config.melody.volumeA, config.melody.volumeB, config.melody.isMuted);
  }

  // Calage BPM & Vitesse Deck B
  public setSpeedB(ratio: number): void {
    this.speedB = Math.max(0.7, Math.min(1.4, ratio));
    if (this.deckB) {
      this.deckB.playbackRate = this.speedB;
    }
  }

  // Calage Décalage Temporel (Offset Deck B)
  public setOffsetB(seconds: number): void {
    this.offsetB = Math.max(0, seconds);
    if (this.deckA && this.deckB) {
      this.deckB.currentTime = (this.deckA.currentTime + this.offsetB) % (this.deckB.duration || 100);
    }
  }

  public async play(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.isPlaying = true;

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
    if (this.deckA) this.deckA.pause();
    if (this.deckB) this.deckB.pause();
  }

  public seek(seconds: number): void {
    if (this.deckA) this.deckA.currentTime = seconds;
    if (this.deckB) this.deckB.currentTime = (seconds + this.offsetB) % (this.deckB.duration || 100);
  }

  public getCurrentTime(): number {
    return this.deckA ? this.deckA.currentTime : 0;
  }

  public getVisualizerData(dataArray: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray);
    }
  }

  // 🔴 Enregistrement direct du Mashup mixé
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
