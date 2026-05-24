// Just-intonation frequency ratios relative to Sa (from musicnotation Python scripts)
const SWARA_RATIOS = [
  { name: 'Sa',  ratio: 1.0,       semitone: 0  },
  { name: 'Ri\u2081', ratio: 256/243,   semitone: 1  },
  { name: 'Ri\u2082', ratio: 9/8,       semitone: 2  },
  { name: 'Ga\u2082', ratio: 6/5,       semitone: 3  },
  { name: 'Ga\u2083', ratio: 5/4,       semitone: 4  },
  { name: 'Ma\u2081', ratio: 4/3,       semitone: 5  },
  { name: 'Ma\u2082', ratio: 45/32,     semitone: 6  },
  { name: 'Pa',  ratio: 3/2,       semitone: 7  },
  { name: 'Da\u2081', ratio: 128/81,    semitone: 8  },
  { name: 'Da\u2082', ratio: 5/3,       semitone: 9  },
  { name: 'Ni\u2082', ratio: 9/5,       semitone: 10 },
  { name: 'Ni\u2083', ratio: 15/8,      semitone: 11 },
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function freqToSwara(freq, tonicHz, tolerance = 0.06) {
  if (freq <= 0 || tonicHz <= 0) return null;

  let ratio = freq / tonicHz;
  let octaveOffset = 0;
  while (ratio >= 2.0) { ratio /= 2; octaveOffset++; }
  while (ratio < 0.95) { ratio *= 2; octaveOffset--; }

  let closest = null;
  let minDiff = Infinity;

  for (const entry of SWARA_RATIOS) {
    const diff = Math.abs(ratio - entry.ratio);
    if (diff < minDiff && diff <= tolerance) {
      closest = entry;
      minDiff = diff;
    }
  }

  if (!closest) return null;

  return {
    swara: closest.name,
    semitone: closest.semitone,
    octaveOffset,
    accuracy: 1 - (minDiff / tolerance),
  };
}

export function detectTonic(frequencies) {
  const valid = frequencies.filter(f => f > 60 && f < 1200);
  if (valid.length === 0) return { hz: 261.63, note: 'C' };

  // Cents-based histogram (from musicnotation main.py approach)
  const A0 = 27.5;
  const cents = valid.map(f => 1200 * Math.log2(f / A0));

  let minC = Infinity, maxC = -Infinity;
  for (const c of cents) { if (c < minC) minC = c; if (c > maxC) maxC = c; }
  const binSize = 15;
  const numBins = Math.ceil((maxC - minC) / binSize) + 1;
  const hist = new Array(numBins).fill(0);

  for (const c of cents) {
    const bin = Math.floor((c - minC) / binSize);
    if (bin >= 0 && bin < numBins) hist[bin]++;
  }

  let maxVal = 0;
  let maxBin = 0;
  for (let i = 0; i < numBins; i++) {
    if (hist[i] > maxVal) { maxVal = hist[i]; maxBin = i; }
  }

  const peakCents = minC + (maxBin + 0.5) * binSize;
  const tonicHz = A0 * Math.pow(2, peakCents / 1200);

  const midi = Math.round(12 * Math.log2(tonicHz / 440) + 69);
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];

  return { hz: Math.round(tonicHz * 100) / 100, note };
}

export function hzToNoteName(hz) {
  const midi = Math.round(12 * Math.log2(hz / 440) + 69);
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { note, octave };
}

// Stability filter: suppress transient swaras (from musicnotation test.py)
export function filterStableSwaras(swaras, minFrames = 3) {
  if (swaras.length === 0) return [];

  const stable = [];
  let prev = swaras[0];
  let runStart = 0;
  let count = 1;

  for (let i = 1; i < swaras.length; i++) {
    if (swaras[i].swara === prev.swara && swaras[i].octaveOffset === prev.octaveOffset) {
      count++;
    } else {
      if (count >= minFrames) {
        const startTime = prev.time;
        const endTime = swaras[i - 1].time + (swaras[i - 1].frameDuration || 0.032);
        const avgConf = swaras.slice(runStart, i).reduce((s, n) => s + n.confidence, 0) / count;
        const avgFreq = swaras.slice(runStart, i).reduce((s, n) => s + n.frequency, 0) / count;
        stable.push({
          swara: prev.swara,
          semitone: prev.semitone,
          octaveOffset: prev.octaveOffset,
          time: startTime,
          duration: endTime - startTime,
          confidence: avgConf,
          frequency: avgFreq,
        });
      }
      prev = swaras[i];
      runStart = i;
      count = 1;
    }
  }

  if (count >= minFrames) {
    const last = swaras[swaras.length - 1];
    const startTime = prev.time;
    const endTime = last.time + (last.frameDuration || 0.032);
    const avgConf = swaras.slice(runStart).reduce((s, n) => s + n.confidence, 0) / count;
    const avgFreq = swaras.slice(runStart).reduce((s, n) => s + n.frequency, 0) / count;
    stable.push({
      swara: prev.swara,
      semitone: prev.semitone,
      octaveOffset: prev.octaveOffset,
      time: startTime,
      duration: endTime - startTime,
      confidence: avgConf,
      frequency: avgFreq,
    });
  }

  return stable;
}

export { SWARA_RATIOS, NOTE_NAMES };
