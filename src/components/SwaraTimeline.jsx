import { useRef, useEffect, useState } from 'react';
import useStore from '../store';
import StaffNotation from './StaffNotation';
import { TALA_STRUCTURE, getTalaBeats } from '../data/constants';

const CLEF_W = 16;
const BASE_W = 60;
const PAD = 4;
const SARGAM_H = 80;
const TIME_H = 22;
const ROW_GAP = 14;

export default function SwaraTimeline({ swaras, playbackTime, isPlaying }) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(800);
  const mode = useStore((s) => s.mode);
  const shruti = useStore((s) => s.shruti);
  const tala = useStore((s) => s.tala);
  const customTalaGroups = useStore((s) => s.customTalaGroups);
  const selectedNoteIdx = useStore((s) => s.selectedNoteIdx);
  const setSelectedNoteIdx = useStore((s) => s.setSelectedNoteIdx);
  const deleteSwara = useStore((s) => s.deleteSwara);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const meta = e.metaKey || e.ctrlKey;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteIdx >= 0) {
        e.preventDefault();
        deleteSwara(selectedNoteIdx);
        return;
      }

      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if ((meta && e.key === 'z' && e.shiftKey) || (meta && e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === 'ArrowLeft' && selectedNoteIdx > 0) {
        e.preventDefault();
        setSelectedNoteIdx(selectedNoteIdx - 1);
        return;
      }

      if (e.key === 'ArrowRight' && selectedNoteIdx >= 0 && selectedNoteIdx < swaras.length - 1) {
        e.preventDefault();
        setSelectedNoteIdx(selectedNoteIdx + 1);
        return;
      }

      if (e.key === 'Escape') {
        setSelectedNoteIdx(-1);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteIdx, swaras.length, deleteSwara, undo, redo, setSelectedNoteIdx]);

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

  const isMetered = tala !== 'Alapana (Unmetered)';
  const hasBeatInfo = isMetered && swaras.length > 0 && swaras[0].beat !== undefined;

  const rowH = SARGAM_H + TIME_H;
  const maxDur = Math.max(0.1, ...swaras.map(s => s.duration));
  const minW = 28;
  const noteWidths = swaras.map(s => {
    const normalized = s.duration / maxDur;
    return Math.max(minW, normalized * BASE_W * 3);
  });

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

  let activeIdx = -1;
  if (isPlaying && playbackTime > 0) {
    for (let i = 0; i < swaras.length; i++) {
      if (playbackTime >= swaras[i].time && playbackTime < swaras[i].time + swaras[i].duration) {
        activeIdx = i;
        break;
      }
    }
  }

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

  if (hasBeatInfo) {
    return (
      <div ref={containerRef} style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>
        <BeatAlignedView
          swaras={swaras}
          tala={tala}
          customTalaGroups={customTalaGroups}
          containerW={containerW}
          selectedNoteIdx={selectedNoteIdx}
          setSelectedNoteIdx={setSelectedNoteIdx}
          playbackTime={playbackTime}
          isPlaying={isPlaying}
        />
      </div>
    );
  }

  if (mode === 'western') {
    return (
      <div ref={containerRef} style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>
        <StaffNotation swaras={swaras} playbackTime={playbackTime} isPlaying={isPlaying} shruti={shruti} />
      </div>
    );
  }

  if (mode === 'dual') {
    return (
      <div ref={containerRef} style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>
        <StaffNotation swaras={swaras} playbackTime={playbackTime} isPlaying={isPlaying} shruti={shruti} />
        <div style={{ borderTop: '1px solid var(--border-dim)', marginTop: 8, paddingTop: 8 }}>
          <svg width={containerW} height={svgH} style={{ display: 'block' }}>
            {Array.from({ length: displayRows }).map((_, ri) => renderSargamRow(ri, rows, containerW, maxDur, activeIdx, selectedNoteIdx, setSelectedNoteIdx, getRowTop))}
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>
      <svg width={containerW} height={svgH} style={{ display: 'block' }}>
        {Array.from({ length: displayRows }).map((_, ri) => renderSargamRow(ri, rows, containerW, maxDur, activeIdx, selectedNoteIdx, setSelectedNoteIdx, getRowTop))}
      </svg>
    </div>
  );
}

