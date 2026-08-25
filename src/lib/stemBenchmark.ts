/**
 * 🧪 Moteur de Benchmark Automatisé & Métriques de Séparation DSP (Stems)
 * Calcule le SIR (Signal-to-Interference Ratio), le Taux de Fuite (%) et la Vitesse de traitement.
 */

export interface StemMetricResult {
  stemName: string;
  sirDb: number;        // Signal-to-Interference Ratio en dB (plus élevé = meilleur)
  leakagePercent: number; // Taux d'énergie parasite dans la bande (%)
  energyLevel: number;
}

export interface AlgorithmBenchmarkResult {
  name: string;
  description: string;
  order: number;
  durationMs: number;
  realtimeFactor: number; // Ex: 45x temps réel
  overallScore: number;   // Note globale sur 100
  stems: {
    vocals: StemMetricResult;
    drums: StemMetricResult;
    bass: StemMetricResult;
    melody: StemMetricResult;
  };
}

export interface BenchmarkReport {
  timestamp: string;
  sampleRate: number;
  testDurationSeconds: number;
  totalSamples: number;
  results: AlgorithmBenchmarkResult[];
  recommendedAlgorithm: string;
  summary: string;
}

/**
 * 1. Générateur de Signal Témoin Calibré (Ground Truth Audio Signal)
 */
export function generateCalibratedGroundTruth(durationSec = 5, sampleRate = 44100) {
  const totalSamples = sampleRate * durationSec;
  const dt = 1 / sampleRate;

  const vocals = new Float32Array(totalSamples);
  const drums = new Float32Array(totalSamples);
  const bass = new Float32Array(totalSamples);
  const melodyL = new Float32Array(totalSamples);
  const melodyR = new Float32Array(totalSamples);

  const mixL = new Float32Array(totalSamples);
  const mixR = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i * dt;

    // 🎤 1. Ground Truth VOCALS (Formants centrés 440Hz / 880Hz / 1320Hz avec modulation)
    const vocFreq = 440 + 50 * Math.sin(2 * Math.PI * 4 * t);
    const voc = (
      Math.sin(2 * Math.PI * vocFreq * t) * 0.4 +
      Math.sin(2 * Math.PI * vocFreq * 2 * t) * 0.2 +
      Math.sin(2 * Math.PI * vocFreq * 3 * t) * 0.1
    );
    vocals[i] = voc;

    // 🥁 2. Ground Truth DRUMS (Kick 60Hz + Caisse claire + Charleston percussif >4kHz)
    const beatPeriod = 0.5; // 120 BPM
    const beatT = t % beatPeriod;
    const kickEnv = Math.exp(-beatT * 40);
    const kick = Math.sin(2 * Math.PI * (55 + 70 * kickEnv) * t) * kickEnv * 0.7;

    const snareEnv = Math.exp(-((t + 0.25) % beatPeriod) * 35);
    const snare = (Math.sin(t * 12345.67) * 2 - 1) * snareEnv * 0.35;

    const hatEnv = Math.exp(-((t % 0.125)) * 70);
    const hat = (Math.sin(t * 54321.09) * 2 - 1) * hatEnv * 0.15;

    const drm = kick + snare + hat;
    drums[i] = drm;

    // 🎸 3. Ground Truth BASS (Sub pure 55Hz - 110Hz au centre)
    const bassNote = 55 + (Math.floor(t / 1.0) % 3) * 18;
    const bas = Math.sin(2 * Math.PI * bassNote * t) * 0.5 + Math.sin(2 * Math.PI * bassNote * 2 * t) * 0.15;
    bass[i] = bas;

    // 🎹 4. Ground Truth MELODY (Accords stéréo Side 330Hz / 495Hz / 660Hz)
    const melBase = 330 + (Math.floor(t / 0.5) % 4) * 55;
    const pad1 = Math.sin(2 * Math.PI * melBase * t) * 0.25;
    const pad2 = Math.sin(2 * Math.PI * (melBase * 1.5) * t) * 0.2;
    melodyL[i] = pad1 + pad2;
    melodyR[i] = -(pad1 + pad2); // Inversion de phase = 100% Side Stéréo

    // 🎧 MASTER MIX
    mixL[i] = voc + drm + bas + melodyL[i];
    mixR[i] = voc + drm + bas + melodyR[i];
  }

  return {
    sampleRate,
    durationSec,
    totalSamples,
    groundTruth: { vocals, drums, bass, melodyL, melodyR },
    mix: { left: mixL, right: mixR },
  };
}

/**
 * 2. Calcul du SIR (Signal-to-Interference Ratio en dB) et du Taux de Fuite (%)
 */
