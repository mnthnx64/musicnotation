import useStore from '../store';

export default function TweaksPanel() {
  const tweaksOpen = useStore((s) => s.tweaksOpen);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const clearResults = useStore((s) => s.clearResults);
  const toggleCalibrate = useStore((s) => s.toggleCalibrate);
  const bpm = useStore((s) => s.bpm);
  const setBpm = useStore((s) => s.setBpm);
  const tala = useStore((s) => s.tala);
  const minStableFrames = useStore((s) => s.minStableFrames);
  const setMinStableFrames = useStore((s) => s.setMinStableFrames);
  const confidenceThreshold = useStore((s) => s.confidenceThreshold);
  const setConfidenceThreshold = useStore((s) => s.setConfidenceThreshold);
  const minNoteMs = useStore((s) => s.minNoteMs);
  const setMinNoteMs = useStore((s) => s.setMinNoteMs);
  const silenceMs = useStore((s) => s.silenceMs);
  const setSilenceMs = useStore((s) => s.setSilenceMs);

  if (!tweaksOpen) return null;

  return (
    <div className="tweaks-overlay">
      <div className="tweaks-panel">
        <div className="tweaks-title">Tweaks</div>

        <div className="tweak-group">
          <div className="tweak-group-label">Notation Display</div>
          <div className="tweak-options">
            {[['dual', 'Dual Pane'], ['carnatic', 'Carnatic'], ['western', 'Western']].map(([v, l]) => (
              <button
                key={v}
                className={`tweak-opt${mode === v ? ' active' : ''}`}
                onClick={() => setMode(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="tweak-group">
          <div className="tweak-group-label">Visual Theme</div>
          <div className="tweak-options">
            {[['cosmic', 'Cosmic Dark'], ['manuscript', 'Manuscript'], ['minimal', 'Minimal Night']].map(([v, l]) => (
              <button
                key={v}
                className={`tweak-opt${theme === v ? ' active' : ''}`}
                onClick={() => setTheme(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {tala !== 'Alapana (Free)' && (
          <div className="tweak-group">
            <div className="tweak-group-label">Tempo</div>
            <div className="tweak-slider-row">
              <label>BPM</label>
              <input type="range" min={30} max={240} step={1} value={bpm}
                onChange={(e) => setBpm(+e.target.value)} />
              <span>{bpm}</span>
            </div>
          </div>
        )}

        <div className="tweak-group">
          <div className="tweak-group-label">Detection (File)</div>
          <div className="tweak-slider-row">
            <label>Min Stability</label>
            <input type="range" min={1} max={10} step={1} value={minStableFrames}
              onChange={(e) => setMinStableFrames(+e.target.value)} />
            <span>{minStableFrames}f</span>
          </div>
          <div className="tweak-slider-row">
            <label>Confidence</label>
            <input type="range" min={0.1} max={0.8} step={0.05} value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(+e.target.value)} />
            <span>{Math.round(confidenceThreshold * 100)}%</span>
          </div>
        </div>

        <div className="tweak-group">
          <div className="tweak-group-label">Detection (Live)</div>
          <div className="tweak-slider-row">
            <label>Min Note</label>
            <input type="range" min={30} max={300} step={10} value={minNoteMs}
              onChange={(e) => setMinNoteMs(+e.target.value)} />
            <span>{minNoteMs}ms</span>
          </div>
          <div className="tweak-slider-row">
            <label>Silence Gap</label>
            <input type="range" min={50} max={500} step={10} value={silenceMs}
              onChange={(e) => setSilenceMs(+e.target.value)} />
            <span>{silenceMs}ms</span>
          </div>
        </div>

        <div className="tweak-group" style={{ marginBottom: 0 }}>
          <div className="tweak-group-label">Quick Actions</div>
          <div className="tweak-options">
            <button className="tweak-opt" onClick={clearResults}>Clear All</button>
            <button className="tweak-opt" onClick={toggleCalibrate}>Shruti Setup</button>
          </div>
        </div>
      </div>
    </div>
  );
}
