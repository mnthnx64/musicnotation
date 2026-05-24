export const PITCH_CONFIG = {
  minFrequency: 80,
  maxFrequency: 1200,
  minConfidence: 0.3,
  medianFilterSize: 5,
  energyThreshold: 0.005,
};

export function calculateRMS(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

export function yinPitchDetection(buffer, sampleRate) {
  const bufferSize = buffer.length;
  const yinBufferSize = Math.floor(bufferSize / 2);
  const yinBuffer = new Float32Array(yinBufferSize);

  const minLag = Math.floor(sampleRate / PITCH_CONFIG.maxFrequency);
  const maxLag = Math.floor(sampleRate / PITCH_CONFIG.minFrequency);

  for (let tau = 0; tau < yinBufferSize; tau++) {
    yinBuffer[tau] = 0;
    for (let i = 0; i < yinBufferSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      yinBuffer[tau] += delta * delta;
    }
  }

  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < yinBufferSize; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }

  const threshold = 0.15;
  let tauEstimate = -1;

  for (let tau = minLag; tau < Math.min(maxLag, yinBufferSize); tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < yinBufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) {
    let minVal = Infinity;
    for (let tau = minLag; tau < Math.min(maxLag, yinBufferSize); tau++) {
      if (yinBuffer[tau] < minVal) {
        minVal = yinBuffer[tau];
        tauEstimate = tau;
      }
    }
    if (minVal > 0.5) return { frequency: 0, confidence: 0 };
  }

  if (tauEstimate === -1 || tauEstimate < minLag) {
    return { frequency: 0, confidence: 0 };
  }

  let betterTau = tauEstimate;
  if (tauEstimate > 0 && tauEstimate < yinBufferSize - 1) {
    const s0 = yinBuffer[tauEstimate - 1];
    const s1 = yinBuffer[tauEstimate];
    const s2 = yinBuffer[tauEstimate + 1];
    betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  }

  const frequency = sampleRate / betterTau;
  const confidence = 1 - yinBuffer[tauEstimate];

  if (frequency < PITCH_CONFIG.minFrequency || frequency > PITCH_CONFIG.maxFrequency) {
    return { frequency: 0, confidence: 0 };
  }

  return { frequency, confidence: Math.max(0, Math.min(1, confidence)) };
}

export function medianFilter(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function createPitchSmoother(size = PITCH_CONFIG.medianFilterSize) {
  const recentPitches = [];
  const recentConfidences = [];

  return function smooth(pitch, confidence) {
    recentPitches.push(pitch);
    recentConfidences.push(confidence);

    while (recentPitches.length > size) {
      recentPitches.shift();
      recentConfidences.shift();
    }

    if (recentPitches.length < 3) {
      return { pitch, confidence };
    }

    const validPitches = recentPitches.filter((p) => p > 0);
    const validConfs = recentConfidences.filter((_, i) => recentPitches[i] > 0);

    if (validPitches.length < 2) {
      return { pitch: 0, confidence: 0 };
    }

    return {
      pitch: medianFilter(validPitches),
      confidence: medianFilter(validConfs),
    };
  };
}