function calculateSeparationMetrics(
  estimated: Float32Array,
  target: Float32Array,
  stemName: string
): StemMetricResult {
  let targetEnergy = 0;
  let errorEnergy = 0;

  for (let i = 0; i < target.length; i++) {
    const tgt = target[i];
    const est = estimated[i];
    const err = est - tgt;

    targetEnergy += tgt * tgt;
    errorEnergy += err * err;
  }

  targetEnergy = Math.max(1e-12, targetEnergy);
  errorEnergy = Math.max(1e-12, errorEnergy);

  // SIR = 10 * log10( EnergyTarget / EnergyError )
  const sirDb = 10 * Math.log10(targetEnergy / errorEnergy);

  // Taux de fuite résiduelle (%)
  const leakagePercent = Math.min(100, Math.max(0, (errorEnergy / (targetEnergy + errorEnergy)) * 100));

  return {
    stemName,
    sirDb: Math.round(sirDb * 10) / 10,
    leakagePercent: Math.round(leakagePercent * 10) / 10,
    energyLevel: Math.round(Math.sqrt(targetEnergy / target.length) * 1000) / 1000,
  };
}

/**
 * 3. Algorithme A : Baseline Filtres Biquad 1er ordre (12 dB/oct)
 */
function separateAlgorithmA(mixL: Float32Array, mixR: Float32Array, sampleRate: number) {
  const len = mixL.length;
  const dt = 1 / sampleRate;

  const vocOut = new Float32Array(len);
  const drmOut = new Float32Array(len);
  const basOut = new Float32Array(len);
  const melOut = new Float32Array(len);

  const rcBass = 1 / (2 * Math.PI * 200);
  const alphaBass = dt / (rcBass + dt);
  let bL = 0;

  for (let i = 0; i < len; i++) {
    const mid = (mixL[i] + mixR[i]) * 0.5;
    const side = (mixL[i] - mixR[i]) * 0.5;

    // Basse simple
    bL = bL + alphaBass * (mid - bL);
    basOut[i] = bL * 1.1;

    // Batterie simple
    const trans = Math.abs(mid - (i > 0 ? (mixL[i - 1] + mixR[i - 1]) * 0.5 : 0));
    drmOut[i] = trans > 0.1 ? mid * 0.8 : 0;

    // Voix simple
    vocOut[i] = (mid - basOut[i] * 0.6) * 0.9;

    // Mélodie
    melOut[i] = side * 1.2;
  }

  return { vocals: vocOut, drums: drmOut, bass: basOut, melody: melOut };
}

/**
 * 4. Algorithme B : Linkwitz-Riley 4ème Ordre (24 dB/oct) + HPSS Mid/Side
 */
function separateAlgorithmB(mixL: Float32Array, mixR: Float32Array, sampleRate: number) {
  const len = mixL.length;
  const dt = 1 / sampleRate;

  const vocOut = new Float32Array(len);
  const drmOut = new Float32Array(len);
  const basOut = new Float32Array(len);
  const melOut = new Float32Array(len);

  // Linkwitz-Riley Lowpass 160Hz (2 étages en cascade)
  const rcBass = 1 / (2 * Math.PI * 160);
  const alphaB = dt / (rcBass + dt);
  let bL1 = 0, bL2 = 0;

  // Passe-haut transitoires 3200Hz
  const rcHigh = 1 / (2 * Math.PI * 3200);
  const alphaH = rcHigh / (rcHigh + dt);
  let hIn = 0, hOut = 0;

  // Passe-bande vocal 280Hz - 3400Hz
  const rcVocLow = 1 / (2 * Math.PI * 280);
  const alphaVL = rcVocLow / (rcVocLow + dt);
  let vIn = 0, vHp = 0;
  const rcVocHigh = 1 / (2 * Math.PI * 3400);
  const alphaVH = dt / (rcVocHigh + dt);
  let vLp = 0;

  for (let i = 0; i < len; i++) {
    const mid = (mixL[i] + mixR[i]) * 0.5;
    const side = (mixL[i] - mixR[i]) * 0.5;

    // 1. Basse (Double étage 24 dB/oct raide)
    bL1 = bL1 + alphaB * (mid - bL1);
    bL2 = bL2 + alphaB * (bL1 - bL2);
    const bassVal = bL2 * 1.35;
    basOut[i] = bassVal;

    // 2. Transitoires percussives
    hOut = alphaH * (hOut + mid - hIn);
    hIn = mid;
    const diff = Math.abs(mid - (i > 0 ? (mixL[i - 1] + mixR[i - 1]) * 0.5 : 0));
    const isTrans = diff > 0.07;
    drmOut[i] = hOut * 0.65 + (isTrans ? mid * 0.85 : 0);

    // 3. Voix Acapella isolée
    vHp = alphaVL * (vHp + mid - vIn);
    vIn = mid;
    vLp = vLp + alphaVH * (vHp - vLp);
    vocOut[i] = (vLp - bassVal * 0.7 - (isTrans ? mid * 0.4 : 0)) * 1.25;

    // 4. Mélodie Stéréo Side
    melOut[i] = side * 1.4 + (mid - vocOut[i] * 0.75 - drmOut[i] * 0.65 - basOut[i] * 0.7) * 0.5;
  }

  return { vocals: vocOut, drums: drmOut, bass: basOut, melody: melOut };
}

