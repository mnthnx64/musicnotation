import { useRef, useCallback, useEffect } from 'react';
import useStore from '../store';
import { SHRUTI_NOTES, NOTE_FREQUENCIES } from '../data/constants';
import { yinPitchDetection, calculateRMS, createPitchSmoother, PITCH_CONFIG } from '../audio/pitchDetection';
import { hzToNoteName } from '../audio/swaraMapping';

const LISTEN_DURATION_MS = 3000;

export default function ShrutiCalibration() {
  const shruti = useStore((s) => s.shruti);
  const setShruti = useStore((s) => s.setShruti);
  const detectedTonic = useStore((s) => s.detectedTonic);
  const setShrutiAutoDetected = useStore((s) => s.setShrutiAutoDetected);
  const shrutiAutoDetected = useStore((s) => s.shrutiAutoDetected);
  const isListeningForSa = useStore((s) => s.isListeningForSa);
  const listeningProgress = useStore((s) => s.listeningProgress);
  const listeningLiveHz = useStore((s) => s.listeningLiveHz);
  const listeningLiveNote = useStore((s) => s.listeningLiveNote);
  const setListeningState = useStore((s) => s.setListeningState);

  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const cancelledRef = useRef(false);

  const stopListening = useCallback(() => {
    cancelledRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setListeningState({
      isListeningForSa: false,
      listeningProgress: 0,
      listeningLiveHz: null,
      listeningLiveNote: null,
    });
  }, [setListeningState]);

  useEffect(() => () => stopListening(), [stopListening]);

  const handleSingSa = useCallback(async () => {
    if (isListeningForSa) {
      stopListening();
      return;
    }

    cancelledRef.current = false;
    setListeningState({ isListeningForSa: true, listeningProgress: 0, listeningLiveHz: null, listeningLiveNote: null });

    let audioCtx;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelledRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;

      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      const sampleRate = audioCtx.sampleRate;
      const buffer = new Float32Array(analyser.fftSize);
      const smoother = createPitchSmoother(7);
      const pitchSamples = [];
      const startTime = Date.now();

      const detect = () => {
        if (cancelledRef.current) return;

        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / LISTEN_DURATION_MS, 1);

        analyser.getFloatTimeDomainData(buffer);
        const rms = calculateRMS(buffer);

        let hz = 0;
        let note = null;
        if (rms > PITCH_CONFIG.energyThreshold) {
          const result = yinPitchDetection(buffer, sampleRate);
          const smoothed = smoother(result.frequency, result.confidence);
          if (smoothed.pitch > 0 && smoothed.confidence >= PITCH_CONFIG.minConfidence) {
            hz = smoothed.pitch;
            const info = hzToNoteName(hz);
            note = info.note;
            pitchSamples.push(hz);
          }
        }

        setListeningState({
          listeningProgress: progress,
          listeningLiveHz: hz > 0 ? Math.round(hz * 10) / 10 : null,
          listeningLiveNote: note,
        });

        if (elapsed < LISTEN_DURATION_MS) {
          rafRef.current = requestAnimationFrame(detect);
        } else {
          // Resolve dominant pitch
          stream.getTracks().forEach(t => t.stop());
          streamRef.current = null;
          audioCtx.close();

          if (pitchSamples.length >= 5) {
            const resolved = resolveDominantNote(pitchSamples);
            setShruti(resolved.note);
            setShrutiAutoDetected(true);
            setListeningState({
              isListeningForSa: false,
              listeningProgress: 1,
              listeningLiveHz: resolved.hz,
              listeningLiveNote: resolved.note,
            });
          } else {
            setListeningState({
              isListeningForSa: false,
              listeningProgress: 0,
              listeningLiveHz: null,
              listeningLiveNote: null,
            });
          }
        }
      };

      rafRef.current = requestAnimationFrame(detect);
    } catch (err) {
      console.error('Mic access failed for shruti detection:', err);
      if (audioCtx) audioCtx.close();
      stopListening();
    }
  }, [isListeningForSa, stopListening, setShruti, setShrutiAutoDetected, setListeningState]);

  const handleManualSelect = (note) => {
    setShruti(note);
    setShrutiAutoDetected(false);
  };

  const handleAcceptDetected = () => {
    if (detectedTonic) {
      setShruti(detectedTonic.note);
      setShrutiAutoDetected(true);
    }
  };

  return (
    <div className="shruti-calibration">
      <span className="cal-label">Sa =</span>
      <div className="semitone-picker">
        {SHRUTI_NOTES.map((note) => (
          <button
            key={note}
            className={`semitone-btn${shruti === note ? ' selected' : ''}`}
            onClick={() => handleManualSelect(note)}
          >
            {note}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--accent-dim)', opacity: 0.4, margin: '0 4px' }} />

      {/* Sing Sa button */}
      <button
        className={`sing-btn${isListeningForSa ? ' listening' : ''}`}
        onClick={handleSingSa}
      >
        {isListeningForSa ? (
          <>
            <div className="listening-indicator">
              <span className="listening-bar" /><span className="listening-bar" /><span className="listening-bar" />
            </div>
            {listeningLiveNote
              ? <span>{listeningLiveNote} ({listeningLiveHz} Hz)</span>
              : <span>Listening...</span>
            }
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            Sing Sa
          </>
        )}
      </button>

      {isListeningForSa && (
        <div className="listening-progress-wrap">
          <div className="listening-progress-bar" style={{ width: `${listeningProgress * 100}%` }} />
        </div>
      )}

      {/* File-detected tonic accept button */}
      {!isListeningForSa && detectedTonic && (
        <button className="sing-btn" onClick={handleAcceptDetected} style={{ background: 'var(--bg-raised)', color: 'var(--accent)', border: '1px solid var(--accent-dim)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 6l3.5 3.5L11 2" />
          </svg>
          From audio: {detectedTonic.note} ({detectedTonic.hz} Hz)
        </button>
      )}

      {shrutiAutoDetected && !isListeningForSa && (
        <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 500 }}>
          Auto-detected
        </span>
      )}

      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
        {NOTE_FREQUENCIES[shruti]} Hz
      </span>
    </div>
  );
}

function resolveDominantNote(pitchSamples) {
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const counts = new Array(12).fill(0);
  const sums = new Array(12).fill(0);

  for (const hz of pitchSamples) {
    const midi = 12 * Math.log2(hz / 440) + 69;
    const noteIdx = ((Math.round(midi) % 12) + 12) % 12;
    counts[noteIdx]++;
    sums[noteIdx] += hz;
  }

  let best = 0;
  for (let i = 1; i < 12; i++) {
    if (counts[i] > counts[best]) best = i;
  }

  return {
    note: NOTE_NAMES[best],
    hz: Math.round((sums[best] / counts[best]) * 10) / 10,
  };
}
