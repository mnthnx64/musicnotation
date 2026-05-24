import { useRef, useCallback, useEffect } from 'react';
import useStore from './store';
import { processAudioFile } from './audio/fileProcessor';
import { calculateRMS, createPitchSmoother, PITCH_CONFIG } from './audio/pitchDetection';
import { freqToSwara } from './audio/swaraMapping';
import { NOTE_FREQUENCIES } from './data/constants';
import { startPitchWorklet } from './audio/pitchWorklet';
import { getEngine } from './audio/pitchEngines';
import { playComposition, stopPlayback } from './audio/composerPlayback';
import { exportAsText, downloadText, printComposition } from './audio/composerExport';
import { exportTranscriptionPDF, exportComposerPDF, downloadPDF } from './audio/pdfExport';
import { captureNotationArea } from './audio/pngExport';
import { exportAsMidi, downloadMidi } from './audio/midiExport';
import { exportAsMusicXML, downloadMusicXML } from './audio/musicxmlExport';
import Header from './components/Header';
import ConfigStrip from './components/ConfigStrip';
import ShrutiCalibration from './components/ShrutiCalibration';
import MetronomeStrip from './components/MetronomeStrip';
import DropZone from './components/DropZone';
import SwaraTimeline from './components/SwaraTimeline';
import WaveformCanvas from './components/WaveformCanvas';
import ControlBar from './components/ControlBar';
import TweaksPanel from './components/TweaksPanel';
import HelpFAQ from './components/HelpFAQ';
import ComposerGrid from './components/ComposerGrid';
import SwaraPalette from './components/SwaraPalette';
import NoteEditor from './components/NoteEditor';
import MobileNav from './components/MobileNav';