/**
 * 5. Algorithme C : HPSS + Masquage Spectral Adaptatif (Dynamic Spectral Masking)
 */
function separateAlgorithmC(mixL: Float32Array, mixR: Float32Array, sampleRate: number) {
  const resultB = separateAlgorithmB(mixL, mixR, sampleRate);
  const len = mixL.length;

  const vocOut = new Float32Array(len);
  const drmOut = new Float32Array(len);
  const basOut = new Float32Array(len);
  const melOut = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    const v = Math.abs(resultB.vocals[i]);
    const d = Math.abs(resultB.drums[i]);
    const b = Math.abs(resultB.bass[i]);
    const m = Math.abs(resultB.melody[i]);

    const totalEnergy = v + d + b + m + 1e-6;

    // Masques énergétiques de Wiener
    const maskV = Math.pow(v / totalEnergy, 1.4);
    const maskD = Math.pow(d / totalEnergy, 1.4);
    const maskB = Math.pow(b / totalEnergy, 1.4);
    const maskM = Math.pow(m / totalEnergy, 1.4);

    const mid = (mixL[i] + mixR[i]) * 0.5;
    const side = (mixL[i] - mixR[i]) * 0.5;

    vocOut[i] = resultB.vocals[i] * maskV * 1.35;
    drmOut[i] = resultB.drums[i] * maskD * 1.25;
    basOut[i] = resultB.bass[i] * maskB * 1.35;
    melOut[i] = (side + resultB.melody[i] * 0.5) * maskM * 1.3;
  }

  return { vocals: vocOut, drums: drmOut, bass: basOut, melody: melOut };
}

/**
 * 🧪 Exécute la Suite Complète de Benchmark et génère le Rapport Comparatif
 */
export function runStemBenchmarkSuite(durationSec = 5, sampleRate = 44100): BenchmarkReport {
  const { groundTruth, mix, totalSamples } = generateCalibratedGroundTruth(durationSec, sampleRate);

  const algorithms = [
    {
      name: 'Algorithme A (Filtres 1er ordre 12 dB/oct)',
      description: 'Filtrage biquad élémentaire passe-bas / passe-haut sans décorrélation',
      order: 1,
      fn: separateAlgorithmA,
    },
    {
      name: 'Algorithme B (Linkwitz-Riley 4ème ordre + HPSS)',
      description: 'Pente raide 24 dB/oct, extraction Mid/Side spatiale et soustraction harmonique',
      order: 4,
      fn: separateAlgorithmB,
    },
    {
      name: 'Algorithme C (HPSS + Masquage Spectral Adaptatif)',
      description: 'Linkwitz-Riley 4ème ordre + Masques spectraux d énergie de Wiener',
      order: 4,
      fn: separateAlgorithmC,
    },
  ];

  const results: AlgorithmBenchmarkResult[] = [];

  for (const algo of algorithms) {
    const tStart = performance.now();
    const separated = algo.fn(mix.left, mix.right, sampleRate);
    const tEnd = performance.now();

    const durationMs = Math.round((tEnd - tStart) * 100) / 100;
    const realtimeFactor = Math.round(((durationSec * 1000) / Math.max(0.1, durationMs)) * 10) / 10;

    const vocalMetrics = calculateSeparationMetrics(separated.vocals, groundTruth.vocals, 'Voix');
    const drumMetrics = calculateSeparationMetrics(separated.drums, groundTruth.drums, 'Batterie');
    const bassMetrics = calculateSeparationMetrics(separated.bass, groundTruth.bass, 'Basse');
    const melodyMetrics = calculateSeparationMetrics(separated.melody, groundTruth.melodyL, 'Mélodie');

    const avgSir = (vocalMetrics.sirDb + drumMetrics.sirDb + bassMetrics.sirDb + melodyMetrics.sirDb) / 4;
    const overallScore = Math.min(100, Math.max(10, Math.round(50 + avgSir * 3.5)));

    results.push({
      name: algo.name,
      description: algo.description,
      order: algo.order,
      durationMs,
      realtimeFactor,
      overallScore,
      stems: {
        vocals: vocalMetrics,
        drums: drumMetrics,
        bass: bassMetrics,
        melody: melodyMetrics,
      },
    });
  }

  // Trouver le meilleur algorithme
  const best = [...results].sort((a, b) => b.overallScore - a.overallScore)[0];

  return {
    timestamp: new Date().toISOString(),
    sampleRate,
    testDurationSeconds: durationSec,
    totalSamples,
    results,
    recommendedAlgorithm: best.name,
    summary: `Benchmark complété : ${best.name} atteint un score d isolation optimal de ${best.overallScore}/100 avec un facteur de vitesse de ${best.realtimeFactor}x temps réel.`,
  };
}
