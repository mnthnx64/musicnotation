class AutocorrelationDetectorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.hopSize = 512;
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.samplesUntilProcess = this.bufferSize;

    this.minFrequency = 80;
    this.maxFrequency = 1200;
    this.rmsThreshold = 0.005;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.writeIndex] = channelData[i];
      this.writeIndex++;
      this.samplesUntilProcess--;

      if (this.writeIndex >= this.bufferSize) {
        this.writeIndex = this.bufferSize;
      }

      if (this.samplesUntilProcess <= 0 && this.writeIndex >= this.bufferSize) {
        this._analyze();
        this.buffer.copyWithin(0, this.hopSize);
        this.writeIndex = this.bufferSize - this.hopSize;
        this.samplesUntilProcess = this.hopSize;
      }
    }

    return true;
  }

  _analyze() {
    const rms = this._calculateRMS(this.buffer);

    if (rms < this.rmsThreshold) {
      this.port.postMessage({ frequency: 0, confidence: 0, rms });
      return;
    }

    const result = this._detect(this.buffer, sampleRate);
    this.port.postMessage({
      frequency: result.frequency,
      confidence: result.confidence,
      rms,
    });
  }

  _calculateRMS(buf) {
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      sum += buf[i] * buf[i];
    }
    return Math.sqrt(sum / buf.length);
  }

  _detect(buf, sr) {
    const minLag = Math.floor(sr / this.maxFrequency);
    const maxLag = Math.min(Math.floor(sr / this.minFrequency), buf.length);

    let bestLag = -1;
    let bestCorr = 0;

    for (let lag = minLag; lag < maxLag; lag++) {
      let sum = 0, n0 = 0, n1 = 0;
      const len = buf.length - lag;
      for (let i = 0; i < len; i++) {
        sum += buf[i] * buf[i + lag];
        n0 += buf[i] * buf[i];
        n1 += buf[i + lag] * buf[i + lag];
      }
      const denom = Math.sqrt(n0 * n1);
      if (denom < 1e-10) continue;
      const corr = sum / denom;

      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }

    if (bestLag <= 0 || bestCorr < 0.3) return { frequency: 0, confidence: 0 };

    let betterLag = bestLag;
    if (bestLag > 0 && bestLag < maxLag - 1) {
      const cp = this._normCorr(buf, bestLag - 1);
      const cc = this._normCorr(buf, bestLag);
      const cn = this._normCorr(buf, bestLag + 1);
      const d = 2 * (2 * cc - cn - cp);
      if (Math.abs(d) > 1e-10) {
        betterLag = bestLag + (cn - cp) / d;
      }
    }

    const frequency = sr / betterLag;
    if (frequency < this.minFrequency || frequency > this.maxFrequency) {
      return { frequency: 0, confidence: 0 };
    }

    return { frequency, confidence: Math.max(0, Math.min(1, bestCorr)) };
  }

  _normCorr(buf, lag) {
    const len = buf.length - lag;
    let sum = 0, n0 = 0, n1 = 0;
    for (let i = 0; i < len; i++) {
      sum += buf[i] * buf[i + lag];
      n0 += buf[i] * buf[i];
      n1 += buf[i + lag] * buf[i + lag];
    }
    const denom = Math.sqrt(n0 * n1);
    return denom > 1e-10 ? sum / denom : 0;
  }
}

registerProcessor('autocorrelation-detector', AutocorrelationDetectorProcessor);
