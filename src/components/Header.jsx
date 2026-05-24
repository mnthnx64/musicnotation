import useStore from '../store';

export default function Header() {
  const inputMode = useStore((s) => s.inputMode);
  const setInputMode = useStore((s) => s.setInputMode);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const isRecording = useStore((s) => s.isRecording);
  const toggleTweaks = useStore((s) => s.toggleTweaks);
  const toggleHelp = useStore((s) => s.toggleHelp);

  return (
    <header className="header">
      <div className="logo">
        <div className="logo-mark">{'\u{1D11E}'}</div>
        <div className="logo-text">Ez<span>Swara</span></div>
      </div>

      <div className="mode-tabs">
        {[['dual', 'Dual'], ['carnatic', 'Carnatic'], ['western', 'Western']].map(([v, l]) => (
          <button
            key={v}
            className={`mode-tab${mode === v ? ' active' : ''}`}
            onClick={() => setMode(v)}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mode-tabs input-tabs">
        {[['file', 'Upload'], ['live', 'Live'], ['compose', 'Compose']].map(([v, l]) => (
          <button
            key={v}
            className={`mode-tab${inputMode === v ? ' active' : ''}`}
            onClick={() => setInputMode(v)}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="header-right">
        {isRecording && (
          <div style={{
            fontSize: 11, color: 'var(--red)', fontWeight: 500,
            letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--red)', animation: 'blink 1s infinite',
            }} />
            LIVE
          </div>
        )}
        <button className="icon-btn" onClick={toggleHelp} title="Help & FAQ">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="7" />
            <path d="M6 6.5a2 2 0 0 1 3.5 1.5c0 1-1.5 1.5-1.5 2.5" />
            <circle cx="8" cy="12.5" r="0.5" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <button className="icon-btn" onClick={toggleTweaks} title="Settings">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="4" r="1.5"/><line x1="8" y1="1" x2="8" y2="2.5"/><line x1="8" y1="5.5" x2="8" y2="15"/>
            <circle cx="4" cy="10" r="1.5"/><line x1="4" y1="1" x2="4" y2="8.5"/><line x1="4" y1="11.5" x2="4" y2="15"/>
            <circle cx="12" cy="7" r="1.5"/><line x1="12" y1="1" x2="12" y2="5.5"/><line x1="12" y1="8.5" x2="12" y2="15"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
