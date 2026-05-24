import { jsPDF } from 'jspdf';

export function exportTranscriptionPDF(swaras, { shruti, raga, tala, bpm, title, detectedTonic } = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title || 'EzSwara Transcription', W / 2, y, { align: 'center' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const meta = [
    `Shruti (Sa): ${shruti}`,
    `Raga: ${raga}`,
    `Tala: ${tala}`,
    `BPM: ${bpm}`,
  ];
  if (detectedTonic) meta.push(`Detected: ${detectedTonic.note} (${detectedTonic.hz} Hz)`);
  doc.text(meta.join('    '), W / 2, y, { align: 'center' });
  y += 3;
  doc.setDrawColor(180);
  doc.line(15, y, W - 15, y);
  y += 8;

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text('Swara Sequence:', 15, y);
  y += 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  const sequence = swaras.map(s => s.swara).join('  ');
  const lines = doc.splitTextToSize(sequence, W - 30);
  for (const line of lines) {
    if (y > 275) { doc.addPage(); y = 15; }
    doc.text(line, 15, y);
    y += 4;
  }

  y += 5;
  if (y > 260) { doc.addPage(); y = 15; }
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text('Time       Swara       Duration    Confidence', 15, y);
  y += 1;
  doc.line(15, y, W - 15, y);
  y += 4;

  doc.setFont('courier', 'normal');
  for (const s of swaras) {
    if (y > 280) { doc.addPage(); y = 15; }
    const row = `${s.time.toFixed(2).padStart(7)}s   ${s.swara.padEnd(10)}  ${s.duration.toFixed(3).padStart(6)}s     ${Math.round((s.confidence || 0) * 100)}%`;
    doc.text(row, 15, y);
    y += 3.5;
  }

  return doc;
}

export function exportComposerPDF(avartanams, { shruti, raga, tala, bpm, title } = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title || 'EzSwara Composition', W / 2, y, { align: 'center' });
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Raga: ${raga}    Tala: ${tala}    Shruti: ${shruti}    BPM: ${bpm}`, W / 2, y, { align: 'center' });
  y += 3;
  doc.setDrawColor(180);
  doc.line(15, y, W - 15, y);
  y += 8;

  if (!avartanams.length || !avartanams[0].length) {
    doc.text('(empty composition)', 15, y);
    return doc;
  }

  const cols = avartanams[0].length;
  const cellW = Math.min(25, (W - 40) / cols);
  const cellH = 10;
  const startX = 20;

  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  for (let c = 0; c < cols; c++) {
    doc.text(String(c + 1), startX + c * cellW + cellW / 2, y, { align: 'center' });
  }
  y += 2;
  doc.line(startX, y, startX + cols * cellW, y);
  y += 3;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);

  for (let ri = 0; ri < avartanams.length; ri++) {
    if (y + cellH > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 15;
    }

    const row = avartanams[ri];
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.text(String(ri + 1) + '.', startX - 8, y + cellH / 2 + 1);

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);

    for (let ci = 0; ci < row.length; ci++) {
      const x = startX + ci * cellW;
      doc.setDrawColor(200);
      doc.rect(x, y, cellW, cellH);

      const cell = row[ci];
      const txt = cell.map(sub => {
        if (!sub.swara || sub.swara === '') return '-';
        if (sub.swara === ',') return ',';
        let t = sub.swara;
        if (sub.octave === 1) t = '\u00B7' + t;
        if (sub.octave === -1) t += '\u0323';
        return t;
      }).join(' ');

      doc.text(txt, x + cellW / 2, y + cellH / 2 + 1.5, { align: 'center' });
    }
    y += cellH;
  }

  return doc;
}

export function downloadPDF(doc, filename) {
  doc.save(filename);
}
