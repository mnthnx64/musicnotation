import { useState, useRef, useCallback } from 'react';
import useStore from '../store';

export default function DropZone({ onFile }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const dragCounter = useRef(0);
  const showToast = useStore((s) => s.showToast);

  const handleFile = useCallback((file) => {
    if (file && file.type.startsWith('audio/')) {
      onFile(file);
    } else if (file) {
      showToast('Unsupported file type. Please use an audio file (MP3, WAV, M4A, OGG, FLAC).', 'error');
    }
  }, [onFile, showToast]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current++;
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="dropzone-area">
      <div
        className={`dropzone-border${dragging ? ' dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="dropzone-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5">
            <path d="M12 16V4M8 8l4-4 4 4" />
            <path d="M3 14v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
          </svg>
        </div>
        <span className="dropzone-title">Tap to upload an audio file</span>
        <span className="dropzone-hint">or drag and drop here</span>
        <span className="dropzone-formats">wav, mp3, m4a, ogg, flac</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
