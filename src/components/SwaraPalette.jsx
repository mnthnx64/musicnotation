import useStore from '../store';
import { RAGA_SWARAS, getRagaSwaras } from '../data/constants';

const ALL_SWARAS = RAGA_SWARAS.Custom;

export default function SwaraPalette() {
  const raga = useStore((s) => s.raga);
  const customScales = useStore((s) => s.customScales);
  const anyaSwaraMode = useStore((s) => s.anyaSwaraMode);
  const toggleAnyaSwaraMode = useStore((s) => s.toggleAnyaSwaraMode);
  const selectedCell = useStore((s) => s.selectedCell);
  const composerSpeed = useStore((s) => s.composerSpeed);
  const avartanams = useStore((s) => s.avartanams);
  const setCellOctave = useStore((s) => s.setCellOctave);
  const setCellSpeed = useStore((s) => s.setCellSpeed);
  const inputSwaraAtSelection = useStore((s) => s.inputSwaraAtSelection);
  const clearCell = useStore((s) => s.clearCell);
  const setComposerSpeed = useStore((s) => s.setComposerSpeed);

  const ragaSwaras = getRagaSwaras(raga, customScales);
  // When a raga is active, the palette shows only its swaras; turning on Anya
  // swara reveals the full 12-swara set so out-of-raga notes can be added.
  const showAll = raga === 'Custom' || anyaSwaraMode;
  const swaras = showAll ? ALL_SWARAS : ragaSwaras;
  const { row, col, sub } = selectedCell;

  const insertSwara = (swara) => {
    inputSwaraAtSelection(swara, 0);
  };

  const currentOctave = avartanams[row]?.[col]?.[sub]?.octave || 0;

  return (
    <div className="swara-palette">
      <div className="palette-swaras">
        {swaras.map((s) => {
          const outOfRaga = raga !== 'Custom' && !ragaSwaras.includes(s);
          return (
            <button
              key={s}
              className={`palette-btn swara${outOfRaga ? ' anya' : ''}`}
              onClick={() => insertSwara(s)}
              title={outOfRaga ? `Anya swara (outside ${raga})` : undefined}
            >
              {s}
            </button>
          );
        })}
        <button className="palette-btn rest" onClick={() => insertSwara(',')}>
          ,
        </button>
        {raga !== 'Custom' && (
          <button
            className={`palette-btn small anya-toggle${anyaSwaraMode ? ' active' : ''}`}
            onClick={toggleAnyaSwaraMode}
            title="Allow swaras outside the selected raga"
          >
            Anya
          </button>
        )}
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
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            className={`palette-btn small${composerSpeed === s ? ' active' : ''}`}
            onClick={() => {
              setComposerSpeed(s);
              setCellSpeed(row, col, s);
            }}
          >
            {`${s}x`}
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
