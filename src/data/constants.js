export const SHRUTI_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const TALAS = ['Alapana (Unmetered)', 'Adi (8)', 'Rupaka (6)', 'Misra Chapu (7)', 'Khanda Chapu (5)', 'Dhruva (14)', 'Matya (10)', 'Jhampa (10)', 'Ata (14)', 'Eka (4)', 'Triputa (7)', 'Custom'];

export const RAGAS = ['Custom', 'Mohanam', 'Kalyani', 'Bhairavi', 'Shankarabharanam', 'Kharaharapriya'];

export const TALA_STRUCTURE = {
  'Adi (8)':          [4, 2, 2],
  'Rupaka (6)':       [2, 4],
  'Misra Chapu (7)':  [3, 2, 2],
  'Khanda Chapu (5)': [2, 3],
  'Dhruva (14)':      [4, 2, 4, 4],
  'Matya (10)':       [4, 2, 4],
  'Jhampa (10)':      [7, 1, 2],
  'Ata (14)':         [5, 5, 2, 2],
  'Eka (4)':          [4],
  'Triputa (7)':      [3, 2, 2],
};

export const NOTE_FREQUENCIES = {
  'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
  'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
  'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88,
};

export const RAGA_SEMITONES = {
  Custom:            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  Mohanam:           [0, 2, 4, 7, 9],
  Kalyani:           [0, 2, 4, 6, 7, 9, 11],
  Bhairavi:          [0, 1, 3, 5, 7, 8, 10],
  Shankarabharanam:  [0, 2, 4, 5, 7, 9, 11],
  Kharaharapriya:    [0, 2, 3, 5, 7, 9, 10],
};

// Swaras available per raga (for composer palette)
export const RAGA_SWARAS = {
  Custom:            ['Sa', 'Ri\u2081', 'Ri\u2082', 'Ga\u2082', 'Ga\u2083', 'Ma\u2081', 'Ma\u2082', 'Pa', 'Da\u2081', 'Da\u2082', 'Ni\u2082', 'Ni\u2083'],
  Mohanam:           ['Sa', 'Ri\u2082', 'Ga\u2083', 'Pa', 'Da\u2082'],
  Kalyani:           ['Sa', 'Ri\u2082', 'Ga\u2083', 'Ma\u2082', 'Pa', 'Da\u2082', 'Ni\u2083'],
  Bhairavi:          ['Sa', 'Ri\u2081', 'Ga\u2082', 'Ma\u2081', 'Pa', 'Da\u2081', 'Ni\u2082'],
  Shankarabharanam:  ['Sa', 'Ri\u2082', 'Ga\u2083', 'Ma\u2081', 'Pa', 'Da\u2082', 'Ni\u2083'],
  Kharaharapriya:    ['Sa', 'Ri\u2082', 'Ga\u2082', 'Ma\u2081', 'Pa', 'Da\u2082', 'Ni\u2082'],
};

// Keyboard shortcut -> swara name. In a raga context, maps to the raga's variant.
export const SWARA_SHORTCUTS = { s: 'Sa', r: 'Ri', g: 'Ga', m: 'Ma', p: 'Pa', d: 'Da', n: 'Ni' };

// Frequency ratios for synth playback (just intonation)
export const SWARA_FREQ_RATIOS = {
  'Sa': 1, 'Ri\u2081': 256/243, 'Ri\u2082': 9/8, 'Ga\u2082': 6/5, 'Ga\u2083': 5/4,
  'Ma\u2081': 4/3, 'Ma\u2082': 45/32, 'Pa': 3/2, 'Da\u2081': 128/81, 'Da\u2082': 5/3,
  'Ni\u2082': 9/5, 'Ni\u2083': 15/8,
};

// Semitone (0-11) -> default Carnatic swara name. Used to derive swara
// labels for custom scales built from raw semitone sets.
export const SWARA_NAMES_BY_SEMITONE = [
  'Sa', 'Ri\u2081', 'Ri\u2082', 'Ga\u2082', 'Ga\u2083',
  'Ma\u2081', 'Ma\u2082', 'Pa', 'Da\u2081', 'Da\u2082', 'Ni\u2082', 'Ni\u2083',
];

