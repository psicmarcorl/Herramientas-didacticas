// Boleto de salida — tablero de corcho en vivo (para proyectar). Requiere sesión docente.
import { db } from '../shared/db.js';
import { iniciarDocente } from '../shared/shell.js';
import { h, vaciar, param, hash32 } from '../shared/ui.js';
import { TIPOS, ORDEN_TIPOS, rutaSesion, rutaAportes, limpiarCodigo, tiposActivos } from './modelo.js';

const codigo = limpiarCodigo(param('s'));

iniciarDocente({
  raiz: document.getElementById('app'),
  titulo: 'Tablero de corcho',
  subtitulo: 'Inicia sesión para presentar el tablero',
  menu: 'docente.html',
  cabecera: false,
  render: tablero
});

function tablero(raiz) {
  if (!codigo) {
    raiz.append(h('div', { class: 'tablero-vacio', style: { color: '#fff' } }, 'Falta el código de la sesión.'));
    return null;
  }
  let sesion = null;
  let aportes = [];
  let visibles = new Set(ORDEN_TIPOS);
  const nodos = new Map();
  let primeraCarga = true;

  const pregunta = h('div', {}, '');
  const leyenda = h('div', { class: 'leyenda' });
  const notas = h('div', { class: 'notas' });
  const vacio = h('div', { class: 'tablero-vacio' }, 'Esperando los primeros aportes…');
  const superficie = h('div', { class: 'superficie' }, notas, vacio);
  const cuenta = h('div', { class: 'tablero-cuenta', 'aria-live': 'polite' }, '0 aportes');
  const pantalla = h('button', {
    class: 'btn btn-chico', type: 'button',
    onclick: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen())
  }, '⛶ Pantalla completa');
  const volver = h('a', { class: 'btn btn-chico', href: 'docente.html' }, '← Panel');

  raiz.append(h('div', { class: 'marco' },
    h('div', { class: 'tablero-cab' }, h('div', { class: 'nota-papel' }, h('span', { class: 'chincheta' }), pregunta)),
    leyenda, superficie, cuenta, h('div', { class: 'tablero-controles' }, pantalla, volver)));

  function pintarLeyenda() {
    vaciar(leyenda);
    if (!sesion) return;
    for (const id of tiposActivos(sesion)) {
      const n = aportes.filter((a) => a.tipo === id).length;
      leyenda.append(h('button', {
        type: 'button', style: { background: TIPOS[id].color }, 'aria-pressed': String(visibles.has(id)),
        onclick: () => { visibles.has(id) ? visibles.delete(id) : visibles.add(id); pintarLeyenda(); pintarNotas(); }
      }, `${TIPOS[id].corto} · ${n}`));
    }
  }

  function pintarNotas() {
    const orden = aportes.slice().sort((a, b) => (a.ts || 0) - (b.ts || 0) || a.id.localeCompare(b.id));
    const mostrar = orden.filter((a) => visibles.has(a.tipo));
    // Tamaño de nota según cantidad, para que quepan más cuando hay muchas.
    const ancho = mostrar.length <= 12 ? 250 : mostrar.length <= 30 ? 205 : mostrar.length <= 60 ? 170 : 145;
    notas.style.setProperty('--ancho', `${ancho}px`);
    vacio.classList.toggle('oculto', mostrar.length > 0);
    cuenta.textContent = `${aportes.length} ${aportes.length === 1 ? 'aporte' : 'aportes'}`;

    const vivos = new Set();
    let nuevo = false;
    mostrar.forEach((a) => {
      vivos.add(a.id);
      let el = nodos.get(a.id);
      if (!el) {
        const giro = ((hash32(a.id) % 700) / 100 - 3.5).toFixed(2);
        el = h('article', { class: 'post', style: { background: (TIPOS[a.tipo] || TIPOS.aprendi).color, '--giro': `${giro}deg` } },
          h('span', { class: 'chincheta' }), h('div', { class: 'texto' }, a.texto), h('div', { class: 'quien' }, `— ${a.nombre}`));
        if (primeraCarga) el.style.animation = 'none';
        nodos.set(a.id, el);
        nuevo = true;
      }
      notas.append(el); // reordena sin recrear (mantiene la animación ya hecha)
    });
    for (const [id, el] of nodos) {
      if (!vivos.has(id)) { el.remove(); nodos.delete(id); }
    }
    primeraCarga = false;
    if (nuevo) {
      const cercaDelFinal = superficie.scrollHeight - superficie.scrollTop - superficie.clientHeight < 260;
      if (cercaDelFinal) requestAnimationFrame(() => superficie.scrollTo({ top: superficie.scrollHeight, behavior: 'smooth' }));
    }
  }

  const alSesion = db.onDoc(rutaSesion(codigo), (s) => {
    if (!s) { vaciar(raiz); raiz.append(h('div', { class: 'tablero-vacio', style: { color: '#fff' } }, 'No encontramos esta sesión.', h('p', {}, h('a', { href: 'docente.html', style: { color: '#fff' } }, 'Volver al panel')))); return; }
    sesion = s;
    pregunta.textContent = s.pregunta || '';
    pintarLeyenda();
  });
  const alAportes = db.onCol(rutaAportes(codigo), (docs) => {
    aportes = docs;
    pintarLeyenda();
    pintarNotas();
  }, () => {
    vacio.textContent = 'No se pudieron leer los aportes. Revisa tu sesión y las reglas de Firestore.';
    vacio.classList.remove('oculto');
  });
  return () => { alSesion && alSesion(); alAportes && alAportes(); };
}
