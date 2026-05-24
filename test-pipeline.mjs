// End-to-end test of the audio processing pipeline (runs in Node.js)
import { yinPitchDetection, calculateRMS, createPitchSmoother, PITCH_CONFIG } from './src/audio/pitchDetection.js';
import { freqToSwara, detectTonic, filterStableSwaras, SWARA_RATIOS } from './src/audio/swaraMapping.js';
import fs from 'fs';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log(`  \u2713 ${msg}`); }
  else { failed++; console.error(`  \u2717 FAIL: ${msg}`); }
}

function generateSineBuffer(freq, sampleRate, durationSec) {
  const len = Math.floor(sampleRate * durationSec);
  const buf = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    buf[i] = 0.8 * Math.sin(2 * Math.PI * freq * i / sampleRate);
  }
  return buf;
}

// ─── Test 1: YIN Pitch Detection ───────────────────────────────
console.log('\n1. YIN Pitch Detection');

const SR = 16000;
const testFreqs = [261.63, 293.66, 329.63, 392.00, 440.00];
const expectedNotes = ['C/Sa', 'D/Ri', 'E/Ga', 'G/Pa', 'A/Da'];

for (let i = 0; i < testFreqs.length; i++) {
  const buf = generateSineBuffer(testFreqs[i], SR, 0.25);
  const { frequency, confidence } = yinPitchDetection(buf, SR);
  const error = Math.abs(frequency - testFreqs[i]);
  const pctError = (error / testFreqs[i]) * 100;
  assert(
    pctError < 2 && confidence > 0.8,
    `Detect ${testFreqs[i]} Hz (${expectedNotes[i]}): got ${frequency.toFixed(1)} Hz (${pctError.toFixed(2)}% error, conf=${confidence.toFixed(2)})`
  );
}

// Low volume / silence
const silentBuf = new Float32Array(4096);
const silentResult = yinPitchDetection(silentBuf, SR);
assert(silentResult.frequency === 0 || silentResult.confidence < 0.3, `Silent buffer returns no pitch`);

// ─── Test 2: RMS Calculation ───────────────────────────────────
console.log('\n2. RMS Calculation');

const loudBuf = generateSineBuffer(440, SR, 0.1);
const rms = calculateRMS(loudBuf);
assert(rms > 0.4 && rms < 0.7, `RMS of 0.8-amplitude sine: ${rms.toFixed(3)} (expected ~0.566)`);

const quietRms = calculateRMS(silentBuf);
assert(quietRms < 0.001, `RMS of silence: ${quietRms.toFixed(6)}`);

// ─── Test 3: Pitch Smoother ────────────────────────────────────
console.log('\n3. Pitch Smoother');

const smoother = createPitchSmoother(5);
smoother(440, 0.9);
smoother(442, 0.88);
smoother(438, 0.92);
const { pitch, confidence: smoothConf } = smoother(441, 0.91);
assert(
  Math.abs(pitch - 440) < 3 && smoothConf > 0.85,
  `Smoothed pitch: ${pitch.toFixed(1)} Hz, conf: ${smoothConf.toFixed(2)}`
);

// ─── Test 4: Swara Mapping (Frequency Ratios) ─────────────────
console.log('\n4. Swara Mapping (frequency ratios from musicnotation)');

const tonic = 261.63; // C as Sa

const swaraTests = [
  { freq: 261.63, expected: 'Sa' },
  { freq: 261.63 * (9/8), expected: 'Ri\u2082' },     // Ri2
  { freq: 261.63 * (5/4), expected: 'Ga\u2083' },     // Ga3
  { freq: 261.63 * (4/3), expected: 'Ma\u2081' },     // Ma1
  { freq: 261.63 * (3/2), expected: 'Pa' },       // Pa
  { freq: 261.63 * (5/3), expected: 'Da\u2082' },     // Da2
  { freq: 261.63 * (15/8), expected: 'Ni\u2083' },    // Ni3
  { freq: 261.63 * 2, expected: 'Sa' },            // Sa (upper octave)
];

for (const t of swaraTests) {
  const result = freqToSwara(t.freq, tonic);
  assert(
    result && result.swara === t.expected,
    `${t.freq.toFixed(1)} Hz -> ${result ? result.swara : 'null'} (expected ${t.expected})${result ? `, octave=${result.octaveOffset}` : ''}`
  );
}

