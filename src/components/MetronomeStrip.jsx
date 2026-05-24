import useStore from '../store';
import { TALA_STRUCTURE, TALA_SECTION_NAMES, getTalaBeats } from '../data/constants';

export default function MetronomeStrip() {
  const tala = useStore((s) => s.tala);
  const bpm = useStore((s) => s.bpm);
  const setBpm = useStore((s) => s.setBpm);
  const customTalaGroups = useStore((s) => s.customTalaGroups);

  if (tala === 'Alapana (Unmetered)') return null;

  const beatsPerCycle = tala === 'Custom'
    ? customTalaGroups.reduce((a, b) => a + b, 0)
    : getTalaBeats(tala);
  const structure = tala === 'Custom'
    ? customTalaGroups
    : (TALA_STRUCTURE[tala] || [beatsPerCycle]);

  const subBounds = structure.slice(0, -1).reduce((acc, s) => {
    acc.push((acc[acc.length - 1] || 0) + s);
    return acc;
  }, []);

  const sectionNames = tala === 'Custom'
    ? structure.map(String)
    : (TALA_SECTION_NAMES[tala] || structure.map(String));

  return (
    <div className="metronome-strip">
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
          const cls = `met-beat${isSam ? ' sam' : ''}${isSectionStart ? ' section-start' : ''}`;
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
