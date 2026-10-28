// Reglas y datos compartidos de Boleto de salida.
import { crearXlsx } from '../shared/xlsx.js';
import { fechaHora, soloFecha, descargar, nombreArchivo, codigoAleatorio } from '../shared/ui.js';

export const TIPOS = {
  aprendi: { id: 'aprendi', nombre: 'Algo que aprendí', corto: 'Aprendí', color: '#FFE680' },
  clave: { id: 'clave', nombre: 'Una cuestión clave', corto: 'Cuestión clave', color: '#A9D8F5' },
  duda: { id: 'duda', nombre: 'Una duda', corto: 'Duda', color: '#FFB3C7' }
};
export const ORDEN_TIPOS = ['aprendi', 'clave', 'duda'];

export const LIMITE_MIN = 40;
export const LIMITE_MAX = 300;
export const LIMITE_PASO = 20;

export const IDEAS_RAPIDAS = [
  '¿Qué aprendiste hoy?',
  '¿Qué idea clave te llevas de la clase?',
  '¿Qué duda te quedó?',
  '¿Qué fue lo más útil de la sesión?',
  '¿Cómo aplicarías lo visto hoy?',
  '¿Qué te gustaría profundizar la próxima clase?'
];

export const PREGUNTA_INICIAL = '¿Qué te llevas de la clase de hoy?';

export const rutaSesion = (c) => `sesiones/${c}`;
export const rutaAportes = (c) => `sesiones/${c}/aportes`;

// Código corto y fácil de dictar (sin 0/O, 1/I/L).
export const codigoNuevo = () => codigoAleatorio(6, 'ABCDEFGHJKMNPQRSTUVWXYZ23456789');
export const limpiarCodigo = (t) => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function tiposActivos(s) {
  const t = Array.isArray(s.tipos) && s.tipos.length ? s.tipos : ORDEN_TIPOS;
  return ORDEN_TIPOS.filter((x) => t.includes(x));
}

export const LOGO_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<rect x="3" y="7" width="58" height="50" rx="6" fill="#6B4423"/><rect x="8" y="12" width="48" height="40" rx="3" fill="#C9A26B"/>
<g transform="rotate(-6 24 28)"><rect x="13" y="17" width="19" height="19" fill="#FFE680"/><path d="M16 23h13M16 28h9" stroke="#8a6a00" stroke-width="2" stroke-linecap="round"/></g>
<g transform="rotate(5 42 36)"><rect x="33" y="28" width="17" height="17" fill="#FFB3C7"/><path d="M36 34h11M36 39h7" stroke="#9c3b5a" stroke-width="2" stroke-linecap="round"/></g>
<circle cx="22" cy="17" r="3" fill="#D64545"/><circle cx="41.500" cy="28" r="3" fill="#D64545"/></svg>`;

export const FAVICON = 'data:image/svg+xml,' + encodeURIComponent(LOGO_SVG.replace(/\n/g, ''));

// Exporta los aportes a un .xlsx real (nombre y texto de cada aporte).
export function exportarExcel(sesion, aportes) {
  const orden = aportes.slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const filas = [['Nombre', 'Tipo de aporte', 'Aporte', 'Fecha y hora']];
  orden.forEach((a) => filas.push([a.nombre, (TIPOS[a.tipo] || {}).nombre || a.tipo, a.texto, fechaHora(a.ts)]));
  const resumen = [
    ['Dato', 'Valor'],
    ['Pregunta o reflexión', sesion.pregunta || ''],
    ['Código de sesión', sesion.id || ''],
    ['Fecha de creación', sesion.creada ? fechaHora(sesion.creada) : ''],
    ['Total de aportes', orden.length],
    ...ORDEN_TIPOS.map((t) => [TIPOS[t].nombre, orden.filter((a) => a.tipo === t).length])
  ];
  const blob = crearXlsx([
    { nombre: 'Aportes', filas, anchos: [22, 22, 70, 22] },
    { nombre: 'Sesión', filas: resumen, anchos: [28, 60] }
  ]);
  const fecha = soloFecha(sesion.creada || Date.now()).replace(/\//g, '-');
  descargar(blob, nombreArchivo(`boleto de salida ${fecha} ${sesion.id}`, 'xlsx'));
}
