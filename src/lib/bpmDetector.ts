/**
 * 🥁 Détecteur de BPM & Moteur de Synchronisation Temporelle Audio DSP
 * Analyse le flux audio PCM / Stems (notamment Drums & Bass), détecte les transitoires
 * rythmiques et calcule le tempo exact (Beats Per Minute) ainsi que le ratio optimal de calage.
 */

export interface BPMDetectionResult {
  bpm: number;
  confidence: number;
  label: string;
}

export interface TempoSyncResult {
  ratio: number;
  targetBpm: number;
  displayRatio: string;
  matchType: 'direct' | 'half' | 'double';
  description: string;
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
 * Extrait un AudioBuffer à partir d'une source audio variée (URL, Blob, File, ArrayBuffer)
 */
async function getAudioBufferFromSource(
  source: AudioBuffer | Blob | File | ArrayBuffer | string,
  audioCtx: AudioContext | OfflineAudioContext
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
      console.warn('Impossible de récupérer l audio depuis URL pour détection BPM:', e);
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
    // Utilisation d'un AudioContext temporaire standard pour décoder
    const decoderCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const decoded = await decoderCtx.decodeAudioData(arrayBuffer.slice(0));
    try {
      await decoderCtx.close();
    } catch (_) {}
    return decoded;
  } catch (err) {
    console.warn('Erreur décodage PCM pour détection BPM:', err);
    return null;
  }
}

/**
 * 🔬 Algorithme DSP de détection de BPM
 * 1. Filtrage passe-bas résonant (60Hz - 150Hz) sur OfflineAudioContext pour isoler les kicks et basses.
 * 2. Calcul de l'enveloppe d'énergie instantanée (Energy Flux).
 * 3. Détection des transitoires d'attaque (Onsets).
 * 4. Histogramme d'intervalles inter-pics et résolution harmonique.
 */
export async function detectBpmFromAudio(
  source: AudioBuffer | Blob | File | ArrayBuffer | string
): Promise<BPMDetectionResult> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const tempCtx = new AudioCtx();

  const buffer = await getAudioBufferFromSource(source, tempCtx);
  try {
    await tempCtx.close();
  } catch (_) {}

  if (!buffer || buffer.duration < 2) {
    return { bpm: 120, confidence: 0, label: 'Par défaut (120 BPM)' };
  }

  // Analyser un extrait représentatif (jusqu'à 45 secondes au milieu du morceau)
  const sampleRate = buffer.sampleRate;
  const totalDuration = buffer.duration;
  const analysisDuration = Math.min(45, totalDuration);
  const startOffset = totalDuration > 30 ? Math.min(10, totalDuration - analysisDuration) : 0;

  const startSample = Math.floor(startOffset * sampleRate);
  const sampleCount = Math.floor(analysisDuration * sampleRate);

  // Mixer en mono pour l'analyse rythmique
  const monoData = new Float32Array(sampleCount);
  const channel0 = buffer.getChannelData(0);
  const channel1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;

  for (let i = 0; i < sampleCount; i++) {
    const idx = startSample + i;
    if (idx < buffer.length) {
      if (channel1) {
        monoData[i] = (channel0[idx] + channel1[idx]) * 0.5;
      } else {
        monoData[i] = channel0[idx];
      }
    }
  }

  // Filtrage passe-bas logiciel DSP (IIR biquad lowpass 140Hz)
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

  // Calcul de l'énergie locale par fenêtres de 10ms (100 Hz frame rate)
  const windowSize = Math.floor(sampleRate * 0.01);
  const hopSize = Math.floor(sampleRate * 0.005);
  const numFrames = Math.floor((sampleCount - windowSize) / hopSize);

  if (numFrames < 100) {
    return { bpm: 120, confidence: 0.1, label: 'Audio trop court' };
  }

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

  // Calcul du flux spectral (différentiation de l'énergie pour isoler les attaques de percussions)
  const flux = new Float32Array(numFrames);
  for (let i = 1; i < numFrames; i++) {
    const diff = energy[i] - energy[i - 1];
    flux[i] = diff > 0 ? diff : 0;
  }

  // Détection des pics d'attaque avec seuil dynamique
  let avgFlux = 0;
  for (let i = 0; i < numFrames; i++) {
    avgFlux += flux[i];
  }
  avgFlux /= numFrames;
  const threshold = avgFlux * 1.5;

  const peakTimes: number[] = [];
  const minIntervalFrames = Math.floor(0.28 / 0.005); // Minimum 280ms entre deux kicks (max ~214 BPM)

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

  if (peakTimes.length < 8) {
    return { bpm: 120, confidence: 0.2, label: 'Tempo indéterminé (120 BPM)' };
  }

  // Construction de l'histogramme des intervalles inter-pics
  const intervalCounts: { [bpm: number]: number } = {};

  for (let i = 0; i < peakTimes.length; i++) {
    for (let j = 1; j <= 4; j++) {
      if (i + j < peakTimes.length) {
        const delta = peakTimes[i + j] - peakTimes[i];
        let candidateBpm = (60 * j) / delta;

        // Recadrer dans une plage standard (65 - 180 BPM)
        while (candidateBpm < 65) candidateBpm *= 2;
        while (candidateBpm > 180) candidateBpm /= 2;

        const roundedBpm = Math.round(candidateBpm);
        if (roundedBpm >= 65 && roundedBpm <= 180) {
          intervalCounts[roundedBpm] = (intervalCounts[roundedBpm] || 0) + (5 - j);
        }
      }
    }
  }

  // Trouver le BPM dominant
  let bestBpm = 120;
  let maxScore = 0;
  let totalScore = 0;

  for (const [bpmStr, score] of Object.entries(intervalCounts)) {
    const bpm = parseInt(bpmStr, 10);
    totalScore += score;
    // Lissage avec les voisins proches (+/- 1 BPM)
    const neighborhoodScore =
      (intervalCounts[bpm - 1] || 0) * 0.5 +
      score +
      (intervalCounts[bpm + 1] || 0) * 0.5;

    if (neighborhoodScore > maxScore) {
      maxScore = neighborhoodScore;
      bestBpm = bpm;
    }
  }

  const confidence = totalScore > 0 ? Math.min(1.0, (maxScore / totalScore) * 3.5) : 0.5;

  return {
    bpm: bestBpm,
    confidence: Math.round(confidence * 100) / 100,
    label: getTempoLabel(bestBpm),
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

  // Si les BPM sont proches d'un facteur 2 (ex: 75 BPM vs 150 BPM)
  if (directRatio < 0.65 && bpmA * 2 >= 70 && bpmA * 2 <= 180) {
    // Deck A est half-time par rapport à Deck B
    const doubleRatio = (bpmA * 2) / bpmB;
    if (doubleRatio >= 0.75 && doubleRatio <= 1.35) {
      directRatio = doubleRatio;
      matchType = 'half';
    }
  } else if (directRatio > 1.35 && bpmA / 2 >= 60) {
    // Deck A est double-time par rapport à Deck B
    const halfRatio = (bpmA / 2) / bpmB;
    if (halfRatio >= 0.75 && halfRatio <= 1.35) {
      directRatio = halfRatio;
      matchType = 'double';
    }
  }

  // Clamper le ratio dans les limites acceptables du moteur (0.50x à 1.50x)
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
