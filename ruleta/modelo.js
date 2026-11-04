// Reglas y datos compartidos de la Ruleta de participación.
import { crearXlsx } from '../shared/xlsx.js';
import { h, fechaHora, soloFecha, descargar, nombreArchivo, codigoAleatorio, normalizar, dialogo } from '../shared/ui.js';

export const RESULTADOS = {
  participo: { id: 'participo', nombre: 'Participó', color: '#1f8a5b', fondo: '#dcf5e8' },
  noresp: { id: 'noresp', nombre: 'No respondió', color: '#9a6200', fondo: '#fff0c9' }
};

export const MODOS = {
  ronda: {
    id: 'ronda',
    nombre: 'Sin repetir (recomendado)',
    detalle: 'Cada alumno sale una sola vez por ronda. Cuando pasan todos, empieza una ronda nueva.'
  },
  azar: {
    id: 'azar',
    nombre: 'Al azar',
    detalle: 'Cualquiera puede volver a salir, pero nunca la misma persona dos veces seguidas.'
  }
};

// Colores de los gajos: vivos y con buen contraste con texto oscuro o blanco.
export const COLORES = [
  { f: '#6a3fb5', t: '#fff' }, { f: '#f2b705', t: '#2a1f00' }, { f: '#e4572e', t: '#fff' },
  { f: '#17a398', t: '#fff' }, { f: '#ff8fab', t: '#3a0d1a' }, { f: '#2f5de0', t: '#fff' },
  { f: '#8bd450', t: '#163300' }, { f: '#c2185b', t: '#fff' }
];

export const MAX_ALUMNOS = 120;
export const MAX_NOMBRE = 60;

export const rutaRuleta = (id) => `ruletas/${id}`;
export const rutaTurnos = (id) => `ruletas/${id}/turnos`;
export const idNuevo = () => codigoAleatorio(14);

// Día de hoy (hora de México) para el pase de lista.
export const hoy = () => soloFecha(Date.now());

export const alumnosDe = (r) => (Array.isArray(r && r.alumnos) ? r.alumnos : []);

export function ausentesHoy(r) {
  const a = r && r.ausentes;
  return a && a.dia === hoy() && Array.isArray(a.ids) ? new Set(a.ids) : new Set();
}

export function presentes(r) {
  const aus = ausentesHoy(r);
  return alumnosDe(r).filter((a) => !aus.has(a.id));
}

// Alumnos que ya cuentan como "pasaron" en la ronda actual.
export function yaPasaron(r, turnos) {
  const ronda = r.ronda || 1;
  const s = new Set();
  for (const t of turnos) {
    if ((t.ronda || 1) !== ronda) continue;
    if (t.r === 'noresp' && r.noRespVuelve) continue;
    s.add(t.a);
  }
  return s;
}

// Último turno registrado (para no repetir a la misma persona dos veces seguidas en modo azar).
// Un turno recién guardado puede no tener hora del servidor todavía: cuenta como el más nuevo.
export const horaDe = (t) => (t.ts == null ? Infinity : t.ts);
export const masNuevoPrimero = (a, b) => horaDe(b) - horaDe(a) || String(b.id).localeCompare(String(a.id));

export function ultimoTurno(turnos) {
  let u = null;
  for (const t of turnos) if (!u || horaDe(t) > horaDe(u)) u = t;
  return u;
}

// Quiénes están en la ruleta ahora mismo.
export function candidatos(r, turnos) {
  const p = presentes(r);
  if (r.modo === 'azar') {
    const u = ultimoTurno(turnos);
    if (u && p.length > 1) return p.filter((a) => a.id !== u.a);
    return p;
  }
  const ya = yaPasaron(r, turnos);
  return p.filter((a) => !ya.has(a.id));
}

// Número aleatorio seguro en [0, n).
export function azar(n) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return Math.floor((a[0] / 4294967296) * n);
}

// Convierte el texto pegado (un nombre por renglón) en la lista de alumnos.
// Conserva el identificador de quien ya estaba, para no perder su historial.
export function listaDesdeTexto(texto, anteriores = []) {
  const previos = new Map(anteriores.map((a) => [normalizar(a.n), a]));
  const vistos = new Set();
  const lista = [];
  for (const linea of String(texto).split(/\r?\n/)) {
    const n = linea.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NOMBRE);
    const k = normalizar(n);
    if (!k || vistos.has(k)) continue;
    vistos.add(k);
    const prev = previos.get(k);
    lista.push({ id: prev ? prev.id : codigoAleatorio(8), n });
    if (lista.length >= MAX_ALUMNOS) break;
  }
  return lista;
}

