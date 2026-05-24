import { NOTE_FREQUENCIES, SWARA_FREQ_RATIOS } from '../data/constants';

let ctx = null;
let scheduledNodes = [];
let stopCallback = null;

// Metronome state
let metronomeInterval = null;
let metronomeCtx = null;

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

export function playComposition(avartanams, bpm, shrutiNote, onBeat, onDone) {
  stopPlayback();
  const ac = getContext();
  const beatDur = 60 / bpm;
  const startTime = ac.currentTime + 0.05;
  let beatIndex = 0;

  for (let ri = 0; ri < avartanams.length; ri++) {
    const row = avartanams[ri];
    for (let ci = 0; ci < row.length; ci++) {
      const cell = row[ci];
      const subDur = beatDur / cell.length;

      for (let si = 0; si < cell.length; si++) {
        const { swara, octave } = cell[si];
        const time = startTime + beatIndex * beatDur + si * subDur;
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

      const cbTime = startTime + beatIndex * beatDur;
      const beatTimeout = setTimeout(() => {
        onBeat?.({ row: ri, col: ci });
      }, (cbTime - ac.currentTime) * 1000);
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
}

export function startMetronome(bpm, beatsPerCycle, structure, onTick) {
  stopMetronome();

  if (!metronomeCtx || metronomeCtx.state === 'closed') {
    metronomeCtx = new AudioContext();
  }
  if (metronomeCtx.state === 'suspended') metronomeCtx.resume();

  const ac = metronomeCtx;
  const beatDur = 60 / bpm;
  let beatIndex = 0;

  const sectionBounds = new Set();
  let sum = 0;
  for (let i = 0; i < structure.length - 1; i++) {
    sum += structure[i];
    sectionBounds.add(sum);
  }

  const tick = () => {
    const now = ac.currentTime;
    const isSam = beatIndex % beatsPerCycle === 0;
    const isSectionStart = sectionBounds.has(beatIndex % beatsPerCycle);

    if (isSam) {
      playClick(ac, 1200, now, 0.5);
    } else if (isSectionStart) {
      playClick(ac, 900, now, 0.35);
    } else {
      playClick(ac, 700, now, 0.2);
    }

    onTick?.(beatIndex % beatsPerCycle);
    beatIndex++;
  };

  tick();
  metronomeInterval = setInterval(tick, beatDur * 1000);
}

export function stopMetronome() {
  if (metronomeInterval) {
    clearInterval(metronomeInterval);
    metronomeInterval = null;
  }
}

export function isMetronomePlaying() {
  return metronomeInterval !== null;
}
