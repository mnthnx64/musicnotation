let workletNode = null;
let source = null;

/**
 * @param {AudioContext} audioContext
 * @param {MediaStream} stream
 * @param {function} onPitch
 * @param {object} [engineDescriptor] - { workletProcessor, workletUrl } from the engine registry
 */
export async function startPitchWorklet(audioContext, stream, onPitch, engineDescriptor) {
  if (typeof audioContext.audioWorklet?.addModule !== 'function') {
    return null;
  }

  const processorName = engineDescriptor?.workletProcessor || 'pitch-detector';
  const workletUrl = engineDescriptor?.workletUrl || '/pitch-worklet.js';

  try {
    await audioContext.audioWorklet.addModule(new URL(workletUrl, import.meta.url).href);
  } catch {
    try {
      await audioContext.audioWorklet.addModule(workletUrl);
    } catch (e) {
      console.warn('AudioWorklet registration failed, falling back', e);
      return null;
    }
  }

  workletNode = new AudioWorkletNode(audioContext, processorName);
  source = audioContext.createMediaStreamSource(stream);
  source.connect(workletNode);

  workletNode.port.onmessage = (e) => {
    onPitch?.(e.data);
  };

  return {
    stop() {
      try {
        source?.disconnect();
        workletNode?.disconnect();
        workletNode?.port?.close();
      } catch {}
      source = null;
      workletNode = null;
    },
  };
}
