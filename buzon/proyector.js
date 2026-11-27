// Buzón de preguntas — vista para proyectar. Requiere sesión docente.
// Las preguntas marcadas como anónimas por el alumno se muestran sin nombre.
import { db } from '../shared/db.js';
import { iniciarDocente } from '../shared/shell.js';
import { h, vaciar, param, enlace, qrSvg } from '../shared/ui.js';
import { LOGO_SVG, rutaBuzon, rutaPreguntas, limpiarCodigo, claseTexto, porHora } from './modelo.js';

const codigo = limpiarCodigo(param('s'));

iniciarDocente({
  raiz: document.getElementById('app'),
  titulo: 'Proyector del Buzón de preguntas',
  subtitulo: 'Inicia sesión para proyectar',
  menu: 'docente.html',
  cabecera: false,
  render: proyector
});

const autor = (p) => (p.anonima ? 'Anónimo' : p.nombre);

function proyector(raiz) {
  if (!codigo) {
    raiz.append(h('div', { class: 'proy-vacio' }, 'Falta el código de la sesión.', h('p', {}, h('a', { href: 'docente.html' }, 'Volver al panel'))));
    return null;
  }
  let sesion = null;
  let preguntas = [];
  const url = enlace(`./?s=${encodeURIComponent(codigo)}`);

  const clase = h('div', { class: 'clase' });
  const tema = h('div', { class: 'tema' });
  const contenido = h('main', { class: 'proy-contenido' });
  const cuenta = h('div', { class: 'proy-cuenta', 'aria-live': 'polite' });
  const pantalla = h('button', {
    class: 'btn btn-chico', type: 'button',
    onclick: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen())
  }, '⛶ Pantalla completa');

  raiz.append(h('div', { class: 'proy' },
    h('header', { class: 'proy-cab' },
      h('span', { class: 'logo-chico', html: LOGO_SVG }),
      h('div', { class: 'proy-titulos' }, clase, tema),
      h('div', { class: 'proy-unete' },
        h('div', {}, h('small', {}, 'Envía tu pregunta'), h('b', {}, codigo)),
        h('div', { class: 'qr', html: qrSvg(url, 96) }))),
    contenido,
    h('footer', { class: 'proy-pie' }, cuenta,
      h('div', { class: 'proy-controles' }, pantalla, h('a', { class: 'btn btn-chico', href: 'docente.html' }, '← Panel')))));

  function pintar() {
    if (!sesion) return;
    clase.textContent = claseTexto(sesion);
    tema.textContent = sesion.tema || '';
    const pendientes = preguntas.filter((p) => p.estado !== 'respondida').sort(porHora);
    cuenta.textContent = `${preguntas.length} ${preguntas.length === 1 ? 'pregunta' : 'preguntas'} · ${pendientes.length} ${pendientes.length === 1 ? 'pendiente' : 'pendientes'}`;
    const destacada = sesion.enPantalla ? preguntas.find((p) => p.id === sesion.enPantalla) : null;
    vaciar(contenido);

    if (destacada) {
      contenido.append(h('article', { class: 'destacada' },
        h('div', { class: 'texto' }, destacada.texto),
        h('div', { class: 'quien' }, `— ${autor(destacada)}`)));
    }
    if (sesion.proyector === 'todas') {
      const resto = pendientes.filter((p) => !destacada || p.id !== destacada.id);
      if (resto.length) {
        contenido.append(h('div', { class: 'tarjetas' }, resto.map((p) => h('article', { class: 'tarj' },
          h('div', { class: 'texto' }, p.texto), h('div', { class: 'quien' }, `— ${autor(p)}`)))));
      }
      if (!destacada && !resto.length) contenido.append(espera());
    } else if (!destacada) {
      contenido.append(espera());
    }
  }

  function espera() {
    return h('div', { class: 'espera' },
      h('div', { class: 'qr', html: qrSvg(url, 300) }),
      h('div', {},
        h('h2', {}, '¿Tienes una duda?'),
        h('p', {}, 'Escanea el código y envía tu pregunta en silencio.'),
        h('p', {}, 'O entra con el código ', h('b', { class: 'codigo' }, codigo)),
        h('p', { class: 'nota-proy' }, 'Puedes pedir que tu pregunta aparezca como anónima.')));
  }

  const alSesion = db.onDoc(rutaBuzon(codigo), (s) => {
    if (!s) {
      vaciar(contenido);
      contenido.append(h('div', { class: 'proy-vacio' }, 'No encontramos esta sesión.', h('p', {}, h('a', { href: 'docente.html' }, 'Volver al panel'))));
      return;
    }
    sesion = s;
    pintar();
  });
  const alPreguntas = db.onCol(rutaPreguntas(codigo), (docs) => {
    preguntas = docs;
    pintar();
  }, () => {
    vaciar(contenido);
    contenido.append(h('div', { class: 'proy-vacio' }, 'No se pudieron leer las preguntas. Revisa tu sesión y las reglas de Firestore.'));
  });
  return () => { alSesion && alSesion(); alPreguntas && alPreguntas(); };
}
