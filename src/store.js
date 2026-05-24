import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Input mode
  inputMode: 'live', // 'file' | 'live' | 'compose'
  setInputMode: (m) => set({ inputMode: m }),

  // Notation display mode
  mode: 'carnatic', // 'dual' | 'carnatic' | 'western'
  setMode: (mode) => set({ mode }),

  // Theme
  theme: 'manuscript', // 'cosmic' | 'manuscript' | 'minimal'
  setTheme: (theme) => set({ theme }),

  // Musical settings
  shruti: 'C',
  setShruti: (shruti) => set({ shruti }),
  shrutiAutoDetected: false,
  setShrutiAutoDetected: (v) => set({ shrutiAutoDetected: v }),
  raga: 'Custom',
  setRaga: (raga) => set({ raga }),
  tala: 'Alapana (Unmetered)',
  setTala: (tala) => set({ tala }),
  customTalaGroups: [4, 4],
  setCustomTalaGroups: (g) => set({ customTalaGroups: g }),

  // Shruti calibration
  showCalibrate: false,
  toggleCalibrate: () => set((s) => ({ showCalibrate: !s.showCalibrate })),
  isListeningForSa: false,
  listeningProgress: 0,
  listeningLiveHz: null,
  listeningLiveNote: null,
  setListeningState: (patch) => set(patch),

  // BPM / metronome
  bpm: 72,
  setBpm: (bpm) => set({ bpm }),

  // File state
  fileName: null,
  audioDuration: 0,
  audioSamples: null,
  audioSampleRate: null,

  // Processing
  isProcessing: false,
  processProgress: 0,
  processStage: '',
  setProcessing: (isProcessing, progress, stage) =>
    set({ isProcessing, processProgress: progress || 0, processStage: stage || '' }),

  // Results
  detectedTonic: null,
  swaras: [],
  pitchData: [],

  setResults: ({ tonic, swaras, pitchData, duration, sampleRate, samples, fileName }) =>
    set({
      detectedTonic: tonic,
      swaras,
      pitchData,
      audioDuration: duration,
      audioSamples: samples,
      audioSampleRate: sampleRate,
      fileName: fileName || get().fileName,
      isProcessing: false,
      processProgress: 1,
      processStage: 'done',
    }),

  clearResults: () =>
    set({
      fileName: null,
      audioDuration: 0,
      audioSamples: null,
      audioSampleRate: null,
      detectedTonic: null,
      swaras: [],
      pitchData: [],
      isProcessing: false,
      processProgress: 0,
      processStage: '',
      isPlaying: false,
      playbackTime: 0,
      shrutiAutoDetected: false,
    }),

  // Playback
  isPlaying: false,
  playbackTime: 0,
  setIsPlaying: (v) => set({ isPlaying: v }),
  setPlaybackTime: (t) => set({ playbackTime: t }),

  // Live recording
  isRecording: false,
  isPaused: false,
  elapsed: 0,
  confidence: 0,
  liveSwara: null,

  startRecording: () => set({ isRecording: true, isPaused: false }),
  stopRecording: () => set({ isRecording: false, isPaused: false, liveSwara: null }),
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  incrementElapsed: () => set((s) => ({ elapsed: s.elapsed + 1 })),
  setConfidence: (confidence) => set({ confidence }),
  setLiveSwara: (s) => set({ liveSwara: s }),
  addSwara: (swara) => set((s) => {
    const next = [...s.swaras, swara];
    return { swaras: next, _swaraHistory: [...(s._swaraHistory || []).slice(0, (s._swaraHistoryIdx ?? -1) + 1), next], _swaraHistoryIdx: ((s._swaraHistoryIdx ?? -1) + 1) };
  }),

  // Note editing
  selectedNoteIdx: -1,
  setSelectedNoteIdx: (idx) => set({ selectedNoteIdx: idx }),

  updateSwara: (idx, patch) => set((s) => {
    const next = s.swaras.map((sw, i) => i === idx ? { ...sw, ...patch } : sw);
    const hist = [...(s._swaraHistory || []).slice(0, (s._swaraHistoryIdx ?? 0) + 1), next];
    return { swaras: next, _swaraHistory: hist, _swaraHistoryIdx: hist.length - 1 };
  }),

  deleteSwara: (idx) => set((s) => {
    const next = s.swaras.filter((_, i) => i !== idx);
    const hist = [...(s._swaraHistory || []).slice(0, (s._swaraHistoryIdx ?? 0) + 1), next];
    return { swaras: next, selectedNoteIdx: -1, _swaraHistory: hist, _swaraHistoryIdx: hist.length - 1 };
  }),

  insertSwara: (idx, swara) => set((s) => {
    const next = [...s.swaras.slice(0, idx), swara, ...s.swaras.slice(idx)];
    const hist = [...(s._swaraHistory || []).slice(0, (s._swaraHistoryIdx ?? 0) + 1), next];
    return { swaras: next, selectedNoteIdx: idx, _swaraHistory: hist, _swaraHistoryIdx: hist.length - 1 };
  }),

  // Undo / Redo
  _swaraHistory: [],
  _swaraHistoryIdx: -1,

  undo: () => set((s) => {
    const idx = (s._swaraHistoryIdx ?? 0) - 1;
    if (idx < 0 || !s._swaraHistory?.[idx]) return {};
    return { swaras: s._swaraHistory[idx], _swaraHistoryIdx: idx, selectedNoteIdx: -1 };
  }),

  redo: () => set((s) => {
    const idx = (s._swaraHistoryIdx ?? 0) + 1;
    if (!s._swaraHistory?.[idx]) return {};
    return { swaras: s._swaraHistory[idx], _swaraHistoryIdx: idx, selectedNoteIdx: -1 };
  }),

  // Pitch engine
  pitchEngine: 'yin',
  setPitchEngine: (id) => set({ pitchEngine: id }),
  pitchExecMode: 'auto',  // 'auto' | 'worklet' | 'main-thread'
  setPitchExecMode: (m) => set({ pitchExecMode: m }),

  // Tweaks
  tweaksOpen: false,
  toggleTweaks: () => set((s) => ({ tweaksOpen: !s.tweaksOpen })),
  showAdvancedTweaks: false,
  toggleAdvancedTweaks: () => set((s) => ({ showAdvancedTweaks: !s.showAdvancedTweaks })),

  // Mobile UI
  mobileConfigExpanded: false,
  toggleMobileConfig: () => set((s) => ({ mobileConfigExpanded: !s.mobileConfigExpanded })),
  onboardingSeen: typeof localStorage !== 'undefined' && localStorage.getItem('ezswara-onboarding-seen') === '1',
  dismissOnboarding: () => {
    localStorage.setItem('ezswara-onboarding-seen', '1');
    set({ onboardingSeen: true });
  },

  // Toast notifications
  toast: null,
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 4000);
  },
  minStableFrames: 3,
  setMinStableFrames: (v) => set({ minStableFrames: v }),
  confidenceThreshold: 0.3,
  setConfidenceThreshold: (v) => set({ confidenceThreshold: v }),

  // Note grouping (for live mode)
  minNoteMs: 80,
  setMinNoteMs: (v) => set({ minNoteMs: v }),
  silenceMs: 200,
  setSilenceMs: (v) => set({ silenceMs: v }),

  // Mic
  micPermission: null,
  setMicPermission: (p) => set({ micPermission: p }),

  // ── Composer (Manual Notation) ──────────────────────────────
  // Each avartanam is an array of cells. Each cell is an array of
  // subdivisions: [{ swara: 'Sa', octave: 0 }].
  // subdivisions.length = 1 (normal), 2 (double speed), 4 (quad speed).
  composerTitle: '',
  setComposerTitle: (t) => set({ composerTitle: t }),
  avartanams: [[]],
  selectedCell: { row: 0, col: 0, sub: 0 },
  composerSpeed: 1, // current input speed: 1, 2, or 4

  setSelectedCell: (cell) => set({ selectedCell: cell }),
  setComposerSpeed: (s) => set({ composerSpeed: s }),

  initComposerGrid: (beats) => {
    const emptyRow = Array.from({ length: beats }, () => [{ swara: '', octave: 0 }]);
    set({ avartanams: [emptyRow], selectedCell: { row: 0, col: 0, sub: 0 } });
  },

  addAvartanam: () => set((s) => {
    const beats = s.avartanams[0]?.length || 8;
    const emptyRow = Array.from({ length: beats }, () => [{ swara: '', octave: 0 }]);
    return { avartanams: [...s.avartanams, emptyRow] };
  }),

  removeAvartanam: (idx) => set((s) => {
    if (s.avartanams.length <= 1) return {};
    const next = s.avartanams.filter((_, i) => i !== idx);
    const sel = { ...s.selectedCell };
    if (sel.row >= next.length) sel.row = next.length - 1;
    return { avartanams: next, selectedCell: sel };
  }),

  setCellSwara: (row, col, sub, swara, octave) => set((s) => {
    const av = s.avartanams.map(r => r.map(c => [...c]));
    if (!av[row] || !av[row][col]) return {};
    const cell = av[row][col];
    while (cell.length <= sub) cell.push({ swara: '', octave: 0 });
    cell[sub] = { swara, octave: octave ?? cell[sub]?.octave ?? 0 };
    return { avartanams: av };
  }),

  setCellOctave: (row, col, sub, octave) => set((s) => {
    const av = s.avartanams.map(r => r.map(c => [...c]));
    if (!av[row]?.[col]?.[sub]) return {};
    av[row][col][sub] = { ...av[row][col][sub], octave };
    return { avartanams: av };
  }),

  setCellSpeed: (row, col, speed) => set((s) => {
    const av = s.avartanams.map(r => r.map(c => [...c]));
    if (!av[row]?.[col]) return {};
    const cur = av[row][col];
    while (cur.length < speed) cur.push({ swara: '', octave: 0 });
    if (cur.length > speed) cur.length = speed;
    return { avartanams: av };
  }),

  clearCell: (row, col) => set((s) => {
    const av = s.avartanams.map(r => r.map(c => [...c]));
    if (!av[row]?.[col]) return {};
    av[row][col] = [{ swara: '', octave: 0 }];
    return { avartanams: av };
  }),

  clearComposer: () => set((s) => {
    const beats = s.avartanams[0]?.length || 8;
    const emptyRow = Array.from({ length: beats }, () => [{ swara: '', octave: 0 }]);
    return { avartanams: [emptyRow], selectedCell: { row: 0, col: 0, sub: 0 }, composerTitle: '' };
  }),

  // Composer playback
  composerPlaying: false,
  composerPlayPos: { row: 0, col: 0 },
  setComposerPlaying: (v) => set({ composerPlaying: v }),
  setComposerPlayPos: (p) => set({ composerPlayPos: p }),
}));

export default useStore;