export default function App() {
  const theme = useStore((s) => s.theme);
  const inputMode = useStore((s) => s.inputMode);
  const isProcessing = useStore((s) => s.isProcessing);
  const processProgress = useStore((s) => s.processProgress);
  const processStage = useStore((s) => s.processStage);
  const detectedTonic = useStore((s) => s.detectedTonic);
  const swaras = useStore((s) => s.swaras);
  const fileName = useStore((s) => s.fileName);
  const audioSamples = useStore((s) => s.audioSamples);
  const audioSampleRate = useStore((s) => s.audioSampleRate);
  const audioDuration = useStore((s) => s.audioDuration);
  const isPlaying = useStore((s) => s.isPlaying);
  const playbackTime = useStore((s) => s.playbackTime);
  const setProcessing = useStore((s) => s.setProcessing);
  const setResults = useStore((s) => s.setResults);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const setPlaybackTime = useStore((s) => s.setPlaybackTime);
  const isRecording = useStore((s) => s.isRecording);
  const isPaused = useStore((s) => s.isPaused);
  const setConfidence = useStore((s) => s.setConfidence);
  const setLiveSwara = useStore((s) => s.setLiveSwara);
  const addSwara = useStore((s) => s.addSwara);
  const setMicPermission = useStore((s) => s.setMicPermission);
  const stopRecording = useStore((s) => s.stopRecording);
  const showCalibrate = useStore((s) => s.showCalibrate);
  const shruti = useStore((s) => s.shruti);
  const raga = useStore((s) => s.raga);
  const tala = useStore((s) => s.tala);
  const customTalaGroups = useStore((s) => s.customTalaGroups);
  const minStableFrames = useStore((s) => s.minStableFrames);
  const avartanams = useStore((s) => s.avartanams);
  const composerPlaying = useStore((s) => s.composerPlaying);
  const composerTitle = useStore((s) => s.composerTitle);
  const bpm = useStore((s) => s.bpm);
  const onboardingSeen = useStore((s) => s.onboardingSeen);
  const dismissOnboarding = useStore((s) => s.dismissOnboarding);
  const toast = useStore((s) => s.toast);
  const showToast = useStore((s) => s.showToast);

  const fileInputRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const playbackBufferRef = useRef(null);
  const playbackStartRef = useRef(null);
  const rafRef = useRef(null);
  const lastFileRef = useRef(null);

  const liveStreamRef = useRef(null);
  const liveAnalyserRef = useRef(null);
  const liveBufferRef = useRef(null);
  const liveSmoother = useRef(null);
  const liveRafRef = useRef(null);
  const workletHandleRef = useRef(null);

  const themeClass = theme === 'manuscript' ? 'theme-manuscript' : theme === 'minimal' ? 'theme-minimal' : '';

  // File processing
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    lastFileRef.current = file;
    useStore.setState({ fileName: file.name });
    setProcessing(true, 0, 'decoding');

    const currentShruti = useStore.getState().shruti;
    const currentRaga = useStore.getState().raga;
    const stableFrames = useStore.getState().minStableFrames;
    const currentEngine = useStore.getState().pitchEngine;

    try {
      const results = await processAudioFile(file, {
        shruti: currentShruti,
        raga: currentRaga,
        minStableFrames: stableFrames,
        pitchEngine: currentEngine,
        onProgress: ({ stage, progress }) => {
          setProcessing(true, progress, stage);
        },
      });

      setResults({
        tonic: results.tonic,
        swaras: results.swaras,
        pitchData: results.pitchData,
        duration: results.duration,
        sampleRate: results.sampleRate,
        samples: results.samples,
        fileName: file.name,
      });

      if (!useStore.getState().shrutiAutoDetected && results.tonic) {
        useStore.setState({
          shruti: results.tonic.note,
          shrutiAutoDetected: true,
        });
      }

      showToast(`Done! ${results.swaras.length} swaras detected`, 'success');
    } catch (err) {
      console.error('Processing failed:', err);
      setProcessing(false, 0, '');
      showToast('Processing failed. Please try a different audio file.', 'error');
    }
  }, [setProcessing, setResults, showToast]);

  const reprocessFile = useCallback(async () => {
    const file = lastFileRef.current;
    if (!file || useStore.getState().isProcessing) return;
    await handleFile(file);
  }, [handleFile]);

  // Playback
  const handlePlayPause = useCallback(() => {
    if (!audioSamples || !audioSampleRate) return;

    if (isPlaying) {
      sourceRef.current?.stop();
      sourceRef.current = null;
      cancelAnimationFrame(rafRef.current);
      setIsPlaying(false);
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;

    if (!playbackBufferRef.current || playbackBufferRef.current.sampleRate !== audioSampleRate) {
      const buf = ctx.createBuffer(1, audioSamples.length, audioSampleRate);
      buf.getChannelData(0).set(audioSamples);
      playbackBufferRef.current = buf;
    }

    const source = ctx.createBufferSource();
    source.buffer = playbackBufferRef.current;
    source.connect(ctx.destination);
    source.start();
    sourceRef.current = source;
    playbackStartRef.current = ctx.currentTime;
    setIsPlaying(true);

    source.onended = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
      cancelAnimationFrame(rafRef.current);
    };

    const updateTime = () => {
      if (!sourceRef.current) return;
      const t = audioCtxRef.current.currentTime - playbackStartRef.current;
      setPlaybackTime(t);
      rafRef.current = requestAnimationFrame(updateTime);
    };
    rafRef.current = requestAnimationFrame(updateTime);
  }, [audioSamples, audioSampleRate, isPlaying, setIsPlaying, setPlaybackTime]);

  // Export
  const handleExport = useCallback((format = 'txt') => {
    if (swaras.length === 0) return;

    const currentShruti = useStore.getState().shruti;
    const currentRaga = useStore.getState().raga;
    const currentTala = useStore.getState().tala;
    const currentBpm = useStore.getState().bpm;
    const baseName = (fileName || 'swaras').replace(/\.[^.]+$/, '');

    if (format === 'pdf') {
      const doc = exportTranscriptionPDF(swaras, {
        shruti: currentShruti, raga: currentRaga, tala: currentTala,
        bpm: currentBpm, title: fileName, detectedTonic,
      });
      downloadPDF(doc, `${baseName}.pdf`);
      return;
    }

    if (format === 'png') {
      captureNotationArea('.notation-area svg', `${baseName}.png`);
      return;
    }

    if (format === 'midi') {
      const blob = exportAsMidi(swaras, { shruti: currentShruti, bpm: currentBpm, title: fileName });
      downloadMidi(blob, `${baseName}.mid`);
      return;
    }

    if (format === 'musicxml') {
      const xml = exportAsMusicXML(swaras, {
        shruti: currentShruti, raga: currentRaga, tala: currentTala,
        bpm: currentBpm, title: fileName,
      });
      downloadMusicXML(xml, `${baseName}.musicxml`);
      return;
    }

    let text = `EzSwara \u2014 Swara Transcription\n`;
    text += `File: ${fileName || 'Unknown'}\n`;
    if (detectedTonic) {
      text += `Tonic (Sa): ${currentShruti} (${NOTE_FREQUENCIES[currentShruti]} Hz)\n`;
      text += `Auto-detected: ${detectedTonic.note} (${detectedTonic.hz} Hz)\n`;
    }
    text += `Raga: ${currentRaga}\n`;
    text += `Tala: ${currentTala}\n`;
    text += `Swaras detected: ${swaras.length}\n`;
    text += `${'\u2500'.repeat(40)}\n\n`;
    text += `Swara Sequence:\n`;
    text += swaras.map(s => s.swara).join(' ') + '\n\n';
    text += `Time\tSwara\tDuration\tConfidence\n`;
    for (const s of swaras) {
      text += `${s.time.toFixed(2)}s\t${s.swara}\t${s.duration.toFixed(3)}s\t${Math.round(s.confidence * 100)}%\n`;
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_swaras.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [swaras, fileName, detectedTonic]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Composer playback
  const handleComposerPlay = useCallback(() => {
    if (composerPlaying) {
      stopPlayback();
      useStore.setState({ composerPlaying: false, composerPlayPos: { row: 0, col: 0 } });
      return;
    }
    useStore.setState({ composerPlaying: true });
    playComposition(
      avartanams,
      bpm,
      shruti,
      (pos) => useStore.setState({ composerPlayPos: pos }),
      () => useStore.setState({ composerPlaying: false, composerPlayPos: { row: 0, col: 0 } }),
    );
  }, [composerPlaying, avartanams, bpm, shruti]);

  // Composer export
  const handleComposerExport = useCallback((format) => {
    const name = (composerTitle || 'composition').replace(/[^a-zA-Z0-9]/g, '_');
    if (format === 'print') {
      printComposition();
    } else if (format === 'pdf') {
      const doc = exportComposerPDF(avartanams, { raga, tala, shruti, title: composerTitle, bpm });
      downloadPDF(doc, `${name}.pdf`);
    } else if (format === 'png') {
      captureNotationArea('.composer-grid-wrap table', `${name}.png`);
    } else {
      const text = exportAsText(avartanams, { raga, tala, shruti, title: composerTitle, bpm, customTalaGroups });
      downloadText(text, `${name}.txt`);
    }
  }, [avartanams, raga, tala, shruti, composerTitle, bpm, customTalaGroups]);

  // Live recording
  useEffect(() => {
    const active = isRecording && !isPaused && inputMode === 'live';

    if (active) {
      let cancelled = false;
      const currentShruti = useStore.getState().shruti;
      const tonicHz = NOTE_FREQUENCIES[currentShruti] || 261.63;
      const confThreshold = useStore.getState().confidenceThreshold;
      const noteMinMs = useStore.getState().minNoteMs;
      const silGapMs = useStore.getState().silenceMs;
      const engineId = useStore.getState().pitchEngine;
      const execMode = useStore.getState().pitchExecMode;
      const engine = getEngine(engineId);
      const currentTala = useStore.getState().tala;
      const currentBpm = useStore.getState().bpm;
      const recStart = useStore.getState().recordingStartTime;
      const isMetered = currentTala !== 'Alapana (Unmetered)';
      const beatDurMs = isMetered ? (60 / currentBpm) * 1000 : 0;

      (async () => {
        try {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
          }
          if (audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume();
          }

          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
          liveStreamRef.current = stream;
          setMicPermission('granted');

          let lastUIUpdate = 0;
          let prevSwara = null;
          let swaraStart = null;
          let swaraConf = 0;
          let swaraFreq = 0;
          let swaraCount = 0;

          const processPitch = (frequency, conf) => {
            const now = Date.now();

            if (frequency > 0 && conf >= confThreshold) {
              const mapped = freqToSwara(frequency, tonicHz);
              if (mapped) {
                const key = `${mapped.swara}-${mapped.octaveOffset}`;
                if (key === prevSwara) {
                  swaraConf = Math.max(swaraConf, conf * 0.7 + mapped.accuracy * 0.3);
                  swaraFreq += frequency;
                  swaraCount++;
                } else {
                  if (prevSwara && swaraStart && (now - swaraStart) >= noteMinMs) {
                    const dur = (now - swaraStart) / 1000;
                    const parts = prevSwara.split('-');
                    addSwara({
                      swara: parts[0],
                      octaveOffset: parseInt(parts[1]),
                      time: swaraStart / 1000,
                      duration: dur,
                      confidence: swaraConf,
                      frequency: swaraFreq / swaraCount,
                      semitone: mapped.semitone,
                      beat: isMetered ? Math.floor((swaraStart - recStart) / beatDurMs) : undefined,
                    });
                  }
                  prevSwara = key;
                  swaraStart = now;
                  swaraConf = conf * 0.7 + mapped.accuracy * 0.3;
                  swaraFreq = frequency;
                  swaraCount = 1;
                }

                if (now - lastUIUpdate > 100) {
                  setLiveSwara(mapped.swara);
                  setConfidence(conf * 0.7 + mapped.accuracy * 0.3);
                  lastUIUpdate = now;
                }
              }
            } else {
              if (prevSwara && swaraStart && (now - swaraStart) >= noteMinMs) {
                const dur = (now - swaraStart) / 1000;
                const parts = prevSwara.split('-');
                addSwara({
                  swara: parts[0],
                  octaveOffset: parseInt(parts[1]),
                  time: swaraStart / 1000,
                  duration: dur,
                  confidence: swaraConf,
                  frequency: swaraFreq / swaraCount,
                  semitone: 0,
                  beat: isMetered ? Math.floor((swaraStart - recStart) / beatDurMs) : undefined,
                });
              }
              prevSwara = null;
              swaraStart = null;
              swaraCount = 0;

              if (now - lastUIUpdate > 100) {
                setLiveSwara(null);
                setConfidence(0);
                lastUIUpdate = now;
              }
            }
          };

          const useWorklet = execMode === 'auto' || execMode === 'worklet';
          let workletHandle = null;

          if (useWorklet && engine.workletProcessor) {
            workletHandle = await startPitchWorklet(audioCtxRef.current, stream, (data) => {
              processPitch(data.frequency || 0, data.confidence || 0);
            }, engine);
          }

          if (workletHandle && !cancelled) {
            workletHandleRef.current = workletHandle;
          } else if (execMode === 'worklet') {
            console.warn(`Worklet forced but unavailable for engine "${engine.id}" — no detection will run.`);
          } else {
            const source = audioCtxRef.current.createMediaStreamSource(stream);
            const analyser = audioCtxRef.current.createAnalyser();
            analyser.fftSize = 4096;
            analyser.smoothingTimeConstant = 0.5;
            source.connect(analyser);

            liveAnalyserRef.current = analyser;
            liveBufferRef.current = new Float32Array(analyser.fftSize);
            liveSmoother.current = createPitchSmoother();
            const sampleRate = audioCtxRef.current.sampleRate;

            const detect = () => {
              liveAnalyserRef.current.getFloatTimeDomainData(liveBufferRef.current);
              const rms = calculateRMS(liveBufferRef.current);
              let frequency = 0, conf = 0;
              if (rms > PITCH_CONFIG.energyThreshold) {
                const result = engine.detect(liveBufferRef.current, sampleRate);
                const smoothed = liveSmoother.current(result.frequency, result.confidence);
                frequency = smoothed.pitch;
                conf = smoothed.confidence;
              } else {
                liveSmoother.current(0, 0);
              }
              processPitch(frequency, conf);
              liveRafRef.current = requestAnimationFrame(detect);
            };

            if (!cancelled) liveRafRef.current = requestAnimationFrame(detect);
          }
        } catch (err) {
          console.error('Mic access failed:', err);
          setMicPermission('denied');
          stopRecording();
          showToast('Microphone access needed. Please allow it in your browser settings.', 'error');
        }
      })();

      return () => {
        cancelled = true;
        if (liveRafRef.current) cancelAnimationFrame(liveRafRef.current);
        if (workletHandleRef.current) {
          workletHandleRef.current.stop();
          workletHandleRef.current = null;
        }
        if (liveStreamRef.current) {
          liveStreamRef.current.getTracks().forEach(t => t.stop());
          liveStreamRef.current = null;
        }
        liveAnalyserRef.current = null;
        liveBufferRef.current = null;
      };
    }

    if (liveRafRef.current) cancelAnimationFrame(liveRafRef.current);
    if (workletHandleRef.current) {
      workletHandleRef.current.stop();
      workletHandleRef.current = null;
    }
    if (!isRecording && liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach(t => t.stop());
      liveStreamRef.current = null;
      setLiveSwara(null);

      const swaraCount = useStore.getState().swaras.length;
      if (swaraCount > 0) {
        showToast(`Recording saved! ${swaraCount} swaras detected.`, 'success');
      }
    }
  }, [isRecording, isPaused, inputMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sourceRef.current?.stop();
      cancelAnimationFrame(rafRef.current);
      if (liveRafRef.current) cancelAnimationFrame(liveRafRef.current);
    };
  }, []);

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) useStore.getState().redo();
        else useStore.getState().undo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const idx = useStore.getState().selectedNoteIdx;
        if (idx >= 0 && document.activeElement === document.body) {
          e.preventDefault();
          useStore.getState().deleteSwara(idx);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const hasResults = swaras.length > 0;

  return (
    <div
      className={themeClass}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}
    >
      <Header />

      {/* Onboarding banner for first-time users */}
      {!onboardingSeen && (
        <div className="onboarding-banner">
          <span className="onboarding-text">
            Welcome to EzSwara! Upload audio, sing live, or compose manually.
          </span>
          <button className="onboarding-dismiss" onClick={dismissOnboarding}>&times;</button>
        </div>
      )}

      <ConfigStrip />
      {showCalibrate && <ShrutiCalibration />}
      <MetronomeStrip />

      {/* Info strip when results available */}
      {detectedTonic && (
        <div className="info-strip">
          <div className="info-chip tonic">
            <span className="label">Sa</span>
            <span className="value">{shruti}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              {NOTE_FREQUENCIES[shruti]} Hz
            </span>
          </div>
          {detectedTonic.note !== shruti && (
            <>
              <div className="info-divider" />
              <div className="info-chip">
                <span className="label">Detected</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {detectedTonic.note} ({detectedTonic.hz} Hz)
                </span>
              </div>
            </>
          )}
          <div className="info-divider" />
          <div className="info-chip">
            <span className="label">Swaras</span>
            <span className="value">{swaras.length}</span>
          </div>
          {raga !== 'Custom' && (
            <>
              <div className="info-divider" />
              <div className="info-chip">
                <span className="label">Raga</span>
                <span className="value" style={{ fontSize: 12 }}>{raga}</span>
              </div>
            </>
          )}
          {fileName && (
            <>
              <div className="info-divider" />
              <div className="info-chip">
                <span className="label">File</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fileName}
                </span>
              </div>
            </>
          )}
          {lastFileRef.current && (
            <>
              <div className="info-divider" />
              <button
                className="config-chip"
                style={{ fontSize: 11 }}
                onClick={reprocessFile}
              >
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 11, height: 11 }}>
                  <path d="M2 6A4 4 0 0 1 9.5 3.5M2.5 3.5H5.5v3" />
                  <path d="M10 6A4 4 0 0 1 2.5 8.5M9.5 8.5H6.5v-3" />
                </svg>
                Re-analyze
              </button>
            </>
          )}
        </div>
      )}

      {/* Main area */}
      <div className="notation-area">
        {inputMode === 'compose' ? (
          <ComposerGrid />
        ) : isProcessing ? (
          <div className="processing-overlay">
            <div className="processing-spinner" />
            <span className="processing-stage">{processStage}...</span>
            <div className="processing-bar-wrap">
              <div className="processing-bar" style={{ width: `${processProgress * 100}%` }} />
            </div>
          </div>
        ) : hasResults ? (
          <SwaraTimeline
            swaras={swaras}
            playbackTime={playbackTime}
            isPlaying={isPlaying}
          />
        ) : inputMode === 'file' ? (
          <DropZone onFile={handleFile} />
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <span className="empty-title">Ready to transcribe</span>
            <span className="empty-hint">
              Tap the red record button below to start singing. We'll convert your voice to musical notation in real-time.
            </span>
            <div className="empty-steps">
              <div className="empty-step">
                <span className="empty-step-num">1</span>
                <span>Set your key (Sa) in the config above</span>
              </div>
              <div className="empty-step">
                <span className="empty-step-num">2</span>
                <span>Tap the red button to start recording</span>
              </div>
              <div className="empty-step">
                <span className="empty-step-num">3</span>
                <span>Sing and see notation appear live</span>
              </div>
            </div>
          </div>
        )}
        {inputMode !== 'compose' && hasResults && <NoteEditor />}
      </div>

      {/* Swara Palette (compose mode) */}
      {inputMode === 'compose' && <SwaraPalette />}

      {/* Composer controls (compose mode) */}
      {inputMode === 'compose' && (
        <div className="composer-bar">
          <button className={`composer-bar-btn primary`} onClick={handleComposerPlay}>
            {composerPlaying ? (
              <svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="4" height="10" rx="1"/><rect x="9" y="3" width="4" height="10" rx="1"/></svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="currentColor"><polygon points="3,2 14,8 3,14"/></svg>
            )}
            {composerPlaying ? 'Stop' : 'Play'}
          </button>
          <button className="composer-bar-btn" onClick={() => handleComposerExport('text')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 10v3h8v-3"/><path d="M8 2v8m-3-3 3 3 3-3"/></svg>
            Text
          </button>
          <button className="composer-bar-btn" onClick={() => handleComposerExport('pdf')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="1" width="10" height="14" rx="1"/><path d="M6 5h4M6 8h4M6 11h2"/></svg>
            PDF
          </button>
          <button className="composer-bar-btn" onClick={() => handleComposerExport('png')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2" width="14" height="12" rx="1.5"/><circle cx="5" cy="6" r="1.5"/><path d="M1 12l4-4 3 3 2-2 5 5"/></svg>
            PNG
          </button>
          <button className="composer-bar-btn" onClick={() => handleComposerExport('print')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="12" height="7" rx="1"/><path d="M4 5V2h8v3"/><path d="M4 9h8v5H4z"/></svg>
            Print
          </button>
          <button className="composer-bar-btn danger" onClick={() => useStore.getState().clearComposer()}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>
            Clear
          </button>
        </div>
      )}

      {/* Waveform (non-compose mode) */}
      {inputMode !== 'compose' && (
        <div className="waveform-strip">
          <div className="waveform-canvas-wrap">
            <WaveformCanvas
              samples={audioSamples}
              sampleRate={audioSampleRate}
              isPlaying={isPlaying}
              playbackTime={playbackTime}
              duration={audioDuration}
            />
          </div>
          <div className="waveform-info">
            {detectedTonic ? (
              <>
                <span className="label">Sa = {shruti}</span>
                <span className="value">{NOTE_FREQUENCIES[shruti]} Hz</span>
              </>
            ) : (
              <>
                <span className="label">Status</span>
                <span className="value" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                  {isProcessing ? 'Analyzing' : 'Idle'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {inputMode !== 'compose' && (
        <ControlBar
          onUploadClick={handleUploadClick}
          onPlayPause={handlePlayPause}
          onExport={handleExport}
        />
      )}

      <TweaksPanel />
      <HelpFAQ />
      <MobileNav />

      {/* Toast notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
}
