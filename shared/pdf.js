// PDF de una página con una imagen JPEG (sin librerías).
const enc = new TextEncoder();

export function pdfDesdeJpeg(jpeg /* Uint8Array */, ancho, alto) {
  // Hoja carta horizontal o vertical según la forma de la imagen.
  const horizontal = ancho >= alto;
  const PW = horizontal ? 792 : 612;
  const PH = horizontal ? 612 : 792;
  const margen = 28;
  const escala = Math.min((PW - margen * 2) / ancho, (PH - margen * 2) / alto);
  const w = ancho * escala;
  const hh = alto * escala;
  const x = (PW - w) / 2;
  const y = (PH - hh) / 2;
  const contenido = `q ${w.toFixed(2)} 0 0 ${hh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`;

  const partes = [];
  const offsets = [];
  let pos = 0;
  const poner = (d) => {
    const b = typeof d === 'string' ? enc.encode(d) : d;
    partes.push(b);
    pos += b.length;
  };
  poner('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const obj = (n, cuerpo) => { offsets[n] = pos; poner(`${n} 0 obj\n${cuerpo}\nendobj\n`); };

  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = pos;
  poner(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${ancho} /Height ${alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  poner(jpeg);
  poner('\nendstream\nendobj\n');
  obj(5, `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);

  const xref = pos;
  let t = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) t += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  t += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  poner(t);
  return new Blob(partes, { type: 'application/pdf' });
}
