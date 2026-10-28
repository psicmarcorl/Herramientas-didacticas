// Nube de Ideas — modo proyector: solo la pregunta y la nube, a pantalla completa y sin menús.
import { db } from '../shared/db.js';
import { h, vaciar, param } from '../shared/ui.js';
import { crearLienzo, agrupar } from '../shared/nube-lienzo.js';
import { rutaNube, rutaPublicas } from './modelo.js';

const raiz = document.getElementById('app');
const id = param('n');

if (!id) {
  raiz.append(h('p', { class: 'nube-banner', style: { margin: '2rem' } }, 'No encontramos esta nube. Revisa el enlace con tu docente.'));
} else {
  const pregunta = h('h1', { class: 'nube-pregunta' }, '');
  const caja = h('div', { class: 'nube-lienzo-caja' });
  const volver = h('a', { class: 'btn btn-chico', href: `index.html?n=${encodeURIComponent(id)}` }, '✕ Salir');
  const pantalla = h('button', {
    class: 'btn btn-chico', type: 'button',
    onclick: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen())
  }, '⛶ Pantalla completa');
  raiz.append(h('div', { class: 'proy' }, h('div', { class: 'proy-controles' }, pantalla, volver), pregunta, caja));

  let lienzo = null;
  let paletaActual = null;
  db.onDoc(rutaNube(id), (n) => {
    if (!n) { vaciar(raiz); raiz.append(h('p', { class: 'nube-banner', style: { margin: '2rem' } }, 'No encontramos esta nube. Revisa el enlace con tu docente.')); return; }
    pregunta.textContent = n.pregunta || '';
    if (!lienzo) {
      lienzo = crearLienzo(caja, { paleta: n.paleta });
      db.onCol(rutaPublicas(id), (docs) => lienzo.actualizar(agrupar(docs)));
    } else if (paletaActual !== n.paleta) {
      lienzo.setPaleta(n.paleta);
    }
    paletaActual = n.paleta;
  });
}
