import useStore from '../store';
import { RAGA_SWARAS } from '../data/constants';

export default function SwaraPalette() {
  const raga = useStore((s) => s.raga);
  const selectedCell = useStore((s) => s.selectedCell);
  const composerSpeed = useStore((s) => s.composerSpeed);
  const avartanams = useStore((s) => s.avartanams);
  const setCellSwara = useStore((s) => s.setCellSwara);
  const setCellOctave = useStore((s) => s.setCellOctave);
  const setCellSpeed = useStore((s) => s.setCellSpeed);
  const clearCell = useStore((s) => s.clearCell);
  const setSelectedCell = useStore((s) => s.setSelectedCell);
  const setComposerSpeed = useStore((s) => s.setComposerSpeed);

  const swaras = RAGA_SWARAS[raga] || RAGA_SWARAS.Custom;
  const { row, col, sub } = selectedCell;
  const beats = avartanams[0]?.length || 8;

  const insertSwara = (swara) => {
    if (composerSpeed > 1) setCellSpeed(row, col, composerSpeed);
    setCellSwara(row, col, sub, swara, 0);
    const maxSub = composerSpeed - 1;
    if (sub < maxSub) {
      setSelectedCell({ row, col, sub: sub + 1 });
    } else {
      let nc = col + 1;
      let nr = row;
      if (nc >= beats) { nc = 0; nr = Math.min(nr + 1, avartanams.length - 1); }
      setSelectedCell({ row: nr, col: nc, sub: 0 });
    }
  };

  const currentOctave = avartanams[row]?.[col]?.[sub]?.octave || 0;

  return (
    <div className="swara-palette">
      <div className="palette-swaras">
        {swaras.map((s) => (
          <button key={s} className="palette-btn swara" onClick={() => insertSwara(s)}>
            {s}
          </button>
        ))}
        <button className="palette-btn rest" onClick={() => insertSwara(',')}>
          ,
        </button>
      </div>

      <div className="palette-controls">
        <span className="palette-label">Oct</span>
        <button
          className={`palette-btn small${currentOctave === 1 ? ' active' : ''}`}
          onClick={() => setCellOctave(row, col, sub, currentOctave === 1 ? 0 : 1)}
          title="Upper octave"
        >
          {'\u2191'}
        </button>
        <button
          className={`palette-btn small${currentOctave === -1 ? ' active' : ''}`}
          onClick={() => setCellOctave(row, col, sub, currentOctave === -1 ? 0 : -1)}
          title="Lower octave"
        >
          {'\u2193'}
        </button>

        <span className="palette-label" style={{ marginLeft: 8 }}>Speed</span>
        {[1, 2, 4].map((s) => (
          <button
            key={s}
            className={`palette-btn small${composerSpeed === s ? ' active' : ''}`}
            onClick={() => {
              setComposerSpeed(s);
              setCellSpeed(row, col, s);
            }}
          >
            {s === 1 ? '1x' : s === 2 ? '2x' : '4x'}
          </button>
        ))}

        <button
          className="palette-btn small"
          onClick={() => clearCell(row, col)}
          title="Clear cell"
          style={{ marginLeft: 8 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