// Upper octave check
const upperSa = freqToSwara(261.63 * 2, tonic);
assert(upperSa && upperSa.octaveOffset === 1, `Upper Sa octave offset: ${upperSa?.octaveOffset} (expected 1)`);

// Lower octave check
const lowerPa = freqToSwara(261.63 * (3/4), tonic); // Pa below
assert(lowerPa && lowerPa.octaveOffset === -1, `Lower Pa octave offset: ${lowerPa?.octaveOffset} (expected -1)`);

// Invalid frequency
const invalid = freqToSwara(0, tonic);
assert(invalid === null, `Zero frequency returns null`);

// ─── Test 5: Tonic Detection ──────────────────────────────────
console.log('\n5. Tonic Detection');

// Generate frequencies centered around C4 (261.63 Hz)
const tonicFreqs = [];
for (let i = 0; i < 200; i++) tonicFreqs.push(261.63 + (Math.random() - 0.5) * 5);
for (let i = 0; i < 50; i++) tonicFreqs.push(392.00 + (Math.random() - 0.5) * 5);
for (let i = 0; i < 30; i++) tonicFreqs.push(329.63 + (Math.random() - 0.5) * 5);

const detected = detectTonic(tonicFreqs);
const tonicError = Math.abs(detected.hz - 261.63);
assert(
  tonicError < 20,
  `Tonic detection: ${detected.hz} Hz (${detected.note}), error: ${tonicError.toFixed(1)} Hz from C4`
);

// ─── Test 6: Stability Filter ─────────────────────────────────
console.log('\n6. Stability Filter');

const rawSwaras = [
  // Sa held for 5 frames (stable)
  { swara: 'Sa', semitone: 0, octaveOffset: 0, time: 0.0, confidence: 0.9, frequency: 261, frameDuration: 0.032 },
  { swara: 'Sa', semitone: 0, octaveOffset: 0, time: 0.032, confidence: 0.88, frequency: 262, frameDuration: 0.032 },
  { swara: 'Sa', semitone: 0, octaveOffset: 0, time: 0.064, confidence: 0.92, frequency: 261, frameDuration: 0.032 },
  { swara: 'Sa', semitone: 0, octaveOffset: 0, time: 0.096, confidence: 0.91, frequency: 262, frameDuration: 0.032 },
  { swara: 'Sa', semitone: 0, octaveOffset: 0, time: 0.128, confidence: 0.89, frequency: 261, frameDuration: 0.032 },
  // Transient Ri (only 1 frame - should be filtered out)
  { swara: 'Ri\u2082', semitone: 2, octaveOffset: 0, time: 0.16, confidence: 0.7, frequency: 294, frameDuration: 0.032 },
  // Pa held for 4 frames (stable)
  { swara: 'Pa', semitone: 7, octaveOffset: 0, time: 0.192, confidence: 0.95, frequency: 392, frameDuration: 0.032 },
  { swara: 'Pa', semitone: 7, octaveOffset: 0, time: 0.224, confidence: 0.93, frequency: 391, frameDuration: 0.032 },
  { swara: 'Pa', semitone: 7, octaveOffset: 0, time: 0.256, confidence: 0.94, frequency: 392, frameDuration: 0.032 },
  { swara: 'Pa', semitone: 7, octaveOffset: 0, time: 0.288, confidence: 0.96, frequency: 393, frameDuration: 0.032 },
];

const stable = filterStableSwaras(rawSwaras, 3);
assert(stable.length === 2, `Stability filter: ${stable.length} stable swaras (expected 2, transient Ri filtered)`);
assert(stable[0].swara === 'Sa', `First stable swara: ${stable[0].swara} (expected Sa)`);
assert(stable[1].swara === 'Pa', `Second stable swara: ${stable[1].swara} (expected Pa)`);
assert(stable[0].duration > 0.1, `Sa duration: ${stable[0].duration.toFixed(3)}s (expected > 0.1s)`);

// ─── Test 7: Full Pipeline (YIN -> Swara Mapping) ─────────────
console.log('\n7. Full Pipeline: YIN -> Swara Mapping');

