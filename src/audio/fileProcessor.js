import { yinPitchDetection, calculateRMS, PITCH_CONFIG } from './pitchDetection';
import { freqToSwara, detectTonic, filterStableSwaras } from './swaraMapping';

const FRAME_SIZE = 2048;
const HOP_SIZE = 512;
const TARGET_SR = 16000;

/**
 * @param {File} file
 * @param {object} opts
 * @param {string|null} opts.shruti - Manual shruti note name (e.g. 'C#'). null = auto-detect.
 * @param {string} opts.raga - Raga name for snapping (e.g. 'Mohanam'). 'Free' = no snapping.
 * @param {number} opts.minStableFrames - Min consecutive frames to keep a swara.
 * @param {function} opts.onProgress
 */
export async function processAudioFile(file, opts = {}) {
  const {
    shruti = null,
    raga = 'Free',
    minStableFrames = 3,
    onProgress,
  } = opts;

  // Shruti -> Hz lookup
  const NOTE_FREQ = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
    'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
    'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88,
  };

  // Raga semitone sets for snapping
  const RAGA_SEMITONES = {
    Free:              [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    Mohanam:           [0, 2, 4, 7, 9],
    Kalyani:           [0, 2, 4, 6, 7, 9, 11],
    Bhairavi:          [0, 1, 3, 5, 7, 8, 10],
    Shankarabharanam:  [0, 2, 4, 5, 7, 9, 11],
    Kharaharapriya:    [0, 2, 3, 5, 7, 9, 10],
  };

  onProgress?.({ stage: 'decoding', progress: 0 });

  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new OfflineAudioContext(1, TARGET_SR, TARGET_SR);
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);

  let samples;
  if (decoded.numberOfChannels > 1) {
    const ch0 = decoded.getChannelData(0);
    const ch1 = decoded.getChannelData(1);
    samples = new Float32Array(ch0.length);
    for (let i = 0; i < ch0.length; i++) {
      samples[i] = (ch0[i] + ch1[i]) / 2;
    }
  } else {
    samples = new Float32Array(decoded.getChannelData(0));
  }

  const sampleRate = decoded.sampleRate;
  const duration = decoded.duration;

  onProgress?.({ stage: 'analyzing', progress: 0.05 });

  // Pitch detection pass
  const totalFrames = Math.floor((samples.length - FRAME_SIZE) / HOP_SIZE);
  const pitchFrames = [];
  const allFrequencies = [];

  for (let f = 0; f < totalFrames; f++) {
    const start = f * HOP_SIZE;
    const frame = samples.slice(start, start + FRAME_SIZE);

    const rms = calculateRMS(frame);
    const time = start / sampleRate;
    const frameDuration = HOP_SIZE / sampleRate;

    if (rms > PITCH_CONFIG.energyThreshold) {
      const { frequency, confidence } = yinPitchDetection(frame, sampleRate);
      if (frequency > 0 && confidence >= PITCH_CONFIG.minConfidence) {
        pitchFrames.push({ time, frequency, confidence, frameDuration });
        allFrequencies.push(frequency);
      }
    }

    if (f % 200 === 0) {
      onProgress?.({ stage: 'analyzing', progress: 0.05 + 0.65 * (f / totalFrames) });
      await yieldToMain();
    }
  }

  if (allFrequencies.length === 0) {
    const fallbackNote = shruti || 'C';
    return {
      tonic: { hz: NOTE_FREQ[fallbackNote] || 261.63, note: fallbackNote },
      swaras: [],
      pitchData: [],
      duration,
      sampleRate,
      samples,
    };
  }

  onProgress?.({ stage: 'detecting tonic', progress: 0.72 });
  await yieldToMain();

  // Determine tonic: use manual shruti if provided, else auto-detect
  let tonic;
  if (shruti && NOTE_FREQ[shruti]) {
    tonic = { hz: NOTE_FREQ[shruti], note: shruti };
  } else {
    tonic = detectTonic(allFrequencies);
  }

  onProgress?.({ stage: 'mapping swaras', progress: 0.8 });
  await yieldToMain();

  // Map each pitch frame to a swara (with optional raga snapping)
  const allowedSemitones = RAGA_SEMITONES[raga] || RAGA_SEMITONES.Free;
  const rawSwaras = [];

  for (const frame of pitchFrames) {
    const result = freqToSwara(frame.frequency, tonic.hz);
    if (result) {
      let { semitone } = result;

      // Raga snapping
      if (raga !== 'Free' && !allowedSemitones.includes(semitone)) {
        let best = allowedSemitones[0];
        let bestDist = 12;
        for (const s of allowedSemitones) {
          const d = Math.min(Math.abs(semitone - s), 12 - Math.abs(semitone - s));
          if (d < bestDist) { bestDist = d; best = s; }
        }
        semitone = best;
        // Look up the snapped swara name
        const SWARA_NAMES_BY_SEMITONE = [
          'Sa', 'Ri\u2081', 'Ri\u2082', 'Ga\u2082', 'Ga\u2083',
          'Ma\u2081', 'Ma\u2082', 'Pa', 'Da\u2081', 'Da\u2082', 'Ni\u2082', 'Ni\u2083',
        ];
        rawSwaras.push({
          swara: SWARA_NAMES_BY_SEMITONE[semitone],
          semitone,
          octaveOffset: result.octaveOffset,
          time: frame.time,
          frequency: frame.frequency,
          confidence: frame.confidence * 0.7 + result.accuracy * 0.3,
          frameDuration: frame.frameDuration,
        });
      } else {
        rawSwaras.push({
          ...result,
          time: frame.time,
          frequency: frame.frequency,
          confidence: frame.confidence * 0.7 + result.accuracy * 0.3,
          frameDuration: frame.frameDuration,
        });
      }
    }
  }

  onProgress?.({ stage: 'filtering', progress: 0.9 });
  await yieldToMain();

  const swaras = filterStableSwaras(rawSwaras, minStableFrames);

  const pitchData = pitchFrames.map(f => ({
    time: f.time,
    frequency: f.frequency,
    confidence: f.confidence,
  }));

  onProgress?.({ stage: 'done', progress: 1 });

  return {
    tonic,
    swaras,
    pitchData,
    duration,
    sampleRate,
    samples,
  };
}

function yieldToMain() {
  return new Promise(resolve => setTimeout(resolve, 0));
}
