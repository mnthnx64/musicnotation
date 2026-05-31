import { useEffect, useCallback, useRef, useState } from 'react';
import useStore from '../store';
import { TALA_STRUCTURE, getTalaBeats, getRagaSwaras, resolveShortcut, formatSwara } from '../data/constants';

export default function ComposerGrid() {
  const tala = useStore((s) => s.tala);
  const raga = useStore((s) => s.raga);
  const customScales = useStore((s) => s.customScales);
  const anyaSwaraMode = useStore((s) => s.anyaSwaraMode);
  const swaraNotation = useStore((s) => s.swaraNotation);
  const avartanams = useStore((s) => s.avartanams);
  const selectedCell = useStore((s) => s.selectedCell);
  const composerSpeed = useStore((s) => s.composerSpeed);
  const composerPlaying = useStore((s) => s.composerPlaying);
  const composerPlayPos = useStore((s) => s.composerPlayPos);
  const customTalaGroups = useStore((s) => s.customTalaGroups);
  const setSelectedCell = useStore((s) => s.setSelectedCell);
  const setCellOctave = useStore((s) => s.setCellOctave);
  const setCellSpeed = useStore((s) => s.setCellSpeed);
  const inputSwaraAtSelection = useStore((s) => s.inputSwaraAtSelection);
  const clearCell = useStore((s) => s.clearCell);
  const addAvartanam = useStore((s) => s.addAvartanam);
  const removeAvartanam = useStore((s) => s.removeAvartanam);
  const initComposerGrid = useStore((s) => s.initComposerGrid);
  const containerRef = useRef(null);
  const [warning, setWarning] = useState(null);
  const warningTimer = useRef(null);

  const ragaSwaras = getRagaSwaras(raga, customScales);

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
      inputSwaraAtSelection(',', 0);
    }
    else if (key === '.') {
      e.preventDefault();
      const cell = avartanams[row]?.[col]?.[sub];
      if (cell) {
        const nextOct = cell.octave === 1 ? -1 : cell.octave === -1 ? 0 : 1;
        setCellOctave(row, col, sub, nextOct);
      }
    }
    else if (key >= '1' && key <= '4') {
      e.preventDefault();
      const spd = parseInt(key);
      setCellSpeed(row, col, spd);
      useStore.setState({ composerSpeed: spd });
    }
    else if ('srgmpdnSRGMPDN'.includes(key)) {
      e.preventDefault();
      const lower = key.toLowerCase();
      // Resolve to the raga's variant first; in anya mode fall back to the full
      // swara set so notes the raga lacks can still be entered.
      let swara = resolveShortcut(lower, raga, customScales);
      if (!swara && (raga === 'Custom' || anyaSwaraMode)) {
        swara = resolveShortcut(lower, 'Custom');
      }
      if (swara) {
        const inRaga = raga === 'Custom' || swara === 'Sa' || swara === 'Pa' || ragaSwaras.includes(swara);
        if (!inRaga && !anyaSwaraMode) {
          showWarning(`${swara} is not in ${raga} \u2014 enable Anya swara to add it`);
          return;
        }
        if (!inRaga) {
          showWarning(`${swara} added as anya swara (outside ${raga})`);
        }
        inputSwaraAtSelection(swara, 0);
      }
    }
  }, [selectedCell, raga, composerSpeed, avartanams, anyaSwaraMode, ragaSwaras,
      moveSelection, inputSwaraAtSelection, setCellOctave, setCellSpeed,
      clearCell, setSelectedCell, showWarning]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.focus();
  }, []);

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
                              {isEmpty ? '\u00A0' : isRest ? ',' : formatSwara(sub.swara, swaraNotation)}
                            </span>
                            {sub.octave === -1 && <span className="octave-dot lower">{'\u00B7'}</span>}
                          </span>
                        );
                      })}
                    </div>
                    {speed >= 2 && <div className="speed-line single" />}
                    {speed >= 4 && <div className="speed-line double" />}
                    {speed === 3 && <div className="composer-triplet-mark">3</div>}
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
