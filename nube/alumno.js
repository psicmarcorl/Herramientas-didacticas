// Nube de Ideas — vista del alumno (entrar por enlace o QR, responder y ver la nube).
import { db } from '../shared/db.js';
import { h, vaciar, param, normalizar, bannerDemo, fechaHora } from '../shared/ui.js';
import { crearLienzo, agrupar } from '../shared/nube-lienzo.js';
import {
  LIMITES, estadoNube, rutaNube, rutaPublicas, rutaParticipaciones, instruccion, leerMios, guardarMios
} from './modelo.js';

const raiz = document.getElementById('app');
const id = param('n');
bannerDemo();

const LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 46a12 12 0 0 1-1-24 16 16 0 0 1 31 3 10 10 0 0 1-2 21z" fill="currentColor"/><circle cx="26" cy="35" r="3" fill="#fff"/><circle cx="34" cy="35" r="3" fill="#fff"/><circle cx="42" cy="35" r="3" fill="#fff"/></svg>';
const marca = () => h('div', { class: 'nube-marca' }, h('span', { html: LOGO }), 'Nube de Ideas');

function aviso(emoji, titulo, texto, extra) {
  vaciar(raiz);
  raiz.append(h('div', { class: 'nube-pagina' }, marca(),
    h('div', { class: 'nube-aviso' }, h('div', { class: 'emoji' }, emoji), h('h2', {}, titulo), texto ? h('p', {}, texto) : null, extra || null)));
}

if (!id) {
  aviso('🔎', 'No encontramos esta nube', 'Revisa el enlace con tu docente.');
} else {
  iniciar();
}

