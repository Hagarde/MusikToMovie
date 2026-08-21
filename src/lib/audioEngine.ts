import { EQSettings } from './types';

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

// 🎛️ Lecteur Audio avec Mixeur EQ 3 Bandes temps réel (Web Audio API)
export class FilteredAudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;

  public init(audioUrlOrBase64: string, eqSettings: EQSettings): HTMLAudioElement {
    this.dispose();

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx();

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.src = audioUrlOrBase64;
    this.audioElement.loop = true;

    this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);

    // 1. Filtre Graves (Bass Low-Shelf à 200 Hz)
    this.bassFilter = this.audioContext.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 200;
    this.bassFilter.gain.value = eqSettings.bass;

    // 2. Filtre Médiums (Mid Peaking à 1200 Hz)
    this.midFilter = this.audioContext.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 1200;
    this.midFilter.Q.value = 1.0;
    this.midFilter.gain.value = eqSettings.mid;

    // 3. Filtre Aigus (Treble High-Shelf à 3500 Hz)
    this.trebleFilter = this.audioContext.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 3500;
    this.trebleFilter.gain.value = eqSettings.treble;

    // 4. Volume Master (Gain)
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = eqSettings.volume;

    // Chaîne de traitement : Source -> Bass -> Mid -> Treble -> Gain -> Haut-parleurs
    this.sourceNode
      .connect(this.bassFilter)
      .connect(this.midFilter)
      .connect(this.trebleFilter)
      .connect(this.gainNode)
      .connect(this.audioContext.destination);

    return this.audioElement;
  }

  public updateEQ(settings: EQSettings): void {
    if (this.bassFilter) this.bassFilter.gain.value = settings.bass;
    if (this.midFilter) this.midFilter.gain.value = settings.mid;
    if (this.trebleFilter) this.trebleFilter.gain.value = settings.treble;
    if (this.gainNode) this.gainNode.gain.value = settings.volume;
  }

  public async play(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    if (this.audioElement) {
      await this.audioElement.play();
    }
  }

  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  public seek(timeInSeconds: number): void {
    if (this.audioElement) {
      this.audioElement.currentTime = timeInSeconds;
    }
  }

  public dispose(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (_) {}
      this.audioContext = null;
    }
  }
}