function BeatAlignedView({ swaras, tala, customTalaGroups, containerW, selectedNoteIdx, setSelectedNoteIdx }) {
  const beatsPerCycle = tala === 'Custom'
    ? customTalaGroups.reduce((a, b) => a + b, 0)
    : getTalaBeats(tala);
  const structure = tala === 'Custom'
    ? customTalaGroups
    : (TALA_STRUCTURE[tala] || [beatsPerCycle]);

  const sectionBounds = new Set();
  let sum = 0;
  for (let i = 0; i < structure.length - 1; i++) {
    sum += structure[i];
    sectionBounds.add(sum);
  }

  const maxBeat = Math.max(0, ...swaras.map(s => s.beat ?? 0));
  const totalCycles = Math.max(1, Math.ceil((maxBeat + 1) / beatsPerCycle));

  const cellW = Math.max(44, Math.floor((containerW - 40) / beatsPerCycle));
  const cellH = 52;
  const headerH = 24;
  const rowGap = 4;

  const beatMap = {};
  swaras.forEach((s, idx) => {
    const beat = s.beat ?? 0;
    if (!beatMap[beat]) beatMap[beat] = [];
    beatMap[beat].push({ ...s, idx });
  });

  return (
    <div style={{ padding: 12, overflowX: 'auto' }}>
      <div style={{ display: 'flex', marginBottom: 4, paddingLeft: 32 }}>
        {Array.from({ length: beatsPerCycle }).map((_, bi) => {
          const isSam = bi === 0;
          const isSec = sectionBounds.has(bi);
          return (
            <div key={bi} style={{
              width: cellW, minWidth: cellW, textAlign: 'center',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              fontWeight: isSam ? 700 : 500,
              color: isSam ? 'var(--accent)' : 'var(--text-dim)',
              borderLeft: isSec ? '2px solid var(--text-dim)' : 'none',
              paddingLeft: isSec ? 2 : 0,
              height: headerH, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {bi + 1}
            </div>
          );
        })}
      </div>

      {Array.from({ length: totalCycles }).map((_, cycleIdx) => (
        <div key={cycleIdx} style={{ display: 'flex', marginBottom: rowGap, alignItems: 'stretch' }}>
          <div style={{
            width: 28, minWidth: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            color: 'var(--text-dim)', fontWeight: 500,
          }}>
            {cycleIdx + 1}
          </div>
          {Array.from({ length: beatsPerCycle }).map((_, bi) => {
            const globalBeat = cycleIdx * beatsPerCycle + bi;
            const notes = beatMap[globalBeat];
            const isSam = bi === 0;
            const isSec = sectionBounds.has(bi);
            const hasNote = notes && notes.length > 0;
            const isSelected = hasNote && notes.some(n => n.idx === selectedNoteIdx);

            return (
              <div
                key={bi}
                onClick={() => {
                  if (hasNote) setSelectedNoteIdx(isSelected ? -1 : notes[0].idx);
                }}
                style={{
                  width: cellW, minWidth: cellW, height: cellH,
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-dim)'}`,
                  borderLeft: isSec ? '2px solid var(--text-dim)' : `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-dim)'}`,
                  background: isSam
                    ? (hasNote ? 'var(--accent-glow)' : 'rgba(var(--accent-rgb, 180, 80, 60), 0.04)')
                    : (isSelected ? 'var(--accent-glow)' : (hasNote ? 'var(--bg-surface)' : 'var(--bg)')),
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: hasNote ? 'pointer' : 'default',
                  borderRadius: 4, transition: 'all 0.1s',
                  gap: 2,
                }}
              >
                {hasNote ? (
                  notes.length === 1 ? (
                    <>
                      {notes[0].octaveOffset > 0 && <span style={{ fontSize: 8, color: 'var(--accent)', lineHeight: 1 }}>&middot;</span>}
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: notes[0].confidence < 0.75 ? 12 : 14,
                        fontWeight: 600,
                        color: notes[0].confidence < 0.75 ? 'var(--text-dim)' : 'var(--text)',
                        fontStyle: notes[0].confidence < 0.6 ? 'italic' : 'normal',
                      }}>
                        {notes[0].swara}
                      </span>
                      {notes[0].octaveOffset < 0 && <span style={{ fontSize: 8, color: 'var(--accent-dim)', lineHeight: 1 }}>&middot;</span>}
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {notes.map((n, ni) => (
                        <span key={ni} style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 11, fontWeight: 600, color: 'var(--text)',
                        }}>
                          {n.swara}
                        </span>
                      ))}
                    </div>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function renderSargamRow(ri, rows, containerW, maxDur, activeIdx, selectedNoteIdx, setSelectedNoteIdx, getRowTop) {
  const rTop = getRowTop(ri);
  const rowNotes = rows[ri] || [];

  return (
    <g key={`row${ri}`}>
      <rect x={0} y={rTop} width={containerW} height={SARGAM_H} fill="var(--bg)" />

      {rowNotes.map(({ s, xL, w, idx }) => {
        const xC = xL + w / 2;
        const midY = rTop + SARGAM_H / 2;
        const isActive = idx === activeIdx;
        const isSelected = idx === selectedNoteIdx;
        const conf = s.confidence || 0;
        const confTier = conf >= 0.88 ? 'high' : conf >= 0.75 ? 'med' : 'low';
        const lowC = confTier === 'low';
        const isLong = s.duration > maxDur * 0.4;
        const color = isActive ? 'var(--accent)' : lowC ? 'var(--text-dim)' : 'var(--text)';
        const fontSize = w < 36 ? 10 : w < 50 ? 12 : 15;
        const altBg = idx % 2 === 0;
        const opacity = confTier === 'low' ? 0.6 : confTier === 'med' ? 0.85 : 1;

        return (
          <g key={`n${idx}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setSelectedNoteIdx?.(isSelected ? -1 : idx)}
          >
            {altBg && (
              <rect x={xL} y={rTop} width={w} height={SARGAM_H}
                fill="var(--bg-surface)" opacity={0.3} />
            )}
            {isActive && (
              <rect x={xL + 1} y={rTop + 4} width={w - 2} height={SARGAM_H - 8}
                rx={6} fill="var(--accent-glow)" />
            )}
            {isSelected && (
              <rect x={xL} y={rTop + 2} width={w} height={SARGAM_H - 4}
                rx={6} fill="none" stroke="var(--accent)" strokeWidth={1.5}
                strokeDasharray={confTier === 'low' ? '3 2' : confTier === 'med' ? '5 3' : 'none'} />
            )}
            {confTier !== 'high' && !isActive && !isSelected && (
              <rect x={xL + 1} y={rTop + 3} width={w - 2} height={SARGAM_H - 6}
                rx={4} fill="none" stroke="var(--border)"
                strokeWidth={0.8} opacity={0.4}
                strokeDasharray={confTier === 'low' ? '2 2' : '4 3'} />
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
              fontSize={fontSize} fontWeight={isActive || isSelected ? 600 : 400}
              fontFamily="JetBrains Mono, monospace" fill={color}
              fontStyle={lowC ? 'italic' : 'normal'}
              opacity={opacity}
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
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
