/**
 * AudioWorklet pitch detector using the YIN algorithm.
 * Runs entirely in the audio thread — no imports allowed.
 */
class PitchDetectorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.hopSize = 512;
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.samplesUntilProcess = this.bufferSize;

    this.minFrequency = 80;
    this.maxFrequency = 1200;
    this.yinThreshold = 0.15;
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

        // Shift buffer left by hopSize and continue accumulating
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

    const result = this._yinDetect(this.buffer, sampleRate);
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

  _yinDetect(buf, sr) {
    const halfLen = Math.floor(buf.length / 2);
    const yinBuf = new Float32Array(halfLen);

    const minLag = Math.floor(sr / this.maxFrequency);
    const maxLag = Math.floor(sr / this.minFrequency);

    // Step 1: Difference function
    for (let tau = 0; tau < halfLen; tau++) {
      yinBuf[tau] = 0;
      for (let i = 0; i < halfLen; i++) {
        const delta = buf[i] - buf[i + tau];
        yinBuf[tau] += delta * delta;
      }
    }

    // Step 2: Cumulative mean normalized difference
    yinBuf[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < halfLen; tau++) {
      runningSum += yinBuf[tau];
      yinBuf[tau] *= tau / runningSum;
    }

    // Step 3: Absolute threshold
    let tauEstimate = -1;
    const searchMax = Math.min(maxLag, halfLen);

    for (let tau = minLag; tau < searchMax; tau++) {
      if (yinBuf[tau] < this.yinThreshold) {
        while (tau + 1 < halfLen && yinBuf[tau + 1] < yinBuf[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    // Fallback: pick the global minimum if no value crossed threshold
    if (tauEstimate === -1) {
      let minVal = Infinity;
      for (let tau = minLag; tau < searchMax; tau++) {
        if (yinBuf[tau] < minVal) {
          minVal = yinBuf[tau];
          tauEstimate = tau;
        }
      }
      if (minVal > 0.5) return { frequency: 0, confidence: 0 };
    }

    if (tauEstimate === -1 || tauEstimate < minLag) {
      return { frequency: 0, confidence: 0 };
    }

    // Step 4: Parabolic interpolation
    let betterTau = tauEstimate;
    if (tauEstimate > 0 && tauEstimate < halfLen - 1) {
      const s0 = yinBuf[tauEstimate - 1];
      const s1 = yinBuf[tauEstimate];
      const s2 = yinBuf[tauEstimate + 1];
      betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
    }

    const frequency = sr / betterTau;
    const confidence = 1 - yinBuf[tauEstimate];

    if (frequency < this.minFrequency || frequency > this.maxFrequency) {
      return { frequency: 0, confidence: 0 };
    }

    return { frequency, confidence: Math.max(0, Math.min(1, confidence)) };
  }
}

registerProcessor('pitch-detector', PitchDetectorProcessor);
