import { useRef, useEffect, useState } from 'react';

const CLEF_W = 16;
const BASE_W = 60;
const PAD = 4;
const SARGAM_H = 80;
const TIME_H = 22;
const ROW_GAP = 14;

export default function SwaraTimeline({ swaras, playbackTime, isPlaying }) {
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

  const rowH = SARGAM_H + TIME_H;

  // Compute visual width for each swara based on duration
  const maxDur = Math.max(0.1, ...swaras.map(s => s.duration));
  const minW = 28;
  const noteWidths = swaras.map(s => {
    const normalized = s.duration / maxDur;
    return Math.max(minW, normalized * BASE_W * 3);
  });

  // Build rows by wrapping
  const rows = [];
  let currentRow = [];
  let rowX = CLEF_W;

  for (let i = 0; i < swaras.length; i++) {
    const w = noteWidths[i];
    if (rowX + w > containerW - 8 && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
      rowX = CLEF_W;
    }
    currentRow.push({ s: swaras[i], xL: rowX, w, idx: i });
    rowX += w + PAD;
  }
  if (currentRow.length > 0) rows.push(currentRow);

  const displayRows = Math.max(1, rows.length);
  const svgH = displayRows * rowH + (displayRows - 1) * ROW_GAP + 12;
  const getRowTop = (r) => r * (rowH + ROW_GAP);

  // Find active note based on playback time
  let activeIdx = -1;
  if (isPlaying && playbackTime > 0) {
    for (let i = 0; i < swaras.length; i++) {
      if (playbackTime >= swaras[i].time && playbackTime < swaras[i].time + swaras[i].duration) {
        activeIdx = i;
        break;
      }
    }
  }

  // Auto-scroll to active row
  useEffect(() => {
    if (activeIdx >= 0 && containerRef.current) {
      for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri];
        if (row.some(n => n.idx === activeIdx)) {
          const rowTop = getRowTop(ri);
          const container = containerRef.current;
          const visibleTop = container.scrollTop;
          const visibleBottom = visibleTop + container.clientHeight;
          if (rowTop < visibleTop || rowTop + rowH > visibleBottom) {
            container.scrollTo({ top: rowTop - 20, behavior: 'smooth' });
          }
          break;
        }
      }
    }
  }, [activeIdx]);

  if (!swaras.length) {
    return (
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }}>
        <div className="empty-state">
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            border: '1.5px dashed var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <span className="empty-hint">Upload an audio file to see notation...</span>
        </div>
      </div>
    );
  }

  const renderRow = (ri) => {
    const rTop = getRowTop(ri);
    const rowNotes = rows[ri] || [];

    return (
      <g key={`row${ri}`}>
        <rect x={0} y={rTop} width={containerW} height={SARGAM_H} fill="var(--bg)" />

        {rowNotes.map(({ s, xL, w, idx }) => {
          const xC = xL + w / 2;
          const midY = rTop + SARGAM_H / 2;
          const isActive = idx === activeIdx;
          const lowC = s.confidence < 0.6;
          const isLong = s.duration > maxDur * 0.4;
          const color = isActive ? 'var(--accent)' : lowC ? 'var(--text-dim)' : 'var(--text)';
          const fontSize = w < 36 ? 10 : w < 50 ? 12 : 15;
          const altBg = idx % 2 === 0;

          return (
            <g key={`n${idx}`}>
              {altBg && (
                <rect x={xL} y={rTop} width={w} height={SARGAM_H}
                  fill="var(--bg-surface)" opacity={0.3} />
              )}
              {isActive && (
                <rect x={xL + 1} y={rTop + 4} width={w - 2} height={SARGAM_H - 8}
                  rx={6} fill="var(--accent-glow)" />
              )}
              {isLong && (
                <line x1={xL + fontSize * 0.7 + 4} x2={xL + w - 6}
                  y1={midY + 2} y2={midY + 2}
                  stroke={color} strokeWidth={1} strokeDasharray="4 3" opacity={0.45} />
              )}
              {s.octaveOffset > 0 && (
                <circle cx={xC} cy={rTop + 13} r={3}
                  fill={isActive ? 'var(--accent)' : 'var(--text-muted)'} />
              )}
              {s.octaveOffset < 0 && (
                <circle cx={xC} cy={rTop + SARGAM_H - 13} r={3}
                  fill="var(--accent-dim)" />
              )}
              <text
                x={isLong ? xL + 8 : xC}
                y={midY + 5}
                textAnchor={isLong ? 'start' : 'middle'}
                fontSize={fontSize} fontWeight={isActive ? 600 : 400}
                fontFamily="JetBrains Mono, monospace" fill={color}
                fontStyle={lowC ? 'italic' : 'normal'}
              >
                {s.swara}
              </text>
              {lowC && (
                <circle cx={xL + w - 6} cy={midY - 14} r={2.5}
                  fill="var(--yellow)" opacity={0.85} />
              )}
            </g>
          );
        })}

        {/* Speed lines for short swaras */}
        {(() => {
          const midY = rTop + SARGAM_H / 2;
          const beams = [];
          let i = 0;
          while (i < rowNotes.length) {
            const dur = rowNotes[i].s.duration;
            if (dur >= maxDur * 0.2) { i++; continue; }
            let j = i + 1;
            while (j < rowNotes.length && rowNotes[j].s.duration < maxDur * 0.2) j++;
            if (j - i >= 2) {
              const x1 = rowNotes[i].xL + 3;
              const x2 = rowNotes[j - 1].xL + rowNotes[j - 1].w - 3;
              beams.push(
                <line key={`b1-${ri}-${i}`} x1={x1} x2={x2}
                  y1={midY + 13} y2={midY + 13}
                  stroke="var(--text)" strokeWidth={1.2} opacity={0.55} />
              );
            }
            i = j;
          }
          return beams;
        })()}

        {/* Time axis */}
        <rect x={0} y={rTop + SARGAM_H} width={containerW} height={TIME_H} fill="var(--bg-surface)" />
        <line x1={0} x2={containerW} y1={rTop + SARGAM_H} y2={rTop + SARGAM_H}
          stroke="var(--border-dim)" strokeWidth={1} />
        {rowNotes.map(({ s, xL, idx }) => (
          <g key={`t${idx}`}>
            <line x1={xL} x2={xL} y1={rTop + SARGAM_H} y2={rTop + SARGAM_H + 4}
              stroke={idx % 4 === 0 ? 'var(--accent-dim)' : 'var(--border)'}
              strokeWidth={idx % 4 === 0 ? 1.5 : 0.8} />
            {idx % 4 === 0 && (
              <text x={xL + 3} y={rTop + SARGAM_H + TIME_H - 5} fontSize={8}
                fill="var(--text-dim)" fontFamily="JetBrains Mono, monospace">
                {formatTime(s.time)}
              </text>
            )}
          </g>
        ))}
      </g>
    );
  };

  return (
    <div ref={containerRef} style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>
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
