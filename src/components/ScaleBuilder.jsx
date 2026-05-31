import { useState } from 'react';
import useStore from '../store';
import { SHRUTI_NOTES, SWARA_NAMES_BY_SEMITONE } from '../data/constants';

export default function ScaleBuilder() {
  const toggleScaleBuilder = useStore((s) => s.toggleScaleBuilder);
  const shruti = useStore((s) => s.shruti);
  const customScales = useStore((s) => s.customScales);
  const addCustomScale = useStore((s) => s.addCustomScale);
  const deleteCustomScale = useStore((s) => s.deleteCustomScale);
  const setRaga = useStore((s) => s.setRaga);

  // Sa (semitone 0) is always part of a scale.
  const [selected, setSelected] = useState(new Set([0]));
  const [name, setName] = useState('');

  const shrutiIdx = Math.max(0, SHRUTI_NOTES.indexOf(shruti));
  const westernFor = (st) => SHRUTI_NOTES[(shrutiIdx + st) % 12];

  const toggle = (st) => {
    if (st === 0) return; // Sa is locked on
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st);
      else next.add(st);
      return next;
    });
  };

  const canSave = name.trim().length > 0 && selected.size >= 2;

  const handleSave = () => {
    if (!canSave) return;
    addCustomScale({ name: name.trim(), semitones: [...selected] });
    setName('');
    setSelected(new Set([0]));
  };

  return (
    <div className="help-overlay" onClick={(e) => { if (e.target === e.currentTarget) toggleScaleBuilder(); }}>
      <div className="help-panel scale-builder-panel">
        <div className="help-header">
          <h2 className="help-title">Custom Scale / Limit to These Notes</h2>
          <button className="help-close" onClick={toggleScaleBuilder}>&times;</button>
        </div>

        <div className="help-content">
          <p className="scale-builder-hint">
            Pick the notes you want to allow. Useful for jazz modes or any scale
            not in the raga list. Sa is always included. Western note names are
            shown relative to your current Sa ({shruti}).
          </p>

          <div className="scale-note-grid">
            {Array.from({ length: 12 }).map((_, st) => {
              const isOn = selected.has(st);
              const isSa = st === 0;
              return (
                <button
                  key={st}
                  className={`scale-note-cell${isOn ? ' on' : ''}${isSa ? ' locked' : ''}`}
                  onClick={() => toggle(st)}
                  title={isSa ? 'Sa is always included' : undefined}
                >
                  <span className="scale-note-swara">{SWARA_NAMES_BY_SEMITONE[st]}</span>
                  <span className="scale-note-western">{westernFor(st)}</span>
                </button>
              );
            })}
          </div>

          <div className="scale-builder-save">
            <input
              className="scale-builder-name"
              placeholder="Scale name (e.g. Dorian, My Mode)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <button className="scale-builder-save-btn" onClick={handleSave} disabled={!canSave}>
              Save scale
            </button>
          </div>
          {!canSave && (
            <div className="scale-builder-note-count">
              {selected.size < 2 ? 'Select at least 2 notes' : 'Enter a name to save'}
            </div>
          )}

          {customScales.length > 0 && (
            <div className="help-section">
              <h3 className="help-section-title">Saved scales</h3>
              <div className="saved-scales-list">
                {customScales.map((sc) => (
                  <div key={sc.id} className="saved-scale-row">
                    <button
                      className="saved-scale-use"
                      onClick={() => { setRaga(sc.name); toggleScaleBuilder(); }}
                      title="Use this scale"
                    >
                      <span className="saved-scale-name">{sc.name}</span>
                      <span className="saved-scale-notes">{sc.swaras.join(' ')}</span>
                    </button>
                    <button
                      className="saved-scale-delete"
                      onClick={() => deleteCustomScale(sc.id)}
                      title="Delete scale"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