// Conteos por alumno a partir del historial.
export function resumen(r, turnos) {
  const filas = new Map(alumnosDe(r).map((a) => [a.id, { id: a.id, n: a.n, veces: 0, participo: 0, noresp: 0, ultimo: 0 }]));
  for (const t of turnos) {
    let f = filas.get(t.a);
    if (!f) { f = { id: t.a, n: `${t.n} (ya no está en la lista)`, veces: 0, participo: 0, noresp: 0, ultimo: 0 }; filas.set(t.a, f); }
    f.veces += 1;
    if (t.r === 'participo') f.participo += 1;
    if (t.r === 'noresp') f.noresp += 1;
    f.ultimo = Math.max(f.ultimo, t.ts || 0);
  }
  return Array.from(filas.values()).sort((a, b) => a.n.localeCompare(b.n, 'es'));
}

export function exportarExcel(r, turnos) {
  const filasRes = [['Alumno', 'Veces que salió', 'Participó', 'No respondió', 'Última vez']];
  resumen(r, turnos).forEach((f) => filasRes.push([f.n, f.veces, f.participo, f.noresp, f.ultimo ? fechaHora(f.ultimo) : '']));
  const orden = turnos.slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const filasHist = [['Fecha y hora', 'Alumno', 'Resultado', 'Ronda']];
  orden.forEach((t) => filasHist.push([fechaHora(t.ts), t.n, (RESULTADOS[t.r] || {}).nombre || t.r, t.ronda || 1]));
  const aus = ausentesHoy(r);
  const filasGrupo = [['Alumno', `Asistencia ${hoy()}`]];
  alumnosDe(r).forEach((a) => filasGrupo.push([a.n, aus.has(a.id) ? 'Ausente' : 'Presente']));
  const blob = crearXlsx([
    { nombre: 'Resumen', filas: filasRes, anchos: [38, 16, 12, 14, 22] },
    { nombre: 'Historial', filas: filasHist, anchos: [22, 38, 16, 8] },
    { nombre: 'Grupo', filas: filasGrupo, anchos: [38, 22] }
  ]);
  descargar(blob, nombreArchivo(`participacion ${r.nombre || 'grupo'} ${hoy().replace(/\//g, '-')}`, 'xlsx'));
}

// Pase de lista: devuelve la nueva lista de ausentes de hoy, o null si se cancela.
export async function paseDeLista(r) {
  const aus = ausentesHoy(r);
  const casillas = alumnosDe(r).map((a) => {
    const c = h('input', { type: 'checkbox', checked: !aus.has(a.id) });
    c.dataset.id = a.id;
    return h('label', { class: 'lista-item' }, c, h('span', {}, a.n));
  });
  const marcar = (v) => casillas.forEach((l) => { l.querySelector('input').checked = v; });
  const cuerpo = h('div', {},
    h('p', { class: 'nota' }, `Desmarca a quien no vino hoy (${hoy()}). Quienes falten no aparecerán en la ruleta. Mañana todos vuelven a contar como presentes.`),
    h('div', { class: 'fila', style: { marginBottom: '.6em' } },
      h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => marcar(true) }, 'Todos presentes'),
      h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => marcar(false) }, 'Ninguno')),
    casillas.length ? h('div', { class: 'lista-pase' }, casillas) : h('p', {}, 'Este grupo todavía no tiene alumnos.'));
  const ok = await dialogo({
    titulo: 'Pase de lista de hoy', cuerpo,
    botones: [{ texto: 'Cancelar', valor: false, clase: 'btn-suave' }, { texto: 'Guardar', valor: true, clase: 'btn-primario' }]
  });
  if (!ok) return null;
  return casillas.map((l) => l.querySelector('input')).filter((c) => !c.checked).map((c) => c.dataset.id);
}

export const LOGO_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<circle cx="32" cy="34" r="27" fill="#2a1a4a"/>
<path d="M32 34L32 9A25 25 0 0 1 53.7 21.5Z" fill="#6a3fb5"/><path d="M32 34L53.7 21.5A25 25 0 0 1 53.7 46.5Z" fill="#f2b705"/>
<path d="M32 34L53.7 46.5A25 25 0 0 1 32 59Z" fill="#e4572e"/><path d="M32 34L32 59A25 25 0 0 1 10.3 46.5Z" fill="#17a398"/>
<path d="M32 34L10.3 46.5A25 25 0 0 1 10.3 21.5Z" fill="#ff8fab"/><path d="M32 34L10.3 21.5A25 25 0 0 1 32 9Z" fill="#2f5de0"/>
<circle cx="32" cy="34" r="6" fill="#fff"/><path d="M25 2h14l-7 11z" fill="#fff" stroke="#2a1a4a" stroke-width="2" stroke-linejoin="round"/></svg>`;
