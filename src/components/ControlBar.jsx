import { useState, useRef, useEffect } from 'react';
import useStore from '../store';
import { formatSwara } from '../data/constants';

export default function ControlBar({ onUploadClick, onPlayPause, onExport }) {
  const inputMode = useStore((s) => s.inputMode);
  const isRecording = useStore((s) => s.isRecording);
  const isPaused = useStore((s) => s.isPaused);
  const isPlaying = useStore((s) => s.isPlaying);
  const swaras = useStore((s) => s.swaras);
  const audioDuration = useStore((s) => s.audioDuration);
  const playbackTime = useStore((s) => s.playbackTime);
  const startRecording = useStore((s) => s.startRecording);
  const stopRecording = useStore((s) => s.stopRecording);
  const togglePause = useStore((s) => s.togglePause);
  const liveSwara = useStore((s) => s.liveSwara);
  const confidence = useStore((s) => s.confidence);
  const swaraNotation = useStore((s) => s.swaraNotation);

  const [exportOpen, setExportOpen] = useState(false);
  const [showMoreFormats, setShowMoreFormats] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    if (!exportOpen) return;
    const close = (e) => { if (!exportRef.current?.contains(e.target)) { setExportOpen(false); setShowMoreFormats(false); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [exportOpen]);

  const handleRecord = () => {
    if (!isRecording) startRecording();
    else stopRecording();
  };

  const handleExportFormat = (fmt) => {
    setExportOpen(false);
    setShowMoreFormats(false);
    onExport?.(fmt);
  };

  const active = isRecording && !isPaused;
  const confColor = confidence >= 0.75 ? 'var(--green)' : confidence >= 0.5 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div className="control-bar">
      <div className="control-left">
        <div className={`timer${active ? ' recording' : ''}`}>
          {active && <span className="timer-dot" />}
          {formatTime(inputMode === 'live' ? 0 : playbackTime)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          {swaras.length > 0 ? `${swaras.length} swaras` : 'Ready'}
          {audioDuration > 0 && ` \u00b7 ${formatTime(audioDuration)}`}
        </div>
      </div>

      <div className="control-center">
        {inputMode === 'file' && (
          <>
            <button className="upload-btn" onClick={onUploadClick}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 10V2M4 5l3-3 3 3" />
                <path d="M1 9v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9" />
              </svg>
              Upload
            </button>
            {swaras.length > 0 && (
              <button className="play-btn" onClick={onPlayPause} title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? (
                  <svg viewBox="0 0 18 18" fill="currentColor">
                    <rect x="4" y="3" width="3.5" height="12" rx="1" />
                    <rect x="10.5" y="3" width="3.5" height="12" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 18 18" fill="currentColor">
                    <path d="M4 2.5l11 6.5-11 6.5z" />
                  </svg>
                )}
              </button>
            )}
          </>
        )}

        {inputMode === 'live' && (
          <>
            {isRecording && (
              <button className="pause-btn" onClick={togglePause} title={isPaused ? 'Resume' : 'Pause'}>
                {isPaused ? (
                  <svg viewBox="0 0 14 14" fill="currentColor"><path d="M3 2l8 5-8 5z" /></svg>
                ) : (
                  <svg viewBox="0 0 14 14" fill="currentColor">
                    <rect x="3" y="2" width="3" height="10" />
                    <rect x="8" y="2" width="3" height="10" />
                  </svg>
                )}
              </button>
            )}
            <button
              className={`record-btn${isRecording ? ' recording' : ''}`}
              onClick={handleRecord}
              title={isRecording ? 'Stop' : 'Record'}
            >
              {isRecording ? (
                <svg viewBox="0 0 24 24" fill="var(--red)" width="18" height="18">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
                  <circle cx="12" cy="12" r="8" />
                </svg>
              )}
            </button>
          </>
        )}
      </div>

      <div className="control-right">
        {active && (
          <div className="live-note-badge">
            <span className="live-note-swara" style={{ color: liveSwara ? confColor : 'var(--text-dim)' }}>
              {liveSwara ? formatSwara(liveSwara, swaraNotation) : '\u2014'}
            </span>
            {liveSwara && (
              <span className="live-note-conf" style={{ color: confColor }}>
                {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
        )}
        {swaras.length > 0 && !active && (
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button className="export-btn" onClick={() => setExportOpen(!exportOpen)}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2" />
              </svg>
              Export
            </button>
            {exportOpen && (
              <div className="export-menu">
                <div className="export-menu-section">
                  <div className="export-menu-label">Recommended</div>
                  <button onClick={() => handleExportFormat('txt')}>Save as Text</button>
                  <button onClick={() => handleExportFormat('pdf')}>Save as PDF</button>
                </div>
                {!showMoreFormats ? (
                  <div className="export-menu-section">
                    <button onClick={() => setShowMoreFormats(true)} style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                      More formats...
                    </button>
                  </div>
                ) : (
                  <div className="export-menu-section">
                    <div className="export-menu-label">Other formats</div>
                    <button onClick={() => handleExportFormat('png')}>Image (.png)</button>
                    <button onClick={() => handleExportFormat('midi')}>MIDI (.mid)</button>
                    <button onClick={() => handleExportFormat('musicxml')}>MusicXML (.musicxml)</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
