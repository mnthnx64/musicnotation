import { useEffect, useCallback, useRef, useState } from 'react';
import useStore from '../store';
import { TALA_STRUCTURE, getTalaBeats, RAGA_SWARAS, resolveShortcut } from '../data/constants';

export default function ComposerGrid() {
  const tala = useStore((s) => s.tala);
  const raga = useStore((s) => s.raga);
  const avartanams = useStore((s) => s.avartanams);
  const selectedCell = useStore((s) => s.selectedCell);
  const composerSpeed = useStore((s) => s.composerSpeed);
  const composerPlaying = useStore((s) => s.composerPlaying);
  const composerPlayPos = useStore((s) => s.composerPlayPos);
  const customTalaGroups = useStore((s) => s.customTalaGroups);
  const setSelectedCell = useStore((s) => s.setSelectedCell);
  const setCellSwara = useStore((s) => s.setCellSwara);
  const setCellOctave = useStore((s) => s.setCellOctave);
  const setCellSpeed = useStore((s) => s.setCellSpeed);
  const clearCell = useStore((s) => s.clearCell);
  const addAvartanam = useStore((s) => s.addAvartanam);
  const removeAvartanam = useStore((s) => s.removeAvartanam);
  const initComposerGrid = useStore((s) => s.initComposerGrid);
  const containerRef = useRef(null);
  const [warning, setWarning] = useState(null);
  const warningTimer = useRef(null);

  const showWarning = useCallback((msg) => {
    setWarning(msg);
    clearTimeout(warningTimer.current);
    warningTimer.current = setTimeout(() => setWarning(null), 3000);
  }, []);

  const activeTala = tala === 'Alapana (Unmetered)' ? 'Adi (8)' : tala;
  const beats = activeTala === 'Custom'
    ? customTalaGroups.reduce((a, b) => a + b, 0)
    : getTalaBeats(activeTala);
  const structure = activeTala === 'Custom'
    ? customTalaGroups
    : (TALA_STRUCTURE[activeTala] || [beats]);
  const sectionBounds = structure.reduce((acc, s, i) => {
    if (i < structure.length - 1) acc.push((acc[acc.length - 1] || 0) + s);
    return acc;
  }, []);

  useEffect(() => {
    if (!avartanams[0] || avartanams[0].length !== beats) {
      initComposerGrid(beats);
    }
  }, [beats]);

  const moveSelection = useCallback((dRow, dCol) => {
    const { row, col, sub } = selectedCell;
    let nr = row + dRow;
    let nc = col + dCol;
    if (nc >= beats) { nc = 0; nr++; }
    if (nc < 0) { nc = beats - 1; nr--; }
    nr = Math.max(0, Math.min(avartanams.length - 1, nr));
    setSelectedCell({ row: nr, col: nc, sub: 0 });
  }, [selectedCell, beats, avartanams.length, setSelectedCell]);

  const handleKeyDown = useCallback((e) => {
    const { row, col, sub } = selectedCell;
    const key = e.key.toLowerCase();

    if (key === 'arrowright') { e.preventDefault(); moveSelection(0, 1); }
    else if (key === 'arrowleft') { e.preventDefault(); moveSelection(0, -1); }
    else if (key === 'arrowdown') { e.preventDefault(); moveSelection(1, 0); }
    else if (key === 'arrowup') { e.preventDefault(); moveSelection(-1, 0); }
    else if (key === 'tab') {
      e.preventDefault();
      moveSelection(0, e.shiftKey ? -1 : 1);
    }
    else if (key === 'enter') {
      e.preventDefault();
      moveSelection(0, 1);
    }
    else if (key === 'backspace' || key === 'delete') {
      e.preventDefault();
      clearCell(row, col);
    }
    else if (key === ',' || key === ' ') {
      e.preventDefault();
      setCellSwara(row, col, sub, ',', 0);
      moveSelection(0, 1);
    }
    else if (key === '.') {
      e.preventDefault();
      const cell = avartanams[row]?.[col]?.[sub];
      if (cell) {
        const nextOct = cell.octave === 1 ? -1 : cell.octave === -1 ? 0 : 1;
        setCellOctave(row, col, sub, nextOct);
      }
    }
    else if (key >= '1' && key <= '3') {
      e.preventDefault();
      const speeds = [1, 2, 4];
      const spd = speeds[parseInt(key) - 1];
      setCellSpeed(row, col, spd);
      useStore.setState({ composerSpeed: spd });
    }
    else if ('srgmpdnSRGMPDN'.includes(key)) {
      e.preventDefault();
      const swara = resolveShortcut(key.toLowerCase(), raga);
      if (swara) {
        if (raga !== 'Custom' && !ragaSwaras.includes(swara) && swara !== 'Sa' && swara !== 'Pa') {
          showWarning(`${swara} is not in ${raga} \u2014 anya swara?`);
        }
        const speed = composerSpeed;
        if (speed > 1) setCellSpeed(row, col, speed);
        setCellSwara(row, col, sub, swara, 0);
        const cell = avartanams[row]?.[col];
        const maxSub = speed - 1;
        if (sub < maxSub) {
          setSelectedCell({ row, col, sub: sub + 1 });
        } else {
          moveSelection(0, 1);
        }
      }
    }
  }, [selectedCell, raga, composerSpeed, avartanams, moveSelection,
      setCellSwara, setCellOctave, setCellSpeed, clearCell, setSelectedCell]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.focus();
  }, []);

  const ragaSwaras = RAGA_SWARAS[raga] || RAGA_SWARAS.Custom;
  const composerTitle = useStore((s) => s.composerTitle);
  const setComposerTitle = useStore((s) => s.setComposerTitle);

  return (
    <div
      ref={containerRef}
      className="composer-grid-wrap"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <input
        className="composer-title-input"
        placeholder="Composition title..."
        value={composerTitle}
        onChange={(e) => setComposerTitle(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
      />
      <table className="composer-table">
        <thead>
          <tr>
            <th className="composer-row-label">#</th>
            {Array.from({ length: beats }).map((_, bi) => {
              const isSam = bi === 0;
              const isSectionStart = sectionBounds.includes(bi);
              return (
                <th
                  key={bi}
                  className={`composer-beat-header${isSam ? ' sam' : ''}${isSectionStart ? ' section-start' : ''}`}
                >
                  {isSectionStart && <div className="composer-section-sep" />}
                  {bi + 1}
                </th>
              );
            })}
            <th className="composer-row-actions" />
          </tr>
        </thead>
        <tbody>
          {avartanams.map((row, ri) => (
            <tr key={ri} className="composer-row">
              <td className="composer-row-label">{ri + 1}</td>
              {row.map((cell, ci) => {
                const isSelected = selectedCell.row === ri && selectedCell.col === ci;
                const isPlaying = composerPlaying && composerPlayPos.row === ri && composerPlayPos.col === ci;
                const isSectionStart = sectionBounds.includes(ci);
                const speed = cell.length;

                return (
                  <td
                    key={ci}
                    className={
                      `composer-cell` +
                      `${isSelected ? ' selected' : ''}` +
                      `${isPlaying ? ' playing' : ''}` +
                      `${isSectionStart ? ' section-start' : ''}` +
                      `${speed > 1 ? ' speed-' + speed : ''}`
                    }
                    onClick={() => setSelectedCell({ row: ri, col: ci, sub: 0 })}
                  >
                    <div className="composer-cell-inner">
                      {cell.map((sub, si) => {
                        const subSelected = isSelected && selectedCell.sub === si;
                        const isEmpty = !sub.swara || sub.swara === '';
                        const isRest = sub.swara === ',';
                        const isValid = isEmpty || isRest || sub.swara === 'Sa' || sub.swara === 'Pa' || ragaSwaras.includes(sub.swara);
                        return (
                          <span
                            key={si}
                            className={
                              `composer-sub` +
                              `${subSelected ? ' sub-selected' : ''}` +
                              `${!isValid ? ' invalid' : ''}`
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCell({ row: ri, col: ci, sub: si });
                            }}
                          >
                            {sub.octave === 1 && <span className="octave-dot upper">{'\u00B7'}</span>}
                            <span className="swara-text">
                              {isEmpty ? '\u00A0' : isRest ? ',' : sub.swara}
                            </span>
                            {sub.octave === -1 && <span className="octave-dot lower">{'\u00B7'}</span>}
                          </span>
                        );
                      })}
                    </div>
                    {speed >= 2 && <div className="speed-line single" />}
                    {speed >= 4 && <div className="speed-line double" />}
                  </td>
                );
              })}
              <td className="composer-row-actions">
                {avartanams.length > 1 && (
                  <button className="composer-remove-btn" onClick={() => removeAvartanam(ri)} title="Remove">
                    &times;
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="composer-add-btn" onClick={addAvartanam}>
        + Add Avartanam
      </button>
      {warning && (
        <div className="composer-warning">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6" cy="6" r="5" /><line x1="6" y1="3.5" x2="6" y2="6.5" /><circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
          </svg>
          {warning}
        </div>
      )}
    </div>
  );
}
