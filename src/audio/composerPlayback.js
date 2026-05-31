import { NOTE_FREQUENCIES, SWARA_FREQ_RATIOS } from '../data/constants';

let ctx = null;
let scheduledNodes = [];
let stopCallback = null;

// Standalone metronome (lookahead scheduler) state
let metronomeTimerId = null;
let metronomeTimeouts = [];

const LOOKAHEAD_MS = 25;        // how often the scheduler wakes up
const SCHEDULE_AHEAD = 0.18;    // seconds of audio scheduled in advance
const START_LATENCY = 0.12;     // shared start offset so note + click align

// A single shared AudioContext is used for both note playback and the
// metronome so they reference the same clock and can start on the same beat.
function getContext() {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function swaraToFreq(swara, octave, shrutiNote) {
  const baseHz = NOTE_FREQUENCIES[shrutiNote] || 261.63;
  const ratio = SWARA_FREQ_RATIOS[swara];
  if (!ratio) return null;
  return baseHz * ratio * Math.pow(2, octave);
}

function sectionBoundsFrom(structure = []) {
  const bounds = new Set();
  let sum = 0;
  for (let i = 0; i < structure.length - 1; i++) {
    sum += structure[i];
    bounds.add(sum);
  }
  return bounds;
}

function playClick(ac, frequency, time, volume) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, time);
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(time);
  osc.stop(time + 0.1);
  return { osc, gain };
}

// Schedule a single metronome click for `beatInCycle` at absolute `time`.
function scheduleMetronomeClick(ac, beatInCycle, time, beatsPerCycle, sectionBounds) {
  const isSam = beatInCycle % beatsPerCycle === 0;
  const isSectionStart = sectionBounds.has(beatInCycle % beatsPerCycle);
  if (isSam) return playClick(ac, 1200, time, 0.5);
  if (isSectionStart) return playClick(ac, 900, time, 0.35);
  return playClick(ac, 700, time, 0.2);
}

/**
 * Play a composition. When opts.withMetronome is set, metronome clicks are
 * scheduled against the exact same startTime as the notes, guaranteeing the
 * song and the count begin on the same beat.
 */
export function playComposition(avartanams, bpm, shrutiNote, onBeat, onDone, opts = {}) {
  stopPlayback();
  const ac = getContext();
  const beatDur = 60 / bpm;
  const startTime = ac.currentTime + START_LATENCY;
  let beatIndex = 0;

  const {
    withMetronome = false,
    beatsPerCycle = avartanams[0]?.length || 8,
    structure = [beatsPerCycle],
  } = opts;
  const sectionBounds = sectionBoundsFrom(structure);

  for (let ri = 0; ri < avartanams.length; ri++) {
    const row = avartanams[ri];
    for (let ci = 0; ci < row.length; ci++) {
      const cell = row[ci];
      const subDur = beatDur / cell.length;
      const beatTime = startTime + beatIndex * beatDur;

      for (let si = 0; si < cell.length; si++) {
        const { swara, octave } = cell[si];
        const time = beatTime + si * subDur;
        const freq = swaraToFreq(swara, octave, shrutiNote);

        if (freq) {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);

          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.25, time + 0.015);
          gain.gain.setValueAtTime(0.25, time + subDur * 0.7);
          gain.gain.linearRampToValueAtTime(0, time + subDur * 0.95);

          osc.connect(gain);
          gain.connect(ac.destination);
          osc.start(time);
          osc.stop(time + subDur);
          scheduledNodes.push(osc, gain);
        }
      }

      if (withMetronome) {
        const { osc, gain } = scheduleMetronomeClick(ac, beatIndex, beatTime, beatsPerCycle, sectionBounds);
        scheduledNodes.push(osc, gain);
      }

      const beatTimeout = setTimeout(() => {
        onBeat?.({ row: ri, col: ci });
      }, (beatTime - ac.currentTime) * 1000);
      scheduledNodes.push({ timeout: beatTimeout });

      beatIndex++;
    }
  }

  const totalDur = beatIndex * beatDur;
  const doneTimeout = setTimeout(() => {
    onDone?.();
  }, (startTime + totalDur - ac.currentTime) * 1000 + 50);
  scheduledNodes.push({ timeout: doneTimeout });

  stopCallback = onDone;
}

export function stopPlayback() {
  for (const node of scheduledNodes) {
    if (node.timeout !== undefined) {
      clearTimeout(node.timeout);
    } else if (node.stop) {
      try { node.stop(); } catch (_) {}
      try { node.disconnect(); } catch (_) {}
    }
  }
  scheduledNodes = [];
  stopCallback = null;
}

/**
 * Standalone metronome using a Web Audio lookahead scheduler (sample-accurate,
 * no setInterval drift). Beat 0 fires at currentTime + START_LATENCY, matching
 * playComposition's start offset so the two can be started in lockstep.
 */
export function startMetronome(bpm, beatsPerCycle, structure, onTick) {
  stopMetronome();
  const ac = getContext();
  const beatDur = 60 / bpm;
  const sectionBounds = sectionBoundsFrom(structure);

  let beatIndex = 0;
  let nextBeatTime = ac.currentTime + START_LATENCY;

  const scheduler = () => {
    while (nextBeatTime < ac.currentTime + SCHEDULE_AHEAD) {
      const beatInCycle = beatIndex % beatsPerCycle;
      scheduleMetronomeClick(ac, beatIndex, nextBeatTime, beatsPerCycle, sectionBounds);
      const fireAt = (nextBeatTime - ac.currentTime) * 1000;
      const to = setTimeout(() => onTick?.(beatInCycle), Math.max(0, fireAt));
      metronomeTimeouts.push(to);
      nextBeatTime += beatDur;
      beatIndex++;
    }
  };

  scheduler();
  metronomeTimerId = setInterval(scheduler, LOOKAHEAD_MS);
}

export function stopMetronome() {
  if (metronomeTimerId) {
    clearInterval(metronomeTimerId);
    metronomeTimerId = null;
  }
  for (const to of metronomeTimeouts) clearTimeout(to);
  metronomeTimeouts = [];
}

export function isMetronomePlaying() {
  return metronomeTimerId !== null;
}
