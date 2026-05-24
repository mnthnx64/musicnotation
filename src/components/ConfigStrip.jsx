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
  const mobileConfigExpanded = useStore((s) => s.mobileConfigExpanded);
  const toggleMobileConfig = useStore((s) => s.toggleMobileConfig);

  const [customInput, setCustomInput] = useState(customTalaGroups.join('+'));

  const handleCustomInput = (val) => {
    setCustomInput(val);
    const parts = val.split('+').map(s => parseInt(s.trim(), 10)).filter(n => n > 0 && !isNaN(n));
    if (parts.length > 0) setCustomTalaGroups(parts);
  };

  const configContent = (
    <>
      <span className="config-label">Key (Sa)<span className="config-label-sub">tonic</span></span>
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

      <span className="config-label">Scale<span className="config-label-sub">raga</span></span>
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

      <span className="config-label">Rhythm<span className="config-label-sub">tala</span></span>
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
          placeholder="e.g. 3+4+2"
          value={customInput}
          onChange={(e) => handleCustomInput(e.target.value)}
          style={{
            width: 80, marginLeft: 4, fontSize: 12, padding: '6px 8px',
            borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-surface)', color: 'var(--text)',
            fontFamily: 'JetBrains Mono, monospace', minHeight: 36,
          }}
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
    </>
  );

  return (
    <div className={`config-strip${mobileConfigExpanded ? ' expanded' : ''}`}>
      {/* Mobile: show summary that expands */}
      <div className="config-summary" onClick={toggleMobileConfig}>
        <div className="config-summary-chip">
          <span className="label">Key</span> {shruti}
        </div>
        <div className="config-summary-chip">
          <span className="label">Scale</span> {raga === 'Custom' ? 'Custom' : raga}
        </div>
        <div className="config-summary-chip">
          <span className="label">Rhythm</span> {tala === 'Alapana (Unmetered)' ? 'Free' : tala.split(' ')[0]}
        </div>
        <div className={`config-expand-icon${mobileConfigExpanded ? ' expanded' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 4.5l3 3 3-3" />
          </svg>
        </div>
      </div>

      {/* Full config (always visible on desktop, toggle on mobile) */}
      <div className="config-full" style={{ display: 'contents' }}>
        {configContent}
      </div>
    </div>
  );
}
