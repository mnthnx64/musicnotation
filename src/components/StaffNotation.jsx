import { useRef, useEffect, useState } from 'react';

const STAFF_TOP = 30;
const LINE_GAP = 8;
const STAFF_H = LINE_GAP * 4;
const ROW_H = STAFF_H + 60;
const ROW_GAP = 16;
const CLEF_W = 34;
const PAD = 3;
const BASE_W = 60;

const SHRUTI_MIDI = {
  'C': 60, 'C#': 61, 'D': 62, 'D#': 63, 'E': 64, 'F': 65,
  'F#': 66, 'G': 67, 'G#': 68, 'A': 69, 'A#': 70, 'B': 71,
};

const SEMITONE_TO_STAFF_POS = [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6];
const SEMITONE_ACCIDENTALS = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];

function midiToStaffY(midi) {
  const octave = Math.floor(midi / 12) - 5;
  const pc = midi % 12;
  const pos = SEMITONE_TO_STAFF_POS[pc] + octave * 7;
  const middleC_pos = -1;
  const stepsFromB4 = pos - middleC_pos;
  return STAFF_TOP + STAFF_H - stepsFromB4 * (LINE_GAP / 2);
}

function needsAccidental(midi) {
  return SEMITONE_ACCIDENTALS[midi % 12] === 1;
}

function durationToNoteType(dur, maxDur) {
  const ratio = dur / maxDur;
  if (ratio > 0.7) return 'whole';
  if (ratio > 0.35) return 'half';
  if (ratio > 0.15) return 'quarter';
  if (ratio > 0.06) return 'eighth';
  return 'sixteenth';
}

function renderNoteHead(x, y, type, color, isActive) {
  const rx = 4.5, ry = 3.2;
  const filled = type !== 'whole' && type !== 'half';
  const els = [];

  els.push(
    <ellipse key="head" cx={x} cy={y} rx={rx} ry={ry}
      fill={filled ? color : 'none'} stroke={color} strokeWidth={1.2}
      transform={`rotate(-12 ${x} ${y})`}
      opacity={isActive ? 1 : 0.85}
    />
  );

  if (type !== 'whole') {
    const stemUp = y > STAFF_TOP + STAFF_H / 2;
    const sx = stemUp ? x + rx - 0.5 : x - rx + 0.5;
    const sy1 = y;
    const sy2 = stemUp ? y - 26 : y + 26;
    els.push(
      <line key="stem" x1={sx} y1={sy1} x2={sx} y2={sy2}
        stroke={color} strokeWidth={1} />
    );

    if (type === 'eighth' || type === 'sixteenth') {
      const flagDir = stemUp ? -1 : 1;
      const fy = stemUp ? sy2 : sy2;
      els.push(
        <path key="flag1"
          d={`M${sx} ${fy} q 5 ${6 * flagDir} 3 ${14 * flagDir}`}
          fill="none" stroke={color} strokeWidth={1} />
      );
      if (type === 'sixteenth') {
        els.push(
          <path key="flag2"
            d={`M${sx} ${fy + 5 * flagDir} q 5 ${6 * flagDir} 3 ${14 * flagDir}`}
            fill="none" stroke={color} strokeWidth={1} />
        );
      }
    }
  }

  return els;
}

function renderLedgerLines(x, y, w) {
  const lines = [];
  const topLine = STAFF_TOP;
  const bottomLine = STAFF_TOP + STAFF_H;
  if (y < topLine - LINE_GAP / 2) {
    for (let ly = topLine - LINE_GAP; ly >= y - 2; ly -= LINE_GAP) {
      lines.push(
        <line key={`ll${ly}`} x1={x - w / 2 - 3} x2={x + w / 2 + 3}
          y1={ly} y2={ly} stroke="var(--staff-line)" strokeWidth={0.8} />
      );
    }
  }
  if (y > bottomLine + LINE_GAP / 2) {
    for (let ly = bottomLine + LINE_GAP; ly <= y + 2; ly += LINE_GAP) {
      lines.push(
        <line key={`ll${ly}`} x1={x - w / 2 - 3} x2={x + w / 2 + 3}
          y1={ly} y2={ly} stroke="var(--staff-line)" strokeWidth={0.8} />
      );
    }
  }
  return lines;
}

