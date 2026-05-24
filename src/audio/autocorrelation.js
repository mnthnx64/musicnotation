const MIN_FREQ = 80;
const MAX_FREQ = 1200;

export function autocorrelationDetect(buffer, sampleRate) {
  const bufferSize = buffer.length;
  const minLag = Math.floor(sampleRate / MAX_FREQ);
  const maxLag = Math.min(Math.floor(sampleRate / MIN_FREQ), bufferSize);

  let bestLag = -1;
  let bestCorr = 0;

  const norm0 = rmsOfRange(buffer, 0, bufferSize);
  if (norm0 < 0.001) return { frequency: 0, confidence: 0 };

  for (let lag = minLag; lag < maxLag; lag++) {
    let sum = 0;
    let norm1Sq = 0;
    const len = bufferSize - lag;
    for (let i = 0; i < len; i++) {
      sum += buffer[i] * buffer[i + lag];
      norm1Sq += buffer[i + lag] * buffer[i + lag];
    }
    const norm1 = Math.sqrt(norm1Sq / len);
    const normProduct = norm0 * norm1;
    if (normProduct < 1e-10) continue;

    const corr = sum / (len * normProduct);

    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || bestCorr < 0.3) return { frequency: 0, confidence: 0 };

  let betterLag = bestLag;
  if (bestLag > 0 && bestLag < maxLag - 1) {
    const corrPrev = normalizedCorrelation(buffer, bestLag - 1);
    const corrCurr = normalizedCorrelation(buffer, bestLag);
    const corrNext = normalizedCorrelation(buffer, bestLag + 1);
    const denom = 2 * (2 * corrCurr - corrNext - corrPrev);
    if (Math.abs(denom) > 1e-10) {
      betterLag = bestLag + (corrNext - corrPrev) / denom;
    }
  }

  const frequency = sampleRate / betterLag;
  if (frequency < MIN_FREQ || frequency > MAX_FREQ) return { frequency: 0, confidence: 0 };

  return { frequency, confidence: Math.max(0, Math.min(1, bestCorr)) };
}

function rmsOfRange(buf, start, len) {
  let sum = 0;
  for (let i = start; i < start + len && i < buf.length; i++) {
    sum += buf[i] * buf[i];
  }
  return Math.sqrt(sum / len);
}

function normalizedCorrelation(buf, lag) {
  const len = buf.length - lag;
  let sum = 0, norm0 = 0, norm1 = 0;
  for (let i = 0; i < len; i++) {
    sum += buf[i] * buf[i + lag];
    norm0 += buf[i] * buf[i];
    norm1 += buf[i + lag] * buf[i + lag];
  }
  const denom = Math.sqrt(norm0 * norm1);
  return denom > 1e-10 ? sum / denom : 0;
}
