import useStore from '../store';

export default function MobileNav() {
  const inputMode = useStore((s) => s.inputMode);
  const setInputMode = useStore((s) => s.setInputMode);

  return (
    <nav className="mobile-nav">
      <button
        className={`mobile-nav-item${inputMode === 'file' ? ' active' : ''}`}
        onClick={() => setInputMode('file')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 16V4M8 8l4-4 4 4" />
          <path d="M3 14v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
        </svg>
        <span>Upload</span>
      </button>
      <button
        className={`mobile-nav-item${inputMode === 'live' ? ' active' : ''}`}
        onClick={() => setInputMode('live')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        <span>Live</span>
      </button>
      <button
        className={`mobile-nav-item${inputMode === 'compose' ? ' active' : ''}`}
        onClick={() => setInputMode('compose')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" />
          <path d="M18 2l4 4-10 10H8v-4L18 2z" />
        </svg>
        <span>Compose</span>
      </button>
    </nav>
  );
}