export default function StaffNotation({ swaras, playbackTime, isPlaying, shruti }) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setContainerW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseMidi = SHRUTI_MIDI[shruti] || 60;
  const maxDur = Math.max(0.1, ...swaras.map(s => s.duration));
  const minW = 24;

  const noteWidths = swaras.map(s => {
    const normalized = s.duration / maxDur;
    return Math.max(minW, normalized * BASE_W * 3);
  });

  const rows = [];
  let currentRow = [];
  let rowX = CLEF_W + 8;

  for (let i = 0; i < swaras.length; i++) {
    const w = noteWidths[i];
    if (rowX + w > containerW - 8 && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
      rowX = CLEF_W + 8;
    }
    currentRow.push({ s: swaras[i], xL: rowX, w, idx: i });
    rowX += w + PAD;
  }
  if (currentRow.length > 0) rows.push(currentRow);

  const displayRows = Math.max(1, rows.length);
  const svgH = displayRows * ROW_H + (displayRows - 1) * ROW_GAP + 20;

  let activeIdx = -1;
  if (isPlaying && playbackTime > 0) {
    for (let i = 0; i < swaras.length; i++) {
      if (playbackTime >= swaras[i].time && playbackTime < swaras[i].time + swaras[i].duration) {
        activeIdx = i;
        break;
      }
    }
  }

  const renderRow = (ri) => {
    const rTop = ri * (ROW_H + ROW_GAP);
    const rowNotes = rows[ri] || [];

    return (
      <g key={`staff-row-${ri}`}>
        {[0, 1, 2, 3, 4].map(i => (
          <line key={`sl${i}`}
            x1={0} x2={containerW}
            y1={rTop + STAFF_TOP + i * LINE_GAP}
            y2={rTop + STAFF_TOP + i * LINE_GAP}
            stroke="var(--staff-line)" strokeWidth={0.7} />
        ))}

        {ri === 0 && (
          <text x={4} y={rTop + STAFF_TOP + STAFF_H * 0.7}
            fontSize={28} fontFamily="serif" fill="var(--staff-line)"
            fontWeight={700}>
            {'\uD834\uDD1E'}
          </text>
        )}

        {rowNotes.map(({ s, xL, w, idx }) => {
          const midi = baseMidi + (s.semitone || 0) + ((s.octaveOffset || 0) * 12);
          const staffY = rTop + midiToStaffY(midi);
          const xC = xL + w / 2;
          const isActive = idx === activeIdx;
          const noteType = durationToNoteType(s.duration, maxDur);
          const color = isActive ? 'var(--accent)' : s.confidence < 0.6 ? 'var(--text-dim)' : 'var(--note-head)';
          const hasAccidental = needsAccidental(((midi % 12) + 12) % 12);

          return (
            <g key={`note-${idx}`}>
              {isActive && (
                <rect x={xL} y={rTop + STAFF_TOP - 8} width={w} height={STAFF_H + 16}
                  rx={4} fill="var(--accent-glow)" />
              )}
              {renderLedgerLines(xC, staffY, 12)}
              {hasAccidental && (
                <text x={xC - 9} y={staffY + 3}
                  fontSize={10} fill={color} fontFamily="serif"
                  fontWeight={700}>#</text>
              )}
              {renderNoteHead(xC, staffY, noteType, color, isActive)}
              {s.confidence < 0.6 && (
                <circle cx={xL + w - 4} cy={rTop + STAFF_TOP - 4} r={2}
                  fill="var(--yellow)" opacity={0.85} />
              )}
            </g>
          );
        })}

        <text x={4} y={rTop + STAFF_TOP + STAFF_H + 18}
          fontSize={8} fill="var(--text-dim)" fontFamily="JetBrains Mono, monospace">
          {rowNotes.length > 0 ? formatTime(rowNotes[0].s.time) : ''}
        </text>
      </g>
    );
  };

  if (!swaras.length) return null;

  return (
    <div ref={containerRef} className="staff-notation-wrap">
      <svg width={containerW} height={svgH} style={{ display: 'block' }}>
        {Array.from({ length: displayRows }).map((_, ri) => renderRow(ri))}
      </svg>
    </div>
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
