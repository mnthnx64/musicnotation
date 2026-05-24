export function exportNotationAsPNG(svgElement, filename = 'notation.png') {
  if (!svgElement) return;

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#fff';
    ctx.fillRect(0, 0, img.width, img.height);
    ctx.drawImage(img, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');

    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export function captureNotationArea(containerSelector = '.notation-area svg', filename = 'notation.png') {
  const svg = document.querySelector(containerSelector);
  if (svg) exportNotationAsPNG(svg, filename);
}
