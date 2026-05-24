import { useState } from 'react';
import useStore from '../store';
import { RAGAS, TALAS } from '../data/constants';

export default function ConfigStrip() {
  const shruti = useStore((s) => s.shruti);
  const shrutiAutoDetected = useStore((s) => s.shrutiAutoDetected);
  const raga = useStore((s) => s.raga);
  const setRaga = useStore((s) => s.setRaga);
  const tala = useStore((s) => s.tala);
  const setTala = useStore((s) => s.setTala);
  const customTalaGroups = useStore((s) => s.customTalaGroups);
  const setCustomTalaGroups = useStore((s) => s.setCustomTalaGroups);
  const showCalibrate = useStore((s) => s.showCalibrate);
  const toggleCalibrate = useStore((s) => s.toggleCalibrate);
  const swaras = useStore((s) => s.swaras);
  const clearResults = useStore((s) => s.clearResults);

  const [customInput, setCustomInput] = useState(customTalaGroups.join('+'));

  const handleCustomInput = (val) => {
    setCustomInput(val);
    const parts = val.split('+').map(s => parseInt(s.trim(), 10)).filter(n => n > 0 && !isNaN(n));
    if (parts.length > 0) setCustomTalaGroups(parts);
  };

  return (
    <div className="config-strip">
      <span className="config-label">Shruti</span>
      <button
        className={`config-chip${showCalibrate ? ' active' : ''}`}
        onClick={toggleCalibrate}
      >
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="6" cy="6" r="5" /><path d="M6 3.5v2.5l2 1" />
        </svg>
        {shruti}{'\u2083'}
        {shrutiAutoDetected && (
          <span style={{ fontSize: 8, opacity: 0.6, marginLeft: 2, color: 'var(--green)' }}>AUTO</span>
        )}
        <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 2 }}>{'\u25BE'}</span>
      </button>

      <div className="config-divider" />

      <span className="config-label">Raga</span>
      <div className="config-select-wrap">
        <select
          className="config-select"
          value={raga}
          onChange={(e) => setRaga(e.target.value)}
        >
          {RAGAS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <span className="config-select-arrow">{'\u25BE'}</span>
      </div>

      <div className="config-divider" />

      <span className="config-label">Tala</span>
      <div className="config-select-wrap">
        <select
          className="config-select"
          value={tala}
          onChange={(e) => setTala(e.target.value)}
        >
          {TALAS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <span className="config-select-arrow">{'\u25BE'}</span>
      </div>
      {tala === 'Custom' && (
        <input
          className="config-custom-tala-input"
          placeholder="3+4+2"
          value={customInput}
          onChange={(e) => handleCustomInput(e.target.value)}
          style={{ width: 72, marginLeft: 4, fontSize: 12, padding: '2px 6px' }}
        />
      )}

      {swaras.length > 0 && (
        <button className="config-chip" style={{ color: 'var(--text-dim)' }} onClick={clearResults}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 6A4 4 0 0 1 9.5 3.5M2.5 3.5H5.5v3" />
            <path d="M10 6A4 4 0 0 1 2.5 8.5M9.5 8.5H6.5v-3" />
          </svg>
          Clear
        </button>
      )}
    </div>
  );
}
