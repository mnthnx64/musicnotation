import { useRef, useEffect } from 'react';

export default function WaveformCanvas({ samples, sampleRate, isPlaying, playbackTime, duration }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const phaseRef = useRef(0);
  const ampRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const r = canvas.parentElement.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      canvas.style.width = r.width + 'px';
      canvas.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const W = canvas.width / dpr, H = canvas.height / dpr;
      ctx.clearRect(0, 0, W, H);

      if (samples && samples.length > 0) {
        // Draw real waveform from audio file
        const step = Math.max(1, Math.floor(samples.length / W));

        ctx.beginPath();
        for (let i = 0; i < W; i++) {
          const start = Math.floor(i * step);
          let min = 0, max = 0;
          for (let j = start; j < start + step && j < samples.length; j++) {
            if (samples[j] < min) min = samples[j];
            if (samples[j] > max) max = samples[j];
          }
          const yMin = H / 2 + min * H * 0.4;
          const yMax = H / 2 + max * H * 0.4;
          if (i === 0) ctx.moveTo(i, yMin);
          ctx.lineTo(i, yMax);
        }
        ctx.strokeStyle = 'oklch(0.73 0.145 145)';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.7;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Playback cursor
        if (isPlaying && duration > 0 && playbackTime >= 0) {
          const x = (playbackTime / duration) * W;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.strokeStyle = 'var(--accent, oklch(0.73 0.145 52))';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else {
        // Idle animated wave
        const targetAmp = 0.04;
        ampRef.current += (targetAmp - ampRef.current) * 0.06;
        const amp = ampRef.current;
        phaseRef.current += 0.004;
        const steps = Math.ceil(W);

        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * W;
          const t = phaseRef.current + (i / steps) * Math.PI * 6;
          const y = H / 2 + Math.sin(t) * (H * 0.38 * amp);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'oklch(0.73 0.145 145)';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Center baseline
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.strokeStyle = 'oklch(0.3 0.015 265)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [samples, sampleRate, isPlaying, playbackTime, duration]);

  return <canvas ref={canvasRef} className="waveform-canvas" />;
}
