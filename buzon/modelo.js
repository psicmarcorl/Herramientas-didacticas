// Reglas y datos compartidos del Buzón de preguntas.
import { crearXlsx } from '../shared/xlsx.js';
import { fechaHora, soloFecha, descargar, nombreArchivo, codigoAleatorio, normalizar, hash32 } from '../shared/ui.js';

// Participaciones permitidas por alumno en cada sesión (deslizador del docente).
export const LIMITE_MIN = 1;
export const LIMITE_MAX = 5; // también fijado en firestore.rules (__1 … __5)
export const LIMITE_INICIAL = 5;

export const MAX_TEXTO = 300;
export const MAX_NOMBRE = 60;
export const MAX_ALUMNOS = 120;

export const rutaBuzon = (c) => `buzones/${c}`;
export const rutaPreguntas = (c) => `buzones/${c}/preguntas`;
export const rutaPregunta = (c, id) => `buzones/${c}/preguntas/${id}`;

// Código corto y fácil de dictar (sin 0/O, 1/I/L).
export const codigoNuevo = () => codigoAleatorio(6, 'ABCDEFGHJKMNPQRSTUVWXYZ23456789');
export const limpiarCodigo = (t) => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const limpiarNombre = (t) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NOMBRE);

// Clave estable de un nombre: «Ana López» y «ana  lopez» cuentan como la misma persona.
export function claveNombre(nombre) {
  const base = normalizar(nombre);
  let k = base.replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '-').slice(0, 50).replace(/-+$/, '');
  if (!k) k = 'n' + hash32(base || String(nombre)).toString(36);
  return k;
}

// Cada participación ocupa un lugar fijo: «ana-lopez__1» … «ana-lopez__5».
// Las reglas de Firestore solo permiten crear lugares vacíos y hasta el límite de la sesión.
export const idPregunta = (nombre, n) => `${claveNombre(nombre)}__${n}`;
export const numeroDe = (p) => Number(String(p.id || '').split('__')[1]) || 0;

export const limiteDe = (b) => Math.min(LIMITE_MAX, Math.max(LIMITE_MIN, Number(b && b.limite) || LIMITE_INICIAL));
export const alumnosDe = (b) => (Array.isArray(b && b.alumnos) ? b.alumnos : []);
export const usaLista = (b) => !!b && b.modoNombre === 'lista' && alumnosDe(b).length > 0;
export const ordenAlfabetico = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' });

// Texto pegado (un nombre por renglón, o la columna copiada de Excel) → lista sin repetidos.
export function listaDesdeTexto(texto) {
  const vistos = new Set();
  const lista = [];
  for (const linea of String(texto || '').split(/\r?\n/)) {
    const n = limpiarNombre(linea.replace(/\t+/g, ' '));
    const k = normalizar(n);
    if (!k || vistos.has(k)) continue;
    vistos.add(k);
    lista.push(n);
    if (lista.length >= MAX_ALUMNOS) break;
  }
  return lista;
}

export const claseTexto = (b) => [b && b.materia, b && b.grupo].filter(Boolean).join(' · ') || 'Clase sin nombre';
export const hora = (ms) => (ms ? (fechaHora(ms).split(', ')[1] || '') : '');
// Una pregunta recién marcada puede no tener hora del servidor todavía: cuenta como la más nueva.
export const horaDe = (p) => (p.ts == null ? Infinity : p.ts);
export const porHora = (a, b) => horaDe(a) - horaDe(b) || String(a.id).localeCompare(String(b.id));

// Conteo de participaciones por alumno (incluye con 0 a quienes están en la lista).
export function resumenParticipacion(b, preguntas) {
  const filas = new Map();
  for (const n of alumnosDe(b)) filas.set(claveNombre(n), { nombre: n, n: 0, anonimas: 0 });
  for (const p of preguntas) {
    const k = claveNombre(p.nombre);
    if (!filas.has(k)) filas.set(k, { nombre: p.nombre, n: 0, anonimas: 0 });
    const f = filas.get(k);
    f.n += 1;
    if (p.anonima) f.anonimas += 1;
  }
  return Array.from(filas.values()).sort((a, b2) => ordenAlfabetico(a.nombre, b2.nombre));
}

