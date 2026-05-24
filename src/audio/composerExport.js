import { TALA_STRUCTURE, getTalaBeats, TALA_SECTION_NAMES } from '../data/constants';

export function exportAsText(avartanams, { raga, tala, shruti, title, bpm } = {}) {
  const activeTala = tala === 'Alapana (Free)' ? 'Adi (8)' : tala;
  const beats = getTalaBeats(activeTala);
  const structure = TALA_STRUCTURE[activeTala] || [beats];
  const lines = [];

  if (title) lines.push(title, '');
  lines.push(`Raga: ${raga}    Tala: ${activeTala}    Shruti: ${shruti}    BPM: ${bpm}`);
  lines.push('');

  // Header
  const sectionBounds = [];
  let acc = 0;
  for (let i = 0; i < structure.length - 1; i++) {
    acc += structure[i];
    sectionBounds.push(acc);
  }

  const colWidth = 8;
  let header = '     ';
  for (let b = 0; b < beats; b++) {
    const sep = sectionBounds.includes(b) ? '| ' : '  ';
    if (b > 0) header += sep;
    header += String(b + 1).padEnd(colWidth - 2);
  }
  lines.push(header);
  lines.push('-'.repeat(header.length));

  for (let ri = 0; ri < avartanams.length; ri++) {
    const row = avartanams[ri];
    let line = String(ri + 1).padStart(3) + '. ';
    for (let ci = 0; ci < row.length; ci++) {
      const sep = ci > 0 ? (sectionBounds.includes(ci) ? '| ' : '  ') : '';
      const cell = row[ci];
      const txt = cell.map(s => {
        if (!s.swara || s.swara === '') return '-';
        if (s.swara === ',') return ',';
        let t = s.swara;
        if (s.octave === 1) t += '\u0307';
        if (s.octave === -1) t += '\u0323';
        return t;
      }).join(' ');
      line += sep + txt.padEnd(colWidth - 2);
    }
    lines.push(line);
  }

  return lines.join('\n');
}

export function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printComposition() {
  window.print();
}
