import { yinPitchDetection } from './pitchDetection';
import { autocorrelationDetect } from './autocorrelation';

export const ENGINES = [
  {
    id: 'yin',
    name: 'YIN',
    description: 'High-accuracy autocorrelation-based F0 estimator with CMNDF',
    detect: yinPitchDetection,
    workletProcessor: 'pitch-detector',
    workletUrl: '/pitch-worklet.js',
  },
  {
    id: 'autocorrelation',
    name: 'Autocorrelation',
    description: 'Lightweight normalized autocorrelation — fast, good for clean signals',
    detect: autocorrelationDetect,
    workletProcessor: 'autocorrelation-detector',
    workletUrl: '/autocorrelation-worklet.js',
  },
];

export function getEngine(id) {
  return ENGINES.find(e => e.id === id) || ENGINES[0];
}

export function getDefaultEngine() {
  return ENGINES[0];
}
