import { create } from 'zustand';
import { SWARA_NAMES_BY_SEMITONE } from './data/constants';

const CUSTOM_SCALES_KEY = 'ezswara-custom-scales';

function loadCustomScales() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_SCALES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function persistCustomScales(scales) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_SCALES_KEY, JSON.stringify(scales));
  } catch (_) { /* ignore quota errors */ }
}

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

  // Allow intentionally entering swaras outside the selected raga (anya swara)
  anyaSwaraMode: false,
  setAnyaSwaraMode: (v) => set({ anyaSwaraMode: v }),
  toggleAnyaSwaraMode: () => set((s) => ({ anyaSwaraMode: !s.anyaSwaraMode })),

  // User-defined custom scales: { id, name, semitones:number[], swaras:string[] }
  customScales: loadCustomScales(),
  addCustomScale: ({ name, semitones }) => {
    const sorted = [...new Set(semitones)].sort((a, b) => a - b);
    const swaras = sorted.map((st) => SWARA_NAMES_BY_SEMITONE[st]);
    const scale = { id: `cs-${Date.now()}`, name, semitones: sorted, swaras };
    set((s) => {
      const next = [...s.customScales.filter(c => c.name !== name), scale];
      persistCustomScales(next);
      return { customScales: next, raga: name };
    });
    return scale;
  },
  updateCustomScale: (id, patch) => set((s) => {
    const next = s.customScales.map((c) => {
      if (c.id !== id) return c;
      const merged = { ...c, ...patch };
      if (patch.semitones) {
        const sorted = [...new Set(patch.semitones)].sort((a, b) => a - b);
        merged.semitones = sorted;
        merged.swaras = sorted.map((st) => SWARA_NAMES_BY_SEMITONE[st]);
      }
      return merged;
    });
    persistCustomScales(next);
    return { customScales: next };
  }),
  deleteCustomScale: (id) => set((s) => {
    const removed = s.customScales.find(c => c.id === id);
    const next = s.customScales.filter((c) => c.id !== id);
    persistCustomScales(next);
    const raga = removed && s.raga === removed.name ? 'Custom' : s.raga;
    return { customScales: next, raga };
  }),

  // Scale-builder modal
  showScaleBuilder: false,
  toggleScaleBuilder: () => set((s) => ({ showScaleBuilder: !s.showScaleBuilder })),

  // Uploaded-audio: align detected swaras to the tala grid (opt-in). When off,
  // uploaded notes are shown free (unmetered), never force-fit into a cycle.
  beatAlignEnabled: false,
  setBeatAlignEnabled: (v) => {
    const state = get();
    const isMetered = v && state.tala !== 'Alapana (Unmetered)';
    const beatDurSec = isMetered ? 60 / state.bpm : 0;
    const swaras = state.swaras.map((s) => {
      if (isMetered) return { ...s, beat: Math.round(s.time / beatDurSec) };
      const { beat, ...rest } = s;
      return rest;
    });
    set({ beatAlignEnabled: v, swaras });
  },
  tala: 'Alapana (Unmetered)',
  setTala: (tala) => {
    const state = get();
    // Only re-map uploaded swaras onto beats when the user has explicitly opted
    // into tala alignment; otherwise leave them as free notes.
    if (state.beatAlignEnabled && tala !== 'Alapana (Unmetered)') {
      const beatDurSec = 60 / state.bpm;
      const swaras = state.swaras.map(s => ({ ...s, beat: Math.round(s.time / beatDurSec) }));
      set({ tala, swaras });
    } else {
      set({ tala });
    }
  },
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
  setBpm: (bpm) => {
    const state = get();
    if (state.beatAlignEnabled && state.tala !== 'Alapana (Unmetered)') {
      const beatDurSec = 60 / bpm;
      const swaras = state.swaras.map(s => ({ ...s, beat: Math.round(s.time / beatDurSec) }));
      set({ bpm, swaras });
    } else {
      set({ bpm });
    }
  },

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

  setResults: ({ tonic, swaras, pitchData, duration, sampleRate, samples, fileName }) => {
    const state = get();
    // Uploaded audio is shown as free notes unless tala alignment is opted in.
    const align = state.beatAlignEnabled && state.tala !== 'Alapana (Unmetered)';
    const beatDurSec = align ? 60 / state.bpm : 0;
    const quantized = align
      ? swaras.map(s => ({ ...s, beat: Math.round(s.time / beatDurSec) }))
      : swaras;
    set({
      detectedTonic: tonic,
      swaras: quantized,
      pitchData,
      audioDuration: duration,
      audioSamples: samples,
      audioSampleRate: sampleRate,
      fileName: fileName || state.fileName,
      isProcessing: false,
      processProgress: 1,
      processStage: 'done',
    });
  },

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
  recordingStartTime: null,

  startRecording: () => set({ isRecording: true, isPaused: false, recordingStartTime: Date.now() }),
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
  setSelectedNoteIdx: (idx) => set({ selectedNoteIdx: idx, selectedRange: null }),
  selectedRange: null, // { start, end } inclusive indices
  setSelectedRange: (range) => set({ selectedRange: range, selectedNoteIdx: -1 }),
  clearSelection: () => set({ selectedNoteIdx: -1, selectedRange: null }),

  updateSwara: (idx, patch) => set((s) => {
    const next = s.swaras.map((sw, i) => i === idx ? { ...sw, ...patch } : sw);
    const hist = [...(s._swaraHistory || []).slice(0, (s._swaraHistoryIdx ?? 0) + 1), next];
    return { swaras: next, _swaraHistory: hist, _swaraHistoryIdx: hist.length - 1 };
  }),

  deleteSwara: (idx) => set((s) => {
    const next = s.swaras.filter((_, i) => i !== idx);
    const hist = [...(s._swaraHistory || []).slice(0, (s._swaraHistoryIdx ?? 0) + 1), next];
    const newIdx = next.length === 0 ? -1 : Math.min(idx, next.length - 1);
    return { swaras: next, selectedNoteIdx: newIdx, _swaraHistory: hist, _swaraHistoryIdx: hist.length - 1 };
  }),

  deleteRange: (start, end) => set((s) => {
    const next = s.swaras.filter((_, i) => i < start || i > end);
    const hist = [...(s._swaraHistory || []).slice(0, (s._swaraHistoryIdx ?? 0) + 1), next];
    const newIdx = next.length === 0 ? -1 : Math.min(start, next.length - 1);
    return { swaras: next, selectedNoteIdx: newIdx, selectedRange: null, _swaraHistory: hist, _swaraHistoryIdx: hist.length - 1 };
  }),

  groupSpeed: (start, end) => set((s) => {
    const selected = s.swaras.slice(start, end + 1);
    if (selected.length < 2) return {};
    const minDur = Math.min(...selected.map(n => n.duration));
    const next = s.swaras.map((sw, i) => {
      if (i >= start && i <= end) return { ...sw, duration: minDur };
      return sw;
    });
    const hist = [...(s._swaraHistory || []).slice(0, (s._swaraHistoryIdx ?? 0) + 1), next];
    return { swaras: next, selectedRange: null, selectedNoteIdx: -1, _swaraHistory: hist, _swaraHistoryIdx: hist.length - 1 };
  }),

  mergeSwaras: (start, end, replacementSwara) => set((s) => {
    const selected = s.swaras.slice(start, end + 1);
    if (selected.length < 2) return {};
    const merged = {
      swara: replacementSwara || selected[0].swara,
      octaveOffset: selected[0].octaveOffset,
      time: selected[0].time,
      duration: selected.reduce((sum, n) => sum + n.duration, 0),
      confidence: Math.max(...selected.map(n => n.confidence)),
      frequency: selected[0].frequency,
      semitone: selected[0].semitone,
      beat: selected[0].beat,
    };
    const next = [...s.swaras.slice(0, start), merged, ...s.swaras.slice(end + 1)];
    const hist = [...(s._swaraHistory || []).slice(0, (s._swaraHistoryIdx ?? 0) + 1), next];
    return { swaras: next, selectedRange: null, selectedNoteIdx: start, _swaraHistory: hist, _swaraHistoryIdx: hist.length - 1 };
  }),

  _nextGroupId: 1,
  groupSwaras: (start, end) => set((s) => {
    const gid = s._nextGroupId;
    const next = s.swaras.map((sw, i) => {
      if (i >= start && i <= end) return { ...sw, groupId: gid };
      return sw;
    });
    const hist = [...(s._swaraHistory || []).slice(0, (s._swaraHistoryIdx ?? 0) + 1), next];
    return { swaras: next, _nextGroupId: gid + 1, selectedRange: null, selectedNoteIdx: -1, _swaraHistory: hist, _swaraHistoryIdx: hist.length - 1 };
  }),

  ungroupSwaras: (start, end) => set((s) => {
    const next = s.swaras.map((sw, i) => {
      if (i >= start && i <= end) { const { groupId, ...rest } = sw; return rest; }
      return sw;
    });
    const hist = [...(s._swaraHistory || []).slice(0, (s._swaraHistoryIdx ?? 0) + 1), next];
    return { swaras: next, selectedRange: null, selectedNoteIdx: -1, _swaraHistory: hist, _swaraHistoryIdx: hist.length - 1 };
  }),

  insertSwara: (idx, swara) => set((s) => {
    const next = [...s.swaras.slice(0, idx), swara, ...s.swaras.slice(idx)];
    const hist = [...(s._swaraHistory || []).slice(0, (s._swaraHistoryIdx ?? 0) + 1), next];
    return { swaras: next, selectedNoteIdx: idx, _swaraHistory: hist, _swaraHistoryIdx: hist.length - 1 };
  }),

  // Shift every beat-aligned swara by `delta` beats (drag-to-set-sama). Clamped
  // at 0 and recorded in history so it can be undone.
  shiftBeats: (delta) => set((s) => {
    if (!delta) return {};
    const minBeat = Math.min(...s.swaras.map(sw => sw.beat ?? 0));
    const applied = Math.max(delta, -minBeat);
    if (!applied) return {};
    const next = s.swaras.map(sw => sw.beat === undefined ? sw : { ...sw, beat: sw.beat + applied });
    const hist = [...(s._swaraHistory || []).slice(0, (s._swaraHistoryIdx ?? 0) + 1), next];
    return { swaras: next, _swaraHistory: hist, _swaraHistoryIdx: hist.length - 1 };
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
  showHelp: false,
  toggleHelp: () => set((s) => ({ showHelp: !s.showHelp })),

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

  // Atomic swara entry at the current selection. Reads live state (selectedCell,
  // composerSpeed) so it cannot lose subdivisions to stale render closures — this
  // is what makes 2x/3x/4x reliably fill exactly N subdivisions.
  inputSwaraAtSelection: (swara, octave = 0) => set((s) => {
    const { row, col, sub } = s.selectedCell;
    const speed = s.composerSpeed;
    const beats = s.avartanams[0]?.length || 8;
    const av = s.avartanams.map(r => r.map(c => [...c]));
    if (!av[row]?.[col]) return {};
    const cell = av[row][col];
    while (cell.length < speed) cell.push({ swara: '', octave: 0 });
    if (cell.length > speed) cell.length = speed;
    const targetSub = Math.min(sub, speed - 1);
    cell[targetSub] = { swara, octave };

    let nextSel;
    if (targetSub < speed - 1) {
      nextSel = { row, col, sub: targetSub + 1 };
    } else {
      let nc = col + 1;
      let nr = row;
      if (nc >= beats) { nc = 0; nr = Math.min(nr + 1, av.length - 1); }
      nextSel = { row: nr, col: nc, sub: 0 };
    }
    return { avartanams: av, selectedCell: nextSel };
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
  // Play a synced metronome click track alongside the composition
  composerMetronome: false,
  toggleComposerMetronome: () => set((s) => ({ composerMetronome: !s.composerMetronome })),
}));

export default useStore;