function iniciar() {
  let nube = null;
  let pantalla = 'entrada'; // 'entrada' | 'nube'
  let estadoPintado = null;
  let lienzo = null;
  let dejarDeEscuchar = null;
  let refs = {};
  let mios = leerMios(id);

  const alCambiarNube = (n) => {
    if (!n) { limpiarNube(); aviso('🔎', 'No encontramos esta nube', 'Revisa el enlace con tu docente.'); nube = null; estadoPintado = 'nada'; return; }
    nube = n;
    if (refs.tema) { refs.tema.textContent = n.tema || ''; refs.tema.classList.toggle('oculto', !n.tema); }
    if (refs.pregunta) refs.pregunta.textContent = n.pregunta || '';
    if (lienzo) lienzo.setPaleta(n.paleta);
    revisar(true);
  };
  db.onDoc(rutaNube(id), alCambiarNube, () => {
    aviso('⚠️', 'No pudimos cargar la nube', 'Revisa tu conexión e inténtalo de nuevo.');
  });
  // Cambios automáticos Programada → Abierta → Cerrada
  setInterval(() => revisar(false), 4000);

  function limpiarNube() {
    if (dejarDeEscuchar) { dejarDeEscuchar(); dejarDeEscuchar = null; }
    if (lienzo) { lienzo.destruir(); lienzo = null; }
  }

  function revisar(forzar) {
    if (!nube) return;
    const est = estadoNube(nube);
    const clave = `${pantalla}:${est}`;
    if (clave === estadoPintado) return;
    estadoPintado = clave;
    limpiarNube();
    refs = {};
    if (pantalla === 'nube') return verNube(est);
    if (est === 'programada') return pantallaProgramada();
    if (est === 'cerrada') { pantalla = 'nube'; estadoPintado = `nube:${est}`; return verNube(est); }
    return pantallaEntrada();
  }

  function pantallaProgramada() {
    aviso('⏳', 'Esta nube todavía no abre',
      nube.abreEn ? `Se abrirá el ${fechaHora(nube.abreEn)} Vuelve en ese momento con este mismo enlace.` : 'Vuelve más tarde con este mismo enlace.');
  }

  /* ───── Entrada: nombre + respuestas ───── */
  function pantallaEntrada(mensajeCierre) {
    vaciar(raiz);
    const cant = Math.max(1, Math.min(10, Number(nube.cantidad) || 1));
    const frase = nube.formato === 'frase';
    const limite = frase ? LIMITES.frase : LIMITES.palabra;
    const unidad = frase ? 'frase' : 'palabra';

    refs.tema = h('span', { class: nube.tema ? 'nube-chip' : 'nube-chip oculto' }, nube.tema || '');
    refs.pregunta = h('h1', { class: 'nube-pregunta' }, nube.pregunta || '');
    const error = h('p', { class: 'error', role: 'alert' });
    const progreso = cant > 1 ? h('p', { class: 'nube-progreso', 'aria-live': 'polite' }, `0 de ${cant}`) : null;

    const inputNombre = nube.pideNombre
      ? h('input', { type: 'text', id: 'nombre', maxlength: '30', autocomplete: 'given-name', placeholder: 'Tu primer nombre' }) : null;

    const campos = [];
    for (let i = 0; i < cant; i++) {
      const input = h('input', {
        type: 'text', autocomplete: 'off', autocapitalize: 'sentences', enterkeyhint: i === cant - 1 ? 'done' : 'next',
        'aria-label': cant > 1 ? `Respuesta ${i + 1} de ${cant}` : 'Tu respuesta',
        placeholder: cant > 1 ? `${frase ? 'Frase' : 'Palabra'} ${i + 1}` : (frase ? 'Escribe tu frase' : 'Escribe tu palabra')
      });
      const cuenta = h('span', { class: 'cuenta' }, `0/${limite}`);
      input.addEventListener('input', () => {
        const n = input.value.trim().length;
        cuenta.textContent = `${n}/${limite}`;
        const sobra = n > limite;
        cuenta.classList.toggle('excede', sobra);
        input.classList.toggle('excede', sobra);
        if (progreso) progreso.textContent = `${campos.filter((c) => c.input.value.trim()).length} de ${cant}`;
        error.textContent = sobra ? `Máximo ${limite} caracteres por ${unidad}. Acórtala un poco.` : '';
      });
      campos.push({ input, cuenta, caja: h('div', { class: 'nube-campo' }, input, cuenta) });
    }

    const boton = h('button', { class: 'btn btn-primario btn-grande', type: 'submit' }, 'Continuar');
    const form = h('form', { class: 'nube-form', novalidate: true, onsubmit: enviar },
      inputNombre ? [h('label', { for: 'nombre' }, 'Tu primer nombre'), inputNombre] : null,
      h('label', { class: 'solo-lectores' }, 'Respuestas'),
      progreso, campos.map((c) => c.caja), error, boton);

    async function enviar(e) {
      e.preventDefault();
      error.textContent = '';
      const nombre = inputNombre ? inputNombre.value.trim().replace(/\s+/g, ' ') : '';
      if (inputNombre && !nombre) { error.textContent = 'Escribe tu primer nombre para continuar'; inputNombre.focus(); return; }
      const textos = campos.map((c) => c.input.value.trim().replace(/\s+/g, ' ')).filter(Boolean);
      if (!textos.length) { error.textContent = 'Escribe tu respuesta para continuar'; campos[0].input.focus(); return; }
      const larga = textos.find((t) => t.length > limite);
      if (larga) { error.textContent = `Máximo ${limite} caracteres por ${unidad}. Acórtala un poco.`; return; }

      boton.disabled = true;
      boton.textContent = 'Enviando…';
      try {
        // Verificación del estado justo antes de guardar (también la hacen las reglas del servidor).
        const fresca = await db.get(rutaNube(id));
        if (!fresca || estadoNube(fresca) !== 'abierta') {
          nube = fresca || nube;
          return pantallaCerradaAlEnviar();
        }
        const items = [];
        const claves = [];
        for (const t of textos) {
          const k = normalizar(t);
          if (!k) continue;
          claves.push(k);
          items.push({ col: rutaPublicas(id), datos: { k, t, ts: db.TS } });
          if (nube.pideNombre) items.push({ col: rutaParticipaciones(id), datos: { nombre, t, k, ts: db.TS } });
        }
        if (!items.length) { error.textContent = 'Escribe tu respuesta para continuar'; boton.disabled = false; boton.textContent = 'Continuar'; return; }
        await db.addMany(items);
        mios = guardarMios(id, claves);
        pantalla = 'nube';
        estadoPintado = `nube:${estadoNube(nube)}`;
        verNube(estadoNube(nube), true);
      } catch (err) {
        boton.disabled = false;
        boton.textContent = 'Continuar';
        const cerrada = err && (err.code === 'permission-denied');
        error.textContent = cerrada
          ? 'Esta nube ya cerró y no recibió tu respuesta.'
          : 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.';
      }
    }

    raiz.append(h('div', { class: 'nube-pagina' }, marca(), refs.tema, refs.pregunta,
      h('p', { class: 'nube-instruc' }, instruccion(nube), frase ? ' (máx. 60 caracteres cada una).' : ' (máx. 25 caracteres cada una).'),
      mensajeCierre ? h('p', { class: 'nube-banner' }, mensajeCierre) : null,
      form));
    (inputNombre || campos[0].input).focus({ preventScroll: true });
  }

  function pantallaCerradaAlEnviar() {
    vaciar(raiz);
    aviso('🔒', 'Esta nube ya cerró y no recibió tu respuesta.', null,
      h('button', { class: 'btn btn-primario', type: 'button', onclick: () => { pantalla = 'nube'; estadoPintado = null; revisar(true); } }, 'Ver la nube'));
  }

  /* ───── La nube ───── */
  function verNube(est, conGracias) {
    vaciar(raiz);
    refs.tema = h('span', { class: nube.tema ? 'nube-chip' : 'nube-chip oculto' }, nube.tema || '');
    refs.pregunta = h('h1', { class: 'nube-pregunta' }, nube.pregunta || '');
    const caja = h('div', { class: 'nube-lienzo-caja' });
    const proyector = h('a', { class: 'btn btn-suave btn-chico', href: `proyector.html?n=${encodeURIComponent(id)}` }, '🖥️ Modo proyector');
    raiz.append(h('div', { class: 'nube-pantalla' },
      h('div', { class: 'nube-pantalla-cab' }, h('div', {}, refs.tema, refs.pregunta), proyector),
      est === 'cerrada' ? h('p', { class: 'nube-banner' }, 'Esta nube está cerrada. Puedes consultar la nube, pero ya no recibe respuestas.') : null,
      caja,
      h('div', { class: 'nube-pie' }, h('span', { class: 'nota' }, 'Toca una palabra para ver cuántas veces se repite.'))));
    lienzo = crearLienzo(caja, { paleta: nube.paleta, mios });
    dejarDeEscuchar = db.onCol(rutaPublicas(id), (docs) => lienzo && lienzo.actualizar(agrupar(docs)), () => {
      caja.append(h('p', { class: 'nube-banner' }, 'No pudimos actualizar la nube. Revisa tu conexión.'));
    });
    if (conGracias) {
      const g = h('div', { class: 'nube-gracias', role: 'status' }, '¡Gracias por participar!');
      caja.append(g);
      setTimeout(() => g.classList.add('sale'), 3200);
      setTimeout(() => g.remove(), 3800);
    }
  }
}
