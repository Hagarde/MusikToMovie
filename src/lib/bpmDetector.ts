/**
 * 🥁 Détecteur de BPM Hybride & Moteur de Synchronisation Temporelle
 * 1. Détection ultra-rapide par métadonnées / nom de dossier Demucs [124 BPM]
 * 2. Moteur C++ / WebAssembly (web-audio-beat-detector) chargé dynamiquement à la demande
 * 3. Moteur de repli DSP Web Audio instantané
 */

export interface BPMDetectionResult {
  bpm: number;
  confidence: number;
  label: string;
  source: 'demucs_tag' | 'wasm_engine' | 'dsp_engine';
}

export interface TempoSyncResult {
  ratio: number;
  targetBpm: number;
  displayRatio: string;
  matchType: 'direct' | 'half' | 'double';
  description: string;
}

/**
 * 🏷️ Extraction immédiate du BPM depuis le nom du fichier ou dossier
 * Ex: "Jaymee - Princes de la Ville [124 BPM]" ou "track_128bpm.wav"
 */
export function extractBpmFromFilename(name: string): number | null {
  if (!name || typeof name !== 'string') return null;
  
  // Regex pour attraper [124 BPM], (128 bpm), 120BPM, _124bpm_, etc.
  const regexes = [
    /\[(\d{2,3})\s*bpm\]/i,
    /\((\d{2,3})\s*bpm\)/i,
    /[_\s-](\d{2,3})\s*bpm[_\s-.]/i,
    /(\d{2,3})\s*bpm/i,
  ];

  for (const reg of regexes) {
    const match = name.match(reg);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      if (val >= 50 && val <= 220) {
        return val;
      }
    }
  }
  return null;
}

/**
 * Détermine le genre / style probable à partir du BPM
 */
export function getTempoLabel(bpm: number): string {
  if (bpm <= 0) return 'Inconnu';
  if (bpm < 80) return 'Lent / Downtempo / Soul';
  if (bpm < 100) return 'Hip-Hop / Boom-Bap / Trap';
  if (bpm < 115) return 'Pop / R&B / Reggaeton';
  if (bpm < 130) return 'House / Disco / Dance';
  if (bpm < 145) return 'Techno / Trance / Electro';
  if (bpm < 160) return 'Rock / Punk / Fast Electro';
  return 'Drum & Bass / Jungle / Hardcore';
}

/**
 * 🔬 Solution 2 : Moteur C++ / WebAssembly (web-audio-beat-detector)
 * Chargé uniquement de façon asynchrone et dynamique pour ne pas bloquer le reste du site
 */
async function detectWithWasmEngine(audioBuffer: AudioBuffer): Promise<number | null> {
  try {
    const { analyze } = await import('web-audio-beat-detector');
    const tempo = await analyze(audioBuffer);
    if (tempo && typeof tempo === 'number' && tempo >= 50 && tempo <= 220) {
      return Math.round(tempo);
    }
  } catch (err) {
    console.warn('Moteur Wasm / C++ indisponible, passage au DSP natif:', err);
  }
  return null;
}

/**
 * Extrait un AudioBuffer à partir d'une source audio variée (URL, Blob, File, ArrayBuffer)
 */
export async function getAudioBufferFromSource(
  source: AudioBuffer | Blob | File | ArrayBuffer | string
): Promise<AudioBuffer | null> {
  if (source instanceof AudioBuffer) {
    return source;
  }

  let arrayBuffer: ArrayBuffer | null = null;

  if (typeof source === 'string') {
    if (!source || source.trim() === '') return null;
    try {
      const response = await fetch(source);
      if (!response.ok) return null;
      arrayBuffer = await response.arrayBuffer();
    } catch (e) {
      return null;
    }
  } else if (source instanceof Blob || source instanceof File) {
    try {
      arrayBuffer = await source.arrayBuffer();
    } catch (e) {
      return null;
    }
  } else if (source instanceof ArrayBuffer) {
    arrayBuffer = source;
  }

  if (!arrayBuffer) return null;

  try {
    const decoderCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    try {
      const decoded = await decoderCtx.decodeAudioData(arrayBuffer.slice(0));
      return decoded;
    } finally {
      try {
        await decoderCtx.close();
      } catch (_) {}
    }
  } catch (err) {
    return null;
  }
}

/**
 * 🔬 Algorithme DSP de repli (Fallback Energy Flux & Interval Histogram)
 */
