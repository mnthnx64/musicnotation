const SHRUTI_MIDI = {
  'C': 60, 'C#': 61, 'D': 62, 'D#': 63, 'E': 64, 'F': 65,
  'F#': 66, 'G': 67, 'G#': 68, 'A': 69, 'A#': 70, 'B': 71,
};

const TICKS_PER_QN = 480;

function writeVarLen(value) {
  const bytes = [];
  let v = value & 0x7f;
  bytes.unshift(v);
  value >>= 7;
  while (value > 0) {
    v = (value & 0x7f) | 0x80;
    bytes.unshift(v);
    value >>= 7;
  }
  return bytes;
}

function writeUint16(arr, val) { arr.push((val >> 8) & 0xff, val & 0xff); }
function writeUint32(arr, val) { arr.push((val >> 24) & 0xff, (val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff); }
function writeStr(arr, s) { for (let i = 0; i < s.length; i++) arr.push(s.charCodeAt(i)); }

export function exportAsMidi(swaras, { shruti = 'C', bpm = 72, title = 'EzSwara' } = {}) {
  const baseMidi = SHRUTI_MIDI[shruti] || 60;
  const ticksPerSec = (TICKS_PER_QN * bpm) / 60;

  const track = [];

  const tempoUs = Math.round(60000000 / bpm);
  track.push(...writeVarLen(0));
  track.push(0xff, 0x51, 0x03);
  track.push((tempoUs >> 16) & 0xff, (tempoUs >> 8) & 0xff, tempoUs & 0xff);

  if (title) {
    track.push(...writeVarLen(0));
    track.push(0xff, 0x03);
    const titleBytes = [];
    writeStr(titleBytes, title);
    track.push(...writeVarLen(titleBytes.length), ...titleBytes);
  }

  let prevTick = 0;

  for (const s of swaras) {
    if (!s.swara || s.swara === ',' || s.semitone == null) continue;
    const midi = baseMidi + (s.semitone || 0) + ((s.octaveOffset || 0) * 12);
    if (midi < 0 || midi > 127) continue;

    const startTick = Math.round(s.time * ticksPerSec);
    const durTicks = Math.max(1, Math.round(s.duration * ticksPerSec));
    const velocity = Math.max(40, Math.min(127, Math.round((s.confidence || 0.8) * 127)));

    const onDelta = Math.max(0, startTick - prevTick);
    track.push(...writeVarLen(onDelta));
    track.push(0x90, midi, velocity);
    prevTick = startTick;

    track.push(...writeVarLen(durTicks));
    track.push(0x80, midi, 0);
    prevTick = startTick + durTicks;
  }

  track.push(...writeVarLen(0));
  track.push(0xff, 0x2f, 0x00);

  const file = [];
  writeStr(file, 'MThd');
  writeUint32(file, 6);
  writeUint16(file, 0);
  writeUint16(file, 1);
  writeUint16(file, TICKS_PER_QN);

  writeStr(file, 'MTrk');
  writeUint32(file, track.length);
  file.push(...track);

  return new Blob([new Uint8Array(file)], { type: 'audio/midi' });
}

export function downloadMidi(blob, filename = 'export.mid') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