// Generate a sequence: Sa (0.3s) -> Pa (0.3s) -> Sa (0.3s)
const saFreq = 261.63;
const paFreq = 261.63 * 1.5;
const pipeSamples = new Float32Array(SR * 0.9);
for (let i = 0; i < SR * 0.3; i++) pipeSamples[i] = 0.8 * Math.sin(2 * Math.PI * saFreq * i / SR);
for (let i = 0; i < SR * 0.3; i++) pipeSamples[SR * 0.3 + i] = 0.8 * Math.sin(2 * Math.PI * paFreq * i / SR);
for (let i = 0; i < SR * 0.3; i++) pipeSamples[SR * 0.6 + i] = 0.8 * Math.sin(2 * Math.PI * saFreq * i / SR);

const FRAME_SIZE = 2048;
const HOP_SIZE = 512;
const totalFrames = Math.floor((pipeSamples.length - FRAME_SIZE) / HOP_SIZE);
const detectedPitches = [];
const allFreqs = [];

for (let f = 0; f < totalFrames; f++) {
  const start = f * HOP_SIZE;
  const frame = pipeSamples.slice(start, start + FRAME_SIZE);
  const rmsVal = calculateRMS(frame);
  const time = start / SR;

  if (rmsVal > PITCH_CONFIG.energyThreshold) {
    const { frequency, confidence: conf } = yinPitchDetection(frame, SR);
    if (frequency > 0 && conf >= PITCH_CONFIG.minConfidence) {
      allFreqs.push(frequency);
      const mapped = freqToSwara(frequency, saFreq);
      if (mapped) {
        detectedPitches.push({
          ...mapped,
          time,
          frequency,
          confidence: conf * 0.7 + mapped.accuracy * 0.3,
          frameDuration: HOP_SIZE / SR,
        });
      }
    }
  }
}

assert(detectedPitches.length > 10, `Pipeline detected ${detectedPitches.length} pitch frames (expected > 10)`);

const pipeStable = filterStableSwaras(detectedPitches, 3);
assert(pipeStable.length >= 2, `Pipeline stable swaras: ${pipeStable.length} (expected >= 2)`);

const swaraNames = pipeStable.map(s => s.swara);
console.log(`    Detected sequence: ${swaraNames.join(' -> ')}`);
assert(swaraNames.includes('Sa'), `Sequence includes Sa`);
assert(swaraNames.includes('Pa'), `Sequence includes Pa`);

// ─── Test 8: Generate test WAV for browser testing ─────────────
console.log('\n8. Generate test WAV file');

function writeWav(filename, samples, sr) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sr * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = samples.length * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);  // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sr, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 30);
  buffer.writeUInt16LE(bitsPerSample, 32);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filename, buffer);
}

// Generate a Mohanam phrase: Sa Ri2 Ga3 Pa Da2 Pa Ga3 Ri2 Sa
const mohanamRatios = [1, 9/8, 5/4, 3/2, 5/3, 3/2, 5/4, 9/8, 1];
const mohanamNames = ['Sa', 'Ri2', 'Ga3', 'Pa', 'Da2', 'Pa', 'Ga3', 'Ri2', 'Sa'];
const noteDuration = 0.4;
const wavSR = 44100;
const totalLen = mohanamRatios.length * noteDuration * wavSR;
const wavSamples = new Float32Array(Math.floor(totalLen));
const tonicHz = 261.63;

for (let n = 0; n < mohanamRatios.length; n++) {
  const freq = tonicHz * mohanamRatios[n];
  const startSample = Math.floor(n * noteDuration * wavSR);
  const endSample = Math.floor((n + 1) * noteDuration * wavSR);
  for (let i = startSample; i < endSample && i < wavSamples.length; i++) {
    const t = (i - startSample) / wavSR;
    // Add slight envelope to make it more realistic
    const env = Math.min(1, t * 20) * Math.min(1, (noteDuration - t) * 20);
    wavSamples[i] = 0.7 * env * Math.sin(2 * Math.PI * freq * i / wavSR);
  }
}

writeWav('test-mohanam.wav', wavSamples, wavSR);
const fileSize = fs.statSync('test-mohanam.wav').size;
assert(fileSize > 1000, `test-mohanam.wav created (${(fileSize / 1024).toFixed(1)} KB, ${(mohanamRatios.length * noteDuration).toFixed(1)}s)`);
console.log(`    Phrase: ${mohanamNames.join(' \u2192 ')}`);

// ─── Summary ──────────────────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('All tests passed! The pipeline is working correctly.');
  console.log('\nYou can now open http://localhost:5174 and drop test-mohanam.wav to verify the full app.');
} else {
  console.log('Some tests failed. Review the output above.');
  process.exit(1);
}
