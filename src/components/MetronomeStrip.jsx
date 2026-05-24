import { useState, useCallback, useEffect } from 'react';
import useStore from '../store';
import { TALA_STRUCTURE, TALA_SECTION_NAMES, getTalaBeats } from '../data/constants';
import { startMetronome, stopMetronome } from '../audio/composerPlayback';

export default function MetronomeStrip() {
  const tala = useStore((s) => s.tala);
  const bpm = useStore((s) => s.bpm);
  const setBpm = useStore((s) => s.setBpm);
  const customTalaGroups = useStore((s) => s.customTalaGroups);
  const [playing, setPlaying] = useState(false);
  const [activeBeat, setActiveBeat] = useState(-1);

  const isUnmetered = tala === 'Alapana (Unmetered)';

  const beatsPerCycle = isUnmetered ? 8 : (
    tala === 'Custom'
      ? customTalaGroups.reduce((a, b) => a + b, 0)
      : getTalaBeats(tala)
  );
  const structure = isUnmetered ? [8] : (
    tala === 'Custom'
      ? customTalaGroups
      : (TALA_STRUCTURE[tala] || [beatsPerCycle])
  );

  const handleToggle = useCallback(() => {
    if (playing) {
      stopMetronome();
      setPlaying(false);
      setActiveBeat(-1);
    } else {
      startMetronome(bpm, beatsPerCycle, structure, (beat) => {
        setActiveBeat(beat);
      });
      setPlaying(true);
    }
  }, [playing, bpm, beatsPerCycle, structure]);

  useEffect(() => {
    if (playing) {
      stopMetronome();
      startMetronome(bpm, beatsPerCycle, structure, (beat) => {
        setActiveBeat(beat);
      });
    }
  }, [bpm]);

  useEffect(() => {
    return () => { stopMetronome(); };
  }, []);

  useEffect(() => {
    if (playing) {
      stopMetronome();
      setPlaying(false);
      setActiveBeat(-1);
    }
  }, [tala]);

  if (isUnmetered) return null;

  const subBounds = structure.slice(0, -1).reduce((acc, s) => {
    acc.push((acc[acc.length - 1] || 0) + s);
    return acc;
  }, []);

  const sectionNames = tala === 'Custom'
    ? structure.map(String)
    : (TALA_SECTION_NAMES[tala] || structure.map(String));

  return (
    <div className="metronome-strip">
      <button
        className={`met-play-btn${playing ? ' active' : ''}`}
        onClick={handleToggle}
        title={playing ? 'Stop metronome' : 'Start metronome'}
      >
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="2" width="3" height="8" rx="0.5" />
            <rect x="7" y="2" width="3" height="8" rx="0.5" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <polygon points="2,1 11,6 2,11" />
          </svg>
        )}
      </button>

      <div className="met-bpm-control">
        <button className="met-bpm-btn" onClick={() => setBpm(Math.max(30, bpm - 1))}>
          <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
        <div className="met-bpm-value">
          <span className="met-bpm-num">{bpm}</span>
          <span className="met-bpm-label">BPM</span>
        </div>
        <button className="met-bpm-btn" onClick={() => setBpm(Math.min(240, bpm + 1))}>
          <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5" /><line x1="5" y1="2" x2="5" y2="8" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
      </div>

      <div className="met-divider" />

      <div className="met-beats">
        {Array.from({ length: beatsPerCycle }).map((_, i) => {
          const isSam = i === 0;
          const isSectionStart = subBounds.includes(i);
          const isActive = activeBeat === i;
          const cls = `met-beat${isSam ? ' sam' : ''}${isSectionStart ? ' section-start' : ''}${isActive ? ' active' : ''}`;
          return (
            <div key={i} className={cls}>
              {isSectionStart && <div className="met-section-sep" />}
              <div className="met-dot" />
              <span className="met-num">{i + 1}</span>
            </div>
          );
        })}
      </div>

      <div className="met-tala-label">
        {sectionNames.map((name, i) => (
          <span key={i} className="met-section-tag">{name}</span>
        ))}
      </div>
    </div>
  );
}