export const LOGO_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<rect x="2" y="2" width="60" height="60" rx="16" fill="#0e6e8c"/>
<path d="M14 16h36a5 5 0 0 1 5 5v19a5 5 0 0 1-5 5H30l-10 8v-8h-6a5 5 0 0 1-5-5V21a5 5 0 0 1 5-5z" fill="#fff"/>
<path d="M27 26.5a5 5 0 1 1 7 4.6c-1.3.6-2 1.5-2 2.9v.8" fill="none" stroke="#0e6e8c" stroke-width="3.6" stroke-linecap="round"/>
<circle cx="32" cy="39.5" r="2.3" fill="#0e6e8c"/></svg>`;

const filaPregunta = (b, p) => [
  p.nombre, p.texto, numeroDe(p), p.anonima ? 'Sí' : 'No',
  p.ts ? soloFecha(p.ts) : '', hora(p.ts),
  b.materia || '', b.grupo || '', b.tema || '', p.estado === 'respondida' ? 'Respondida' : 'Pendiente', b.id || ''
];
const ENCABEZADO_PREGUNTAS = ['Nombre', 'Pregunta', 'Núm. de participación', 'Anónima para el grupo', 'Fecha', 'Hora', 'Materia', 'Grupo', 'Tema', 'Estado', 'Código de sesión'];
const ANCHOS_PREGUNTAS = [26, 70, 12, 12, 12, 12, 24, 10, 28, 12, 12];

// Excel de una sesión: preguntas, participación por alumno y datos de la clase.
export function exportarExcel(b, preguntas) {
  const orden = preguntas.slice().sort(porHora);
  const filas = [ENCABEZADO_PREGUNTAS, ...orden.map((p) => filaPregunta(b, p))];
  const resumen = resumenParticipacion(b, orden);
  const lim = limiteDe(b);
  const part = [['Nombre', 'Participaciones', 'Límite de la sesión', 'Anónimas para el grupo']];
  resumen.forEach((r) => part.push([r.nombre, r.n, lim, r.anonimas]));
  const sinParticipar = resumen.filter((r) => r.n === 0).map((r) => r.nombre);
  const datos = [
    ['Dato', 'Valor'],
    ['Materia', b.materia || ''],
    ['Grupo', b.grupo || ''],
    ['Tema', b.tema || ''],
    ['Fecha de la sesión', b.creada ? soloFecha(b.creada) : ''],
    ['Hora de inicio', b.creada ? hora(b.creada) : ''],
    ['Código de sesión', b.id || ''],
    ['Participaciones por alumno', lim],
    ['Cómo se registra el nombre', usaLista(b) ? 'Elegido de la lista del grupo' : 'Escrito por el alumno'],
    ['Total de preguntas', orden.length],
    ['Alumnos que participaron', resumen.filter((r) => r.n > 0).length],
    ['Sin participar (de la lista)', sinParticipar.join(', ')]
  ];
  const blob = crearXlsx([
    { nombre: 'Preguntas', filas, anchos: ANCHOS_PREGUNTAS },
    { nombre: 'Participación', filas: part, anchos: [30, 16, 18, 22] },
    { nombre: 'Sesión', filas: datos, anchos: [30, 60] }
  ]);
  const fecha = soloFecha(b.creada || Date.now()).replace(/\//g, '-');
  descargar(blob, nombreArchivo(`buzon ${b.materia || ''} ${b.grupo || ''} ${fecha}`, 'xlsx'));
}

// Excel acumulado de varias sesiones: todas las preguntas y una tabla alumno × sesión.
// grupos: [{ sesion, preguntas }] ordenados del más antiguo al más reciente.
export function exportarHistorial(grupos, etiqueta) {
  const filas = [ENCABEZADO_PREGUNTAS];
  const alumnos = new Map();
  grupos.forEach(({ sesion, preguntas }, i) => {
    preguntas.slice().sort(porHora).forEach((p) => filas.push(filaPregunta(sesion, p)));
    resumenParticipacion(sesion, preguntas).forEach((r) => {
      const k = claveNombre(r.nombre);
      if (!alumnos.has(k)) alumnos.set(k, { nombre: r.nombre, por: new Array(grupos.length).fill(0) });
      alumnos.get(k).por[i] = r.n;
    });
  });
  const cab = ['Nombre', 'Total', 'Sesiones con participación',
    ...grupos.map(({ sesion }) => `${sesion.creada ? soloFecha(sesion.creada) : ''} ${sesion.tema || sesion.id}`.trim())];
  const tabla = [cab];
  Array.from(alumnos.values()).sort((a, b) => ordenAlfabetico(a.nombre, b.nombre)).forEach((a) => {
    tabla.push([a.nombre, a.por.reduce((x, y) => x + y, 0), a.por.filter((x) => x > 0).length, ...a.por]);
  });
  const blob = crearXlsx([
    { nombre: 'Resumen por alumno', filas: tabla, anchos: [30, 8, 14, ...grupos.map(() => 18)] },
    { nombre: 'Todas las preguntas', filas, anchos: ANCHOS_PREGUNTAS }
  ]);
  descargar(blob, nombreArchivo(`historial buzon ${etiqueta || ''} ${soloFecha(Date.now()).replace(/\//g, '-')}`, 'xlsx'));
}
