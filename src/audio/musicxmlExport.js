const SHRUTI_MIDI = {
  'C': 60, 'C#': 61, 'D': 62, 'D#': 63, 'E': 64, 'F': 65,
  'F#': 66, 'G': 67, 'G#': 68, 'A': 69, 'A#': 70, 'B': 71,
};

const PITCH_CLASSES = [
  { step: 'C', alter: 0 },
  { step: 'C', alter: 1 },
  { step: 'D', alter: 0 },
  { step: 'D', alter: 1 },
  { step: 'E', alter: 0 },
  { step: 'F', alter: 0 },
  { step: 'F', alter: 1 },
  { step: 'G', alter: 0 },
  { step: 'G', alter: 1 },
  { step: 'A', alter: 0 },
  { step: 'A', alter: 1 },
  { step: 'B', alter: 0 },
];

function quantizeDuration(dur, divisions) {
  const whole = divisions * 4;
  if (dur >= whole * 0.75) return { type: 'whole', duration: whole };
  if (dur >= whole * 0.375) return { type: 'half', duration: whole / 2 };
  if (dur >= whole * 0.1875) return { type: 'quarter', duration: whole / 4 };
  if (dur >= whole * 0.09) return { type: 'eighth', duration: whole / 8 };
  return { type: '16th', duration: whole / 16 };
}

export function exportAsMusicXML(swaras, { shruti = 'C', raga = 'Custom', tala = '', bpm = 72, title = 'EzSwara' } = {}) {
  const baseMidi = SHRUTI_MIDI[shruti] || 60;
  const divisions = 4;
  const beatsPerMeasure = 4;
  const qnDuration = 60 / bpm;

  let measures = '';
  let measureNotes = [];
  let currentDivs = 0;
  const maxDivs = divisions * beatsPerMeasure;
  let measureNum = 1;

  const flushMeasure = (isFirst) => {
    let m = `    <measure number="${measureNum}">\n`;
    if (isFirst) {
      m += `      <attributes>\n`;
      m += `        <divisions>${divisions}</divisions>\n`;
      m += `        <time>\n          <beats>${beatsPerMeasure}</beats>\n          <beat-type>4</beat-type>\n        </time>\n`;
      m += `        <clef>\n          <sign>G</sign>\n          <line>2</line>\n        </clef>\n`;
      m += `      </attributes>\n`;
      m += `      <direction placement="above">\n        <sound tempo="${bpm}"/>\n      </direction>\n`;
    }
    m += measureNotes.join('');
    m += `    </measure>\n`;
    measures += m;
    measureNum++;
    measureNotes = [];
    currentDivs = 0;
  };

  for (const s of swaras) {
    if (!s.swara || s.swara === ',' || s.semitone == null) continue;

    const midi = baseMidi + (s.semitone || 0) + ((s.octaveOffset || 0) * 12);
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    const pitch = PITCH_CLASSES[pc];
    const durSec = s.duration || 0.25;
    const durDivs = Math.round((durSec / qnDuration) * divisions);
    const q = quantizeDuration(durDivs, divisions);

    if (currentDivs + q.duration > maxDivs) {
      if (currentDivs < maxDivs) {
        const restDur = maxDivs - currentDivs;
        measureNotes.push(`      <note>\n        <rest/>\n        <duration>${restDur}</duration>\n        <type>quarter</type>\n      </note>\n`);
      }
      flushMeasure(measureNum === 1);
    }

    let note = `      <note>\n`;
    note += `        <pitch>\n          <step>${pitch.step}</step>\n`;
    if (pitch.alter !== 0) note += `          <alter>${pitch.alter}</alter>\n`;
    note += `          <octave>${octave}</octave>\n        </pitch>\n`;
    note += `        <duration>${q.duration}</duration>\n`;
    note += `        <type>${q.type}</type>\n`;
    note += `      </note>\n`;
    measureNotes.push(note);
    currentDivs += q.duration;
  }

  if (measureNotes.length > 0 || measureNum === 1) {
    flushMeasure(measureNum === 1);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>${escapeXml(title)}</work-title>
  </work>
  <identification>
    <creator type="composer">EzSwara</creator>
    <encoding>
      <software>EzSwara</software>
    </encoding>
    <miscellaneous>
      <miscellaneous-field name="raga">${escapeXml(raga)}</miscellaneous-field>
      <miscellaneous-field name="shruti">${escapeXml(shruti)}</miscellaneous-field>
    </miscellaneous>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Voice</part-name>
    </score-part>
  </part-list>
  <part id="P1">
${measures}  </part>
</score-partwise>`;

  return xml;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function downloadMusicXML(xml, filename = 'export.musicxml') {
  const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