function detectWithDSPFallback(buffer: AudioBuffer): number {
  const sampleRate = buffer.sampleRate;
  const totalDuration = buffer.duration;
  const analysisDuration = Math.min(40, totalDuration);
  const startOffset = totalDuration > 30 ? Math.min(10, totalDuration - analysisDuration) : 0;

  const startSample = Math.floor(startOffset * sampleRate);
  const sampleCount = Math.floor(analysisDuration * sampleRate);

  const monoData = new Float32Array(sampleCount);
  const channel0 = buffer.getChannelData(0);
  const channel1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;

  for (let i = 0; i < sampleCount; i++) {
    const idx = startSample + i;
    if (idx < buffer.length) {
      monoData[i] = channel1 ? (channel0[idx] + channel1[idx]) * 0.5 : channel0[idx];
    }
  }

  // Filtrage passe-bas 140Hz
  const cutoff = 140;
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoff);
  const alpha = dt / (rc + dt);

  const filtered = new Float32Array(sampleCount);
  let prev = 0;
  for (let i = 0; i < sampleCount; i++) {
    prev = prev + alpha * (monoData[i] - prev);
    filtered[i] = prev;
  }

  const windowSize = Math.floor(sampleRate * 0.01);
  const hopSize = Math.floor(sampleRate * 0.005);
  const numFrames = Math.floor((sampleCount - windowSize) / hopSize);

  if (numFrames < 100) return 120;

  const energy = new Float32Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    let sum = 0;
    const offset = f * hopSize;
    for (let w = 0; w < windowSize; w++) {
      const val = filtered[offset + w];
      sum += val * val;
    }
    energy[f] = Math.sqrt(sum / windowSize);
  }

  const flux = new Float32Array(numFrames);
  for (let i = 1; i < numFrames; i++) {
    const diff = energy[i] - energy[i - 1];
    flux[i] = diff > 0 ? diff : 0;
  }

  let avgFlux = 0;
  for (let i = 0; i < numFrames; i++) avgFlux += flux[i];
  avgFlux /= numFrames;
  const threshold = avgFlux * 1.5;

  const peakTimes: number[] = [];
  const minIntervalFrames = Math.floor(0.28 / 0.005);

  let lastPeakFrame = -minIntervalFrames;
  for (let i = 2; i < numFrames - 2; i++) {
    if (
      flux[i] > threshold &&
      flux[i] > flux[i - 1] &&
      flux[i] > flux[i + 1] &&
      i - lastPeakFrame >= minIntervalFrames
    ) {
      peakTimes.push(i * 0.005);
      lastPeakFrame = i;
    }
  }

  if (peakTimes.length < 8) return 120;

  const intervalCounts: { [bpm: number]: number } = {};
  for (let i = 0; i < peakTimes.length; i++) {
    for (let j = 1; j <= 4; j++) {
      if (i + j < peakTimes.length) {
        const delta = peakTimes[i + j] - peakTimes[i];
        let candidateBpm = (60 * j) / delta;
        while (candidateBpm < 65) candidateBpm *= 2;
        while (candidateBpm > 180) candidateBpm /= 2;
        const roundedBpm = Math.round(candidateBpm);
        if (roundedBpm >= 65 && roundedBpm <= 180) {
          intervalCounts[roundedBpm] = (intervalCounts[roundedBpm] || 0) + (5 - j);
        }
      }
    }
  }

  let bestBpm = 120;
  let maxScore = 0;
  for (const [bpmStr, score] of Object.entries(intervalCounts)) {
    const bpm = parseInt(bpmStr, 10);
    const neighborhoodScore =
      (intervalCounts[bpm - 1] || 0) * 0.5 +
      score +
      (intervalCounts[bpm + 1] || 0) * 0.5;

    if (neighborhoodScore > maxScore) {
      maxScore = neighborhoodScore;
      bestBpm = bpm;
    }
  }

  return bestBpm;
}

/**
 * ⚡ Point d'entrée universel de détection de BPM
 * 1. Tag de fichier Demucs (instantané, 100% fiable)
 * 2. Moteur C++ / WASM (précision MIR)
 * 3. Algorithme DSP natif
 */
export async function detectBpmFromAudio(
  source: AudioBuffer | Blob | File | ArrayBuffer | string,
  hintFilename?: string
): Promise<BPMDetectionResult> {
  // 1. Détection par Tag dans le nom (si disponible)
  if (hintFilename) {
    const tagBpm = extractBpmFromFilename(hintFilename);
    if (tagBpm) {
      return {
        bpm: tagBpm,
        confidence: 1.0,
        label: getTempoLabel(tagBpm),
        source: 'demucs_tag',
      };
    }
  }

  if (source instanceof File) {
    const fileTagBpm = extractBpmFromFilename(source.name);
    if (fileTagBpm) {
      return {
        bpm: fileTagBpm,
        confidence: 1.0,
        label: getTempoLabel(fileTagBpm),
        source: 'demucs_tag',
      };
    }
  } else if (typeof source === 'string') {
    const urlTagBpm = extractBpmFromFilename(source);
    if (urlTagBpm) {
      return {
        bpm: urlTagBpm,
        confidence: 1.0,
        label: getTempoLabel(urlTagBpm),
        source: 'demucs_tag',
      };
    }
  }

  // 2. Décodage du buffer audio
  const buffer = await getAudioBufferFromSource(source);
  if (!buffer || buffer.duration < 2) {
    return { bpm: 120, confidence: 0, label: 'Par défaut (120 BPM)', source: 'dsp_engine' };
  }

  // 3. Essayer la solution 2 (Moteur C++ / WebAssembly chargé à la demande)
  const wasmBpm = await detectWithWasmEngine(buffer);
  if (wasmBpm) {
    return {
      bpm: wasmBpm,
      confidence: 0.95,
      label: getTempoLabel(wasmBpm),
      source: 'wasm_engine',
    };
  }

  // 4. Moteur de secours DSP
  const dspBpm = detectWithDSPFallback(buffer);
  return {
    bpm: dspBpm,
    confidence: 0.85,
    label: getTempoLabel(dspBpm),
    source: 'dsp_engine',
  };
}

