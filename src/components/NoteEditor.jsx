import useStore from '../store';
import { RAGA_SWARAS, formatSwara } from '../data/constants';

export default function NoteEditor() {
  const selectedNoteIdx = useStore((s) => s.selectedNoteIdx);
  const swaras = useStore((s) => s.swaras);
  const raga = useStore((s) => s.raga);
  const swaraNotation = useStore((s) => s.swaraNotation);
  const updateSwara = useStore((s) => s.updateSwara);
  const deleteSwara = useStore((s) => s.deleteSwara);
  const insertSwara = useStore((s) => s.insertSwara);
  const setSelectedNoteIdx = useStore((s) => s.setSelectedNoteIdx);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  if (selectedNoteIdx < 0 || selectedNoteIdx >= swaras.length) return null;

  const note = swaras[selectedNoteIdx];
  const palette = RAGA_SWARAS[raga] || RAGA_SWARAS.Custom;

  const handleSwaraChange = (swara) => {
    updateSwara(selectedNoteIdx, { swara });
  };

  const handleOctaveChange = (dir) => {
    const cur = note.octaveOffset || 0;
    updateSwara(selectedNoteIdx, { octaveOffset: cur + dir });
  };

  const handleDelete = () => {
    deleteSwara(selectedNoteIdx);
  };

  const handleInsertBefore = () => {
    insertSwara(selectedNoteIdx, {
      swara: 'Sa',
      semitone: 0,
      octaveOffset: 0,
      time: note.time,
      duration: 0.2,
      confidence: 1,
      frequency: 0,
    });
  };

  const handleInsertRest = () => {
    insertSwara(selectedNoteIdx, {
      swara: ',',
      semitone: -1,
      octaveOffset: 0,
      time: note.time,
      duration: 0.2,
      confidence: 1,
      frequency: 0,
    });
  };

  return (
    <div className="note-editor">
      <div className="ne-header">
        <span className="ne-title">Edit Note {selectedNoteIdx + 1}</span>
        <button className="ne-close" onClick={() => setSelectedNoteIdx(-1)}>&times;</button>
      </div>

      <div className="ne-section">
        <span className="ne-label">Swara</span>
        <div className="ne-swara-grid">
          {palette.map(s => (
            <button key={s}
              className={`ne-swara-btn${note.swara === s ? ' active' : ''}`}
              onClick={() => handleSwaraChange(s)}
            >{formatSwara(s, swaraNotation)}</button>
          ))}
        </div>
      </div>

      <div className="ne-section ne-row">
        <span className="ne-label">Octave</span>
        <button className="ne-btn" onClick={() => handleOctaveChange(-1)}>-</button>
        <span className="ne-octave-val">{note.octaveOffset || 0}</span>
        <button className="ne-btn" onClick={() => handleOctaveChange(1)}>+</button>
      </div>

      <div className="ne-actions">
        <button className="ne-btn" onClick={handleInsertBefore}>+ Insert</button>
        <button className="ne-btn" onClick={handleInsertRest}>+ Rest</button>
        <button className="ne-btn danger" onClick={handleDelete}>Delete</button>
        <div style={{ flex: 1 }} />
        <button className="ne-btn" onClick={undo} title="Undo (Cmd+Z)">Undo</button>
        <button className="ne-btn" onClick={redo} title="Redo (Cmd+Shift+Z)">Redo</button>
      </div>
    </div>
  );
}