// Resolve the allowed swara list for a raga, falling back to any user-defined
// custom scale of the same name.
export function getRagaSwaras(ragaName, customScales = []) {
  if (RAGA_SWARAS[ragaName]) return RAGA_SWARAS[ragaName];
  const custom = customScales.find(s => s.name === ragaName);
  if (custom) return custom.swaras;
  return RAGA_SWARAS.Custom;
}

// Resolve the allowed semitone set for a raga (for snapping), falling back to
// any user-defined custom scale of the same name.
export function getRagaSemitones(ragaName, customScales = []) {
  if (RAGA_SEMITONES[ragaName]) return RAGA_SEMITONES[ragaName];
  const custom = customScales.find(s => s.name === ragaName);
  if (custom) return custom.semitones;
  return RAGA_SEMITONES.Custom;
}

// Convert a full swara name (e.g. "Ri\u2081") to its short form (e.g. "R\u2081"):
// first letter + any trailing subscript digits. Rests/blanks pass through.
export function toShortSwara(name) {
  if (!name || name === ',') return name;
  const sub = name.match(/[\u2080-\u2089]+$/);
  return name[0] + (sub ? sub[0] : '');
}

// Format a swara name for display per the active notation style.
export function formatSwara(name, notation = 'full') {
  return notation === 'short' ? toShortSwara(name) : name;
}

// Resolve a shortcut letter to the correct swara variant for a raga
export function resolveShortcut(key, ragaName, customScales = []) {
  const swaras = getRagaSwaras(ragaName, customScales);
  const prefix = SWARA_SHORTCUTS[key];
  if (!prefix) return null;
  if (prefix === 'Sa' || prefix === 'Pa') return prefix;
  return swaras.find(s => s.startsWith(prefix)) || null;
}

// Tala section names
export const TALA_SECTION_NAMES = {
  'Adi (8)':          ['Laghu', 'Drutam', 'Drutam'],
  'Rupaka (6)':       ['Drutam', 'Laghu'],
  'Misra Chapu (7)':  ['3', '2', '2'],
  'Khanda Chapu (5)': ['2', '3'],
  'Dhruva (14)':      ['Laghu', 'Drutam', 'Laghu', 'Laghu'],
  'Matya (10)':       ['Laghu', 'Drutam', 'Laghu'],
  'Jhampa (10)':      ['Laghu', 'Anudr.', 'Drutam'],
  'Ata (14)':         ['Laghu', 'Laghu', 'Drutam', 'Drutam'],
  'Eka (4)':          ['Laghu'],
  'Triputa (7)':      ['Laghu', 'Drutam', 'Drutam'],
};

export const BEAT_W    = 68;
export const CLEF_W    = 44;
export const CYCLE_SEP = 26;
export const STAFF_LINE_GAP = 10;
export const STAFF_TOP_PAD  = 16;
export const ALAP_NOTE_BASE_W = 72;
export const ALAP_PAD = 6;

export function getTalaBeats(tala, customGroups) {
  if (tala === 'Custom' && customGroups) return customGroups.reduce((a, b) => a + b, 0);
  return (TALA_STRUCTURE[tala] || [8]).reduce((a, b) => a + b, 0);
}

export function staffLineY(i) {
  return STAFF_TOP_PAD + i * STAFF_LINE_GAP;
}

export function staffPosToY(pos) {
  return staffLineY(4) - pos * STAFF_LINE_GAP * 0.5;
}

export function speedLines(dur) {
  if (dur <= 0.25) return 2;
  if (dur <= 0.5)  return 1;
  return 0;
}

export function formatTime(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function confClass(v) {
  return v >= 0.88 ? '' : v >= 0.75 ? 'med' : 'low';
}

export function confLabel(v) {
  return v >= 0.88 ? 'HIGH' : v >= 0.75 ? 'MED' : 'LOW';
}

export function snapToRaga(semitone, ragaName) {
  const allowed = RAGA_SEMITONES[ragaName];
  if (!allowed || allowed.includes(semitone)) return semitone;
  let best = allowed[0];
  let bestDist = 12;
  for (const s of allowed) {
    const d = Math.min(Math.abs(semitone - s), 12 - Math.abs(semitone - s));
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return best;
}