/**
 * ⚡ Calcule le ratio de vitesse idéal pour synchroniser Deck B sur Deck A
 */
export function calculateTempoSyncRatio(bpmA: number, bpmB: number): TempoSyncResult {
  if (!bpmA || !bpmB || bpmA <= 0 || bpmB <= 0) {
    return {
      ratio: 1.0,
      targetBpm: 120,
      displayRatio: '1.00x',
      matchType: 'direct',
      description: 'Tempo indéterminé, vitesse inchangée (1.00x).',
    };
  }

  let directRatio = bpmA / bpmB;
  let matchType: 'direct' | 'half' | 'double' = 'direct';

  if (directRatio < 0.65 && bpmA * 2 >= 70 && bpmA * 2 <= 180) {
    const doubleRatio = (bpmA * 2) / bpmB;
    if (doubleRatio >= 0.75 && doubleRatio <= 1.35) {
      directRatio = doubleRatio;
      matchType = 'half';
    }
  } else if (directRatio > 1.35 && bpmA / 2 >= 60) {
    const halfRatio = (bpmA / 2) / bpmB;
    if (halfRatio >= 0.75 && halfRatio <= 1.35) {
      directRatio = halfRatio;
      matchType = 'double';
    }
  }

  const clampedRatio = Math.max(0.5, Math.min(1.5, Math.round(directRatio * 100) / 100));
  const diffPercent = Math.round((clampedRatio - 1.0) * 100);
  const diffStr = diffPercent >= 0 ? `+${diffPercent}%` : `${diffPercent}%`;

  let description = '';
  if (Math.abs(diffPercent) === 0) {
    description = `Les deux morceaux ont déjà le même tempo (${bpmA} BPM) !`;
  } else if (matchType === 'direct') {
    description = `Deck B (${bpmB} BPM) sera ajusté à ${clampedRatio.toFixed(2)}x (${diffStr}) pour matcher Deck A (${bpmA} BPM).`;
  } else if (matchType === 'half') {
    description = `Calage harmonique Half-Time : Deck B calé à ${clampedRatio.toFixed(2)}x pour correspondre à ${bpmA} BPM.`;
  } else {
    description = `Calage harmonique Double-Time : Deck B calé à ${clampedRatio.toFixed(2)}x pour correspondre à ${bpmA} BPM.`;
  }

  return {
    ratio: clampedRatio,
    targetBpm: bpmA,
    displayRatio: `${clampedRatio.toFixed(2)}x`,
    matchType,
    description,
  };
}

/**
 * 🎵 Détecte la tonalité musicale avec profil Krumhansl-Schmuckler
 */
export function detectMusicalKey(audioBuffer: AudioBuffer): { key: string; camelot: string; mode: 'major' | 'minor' } {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const duration = Math.min(15, audioBuffer.duration);
  const numSamples = Math.floor(duration * sampleRate);

  const chroma = new Float32Array(12);
  const stride = 10;
  
  for (let octave = 3; octave <= 5; octave++) {
    for (let note = 0; note < 12; note++) {
      const midiNote = octave * 12 + note + 12;
      const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
      let sinSum = 0;
      let cosSum = 0;
      for (let i = 0; i < numSamples; i += stride) {
        const t = i / sampleRate;
        const val = channelData[i];
        const angle = 2 * Math.PI * freq * t;
        sinSum += val * Math.sin(angle);
        cosSum += val * Math.cos(angle);
      }
      chroma[note] += Math.sqrt(sinSum * sinSum + cosSum * cosSum);
    }
  }

  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const camelotMajor = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B'];
  const camelotMinor = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A'];

  let bestScore = -Infinity;
  let bestKey = '';
  let bestCamelot = '';
  let bestMode: 'major' | 'minor' = 'major';

  const computeCorrelation = (profile: number[], shift: number) => {
    let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < 12; i++) {
      const x = chroma[i];
      const y = profile[(i - shift + 12) % 12];
      sumXY += x * y;
      sumX += x;
      sumY += y;
      sumX2 += x * x;
      sumY2 += y * y;
    }
    const n = 12;
    const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  };

  for (let i = 0; i < 12; i++) {
    const majScore = computeCorrelation(majorProfile, i);
    if (majScore > bestScore) {
      bestScore = majScore;
      bestKey = keys[i];
      bestCamelot = camelotMajor[i];
      bestMode = 'major';
    }
    const minScore = computeCorrelation(minorProfile, i);
    if (minScore > bestScore) {
      bestScore = minScore;
      bestKey = keys[i];
      bestCamelot = camelotMinor[i];
      bestMode = 'minor';
    }
  }

  return { key: bestKey, camelot: bestCamelot, mode: bestMode };
}

