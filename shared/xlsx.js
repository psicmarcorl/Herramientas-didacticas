// Generador mínimo de archivos .xlsx (sin librerías): ZIP sin compresión + XML de hoja.
const enc = new TextEncoder();

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const u16 = (n) => [n & 255, (n >>> 8) & 255];
const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

function zip(archivos) {
  const partes = [];
  const central = [];
  let pos = 0;
  for (const a of archivos) {
    const nombre = enc.encode(a.nombre);
    const datos = typeof a.datos === 'string' ? enc.encode(a.datos) : a.datos;
    const crc = crc32(datos);
    const cab = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(datos.length), ...u32(datos.length), ...u16(nombre.length), ...u16(0)
    ]);
    partes.push(cab, nombre, datos);
    central.push({ nombre, crc, tam: datos.length, pos });
    pos += cab.length + nombre.length + datos.length;
  }
  const inicioCentral = pos;
  for (const c of central) {
    const reg = new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
      ...u32(c.crc), ...u32(c.tam), ...u32(c.tam), ...u16(c.nombre.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(c.pos)
    ]);
    partes.push(reg, c.nombre);
    pos += reg.length + c.nombre.length;
  }
  const fin = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length),
    ...u32(pos - inicioCentral), ...u32(inicioCentral), ...u16(0)
  ]);
  partes.push(fin);
  return new Blob(partes, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const esc = (s) => String(s ?? '')
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function letra(i) {
  let s = '';
  i += 1;
  while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); }
  return s;
}

function xmlHoja(filas, anchos) {
  const cols = anchos && anchos.length
    ? `<cols>${anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const datos = filas.map((fila, r) => {
    const celdas = fila.map((v, c) => {
      const ref = letra(c) + (r + 1);
      const estilo = r === 0 ? ' s="1"' : ' s="2"';
      if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${estilo}><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"${estilo}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${celdas}</row>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${datos}</sheetData></worksheet>`;
}

// hojas: [{nombre, filas:[[...]], anchos:[...]}]  (la primera fila es el encabezado)
export function crearXlsx(hojas) {
  const n = hojas.length;
  const nombres = hojas.map((x) => esc(x.nombre.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)));
  const archivos = [
    {
      nombre: '[Content_Types].xml',
      datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
    },
    {
      nombre: '_rels/.rels',
      datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    },
    {
      nombre: 'xl/workbook.xml',
      datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nombres.map((nm, i) => `<sheet name="${nm}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`
    },
    {
      nombre: 'xl/_rels/workbook.xml.rels',
      datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
    },
    {
      nombre: 'xl/styles.xml',
      datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F3864"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
    },
    ...hojas.map((x, i) => ({ nombre: `xl/worksheets/sheet${i + 1}.xml`, datos: xmlHoja(x.filas, x.anchos) }))
  ];
  return zip(archivos);
}
