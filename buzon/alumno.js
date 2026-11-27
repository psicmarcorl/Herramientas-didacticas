// Buzón de preguntas — vista del alumno (código o QR, nombre, pregunta y anonimato).
import { db, modoDemo } from '../shared/db.js';
import { h, vaciar, param, bannerDemo } from '../shared/ui.js';
import {
  LOGO_SVG, MAX_TEXTO, rutaBuzon, rutaPregunta, idPregunta, claveNombre, limpiarCodigo, limpiarNombre,
  limiteDe, alumnosDe, usaLista, ordenAlfabetico, claseTexto
} from './modelo.js';

const raiz = document.getElementById('app');
bannerDemo();
const codigo = limpiarCodigo(param('s'));

/* ───────── Almacenamiento del dispositivo (solo comodidad) ───────── */
const leerLocal = (k, def) => { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } };
const guardarLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
// Lo que este dispositivo sabe de las participaciones de un nombre en esta sesión.
const claveMias = (nombre) => `buzon:${codigo}:${claveNombre(nombre)}`;
const misDatos = (nombre) => leerLocal(claveMias(nombre), { usadas: 0, mias: [] });

/* ───────── Inicio: escribir el código ───────── */
function inicio(mensaje) {
  vaciar(raiz);
  const error = h('p', { class: 'error', role: 'alert' }, mensaje || '');
  const campo = h('input', {
    type: 'text', id: 'cod', maxlength: '8', autocomplete: 'off', autocapitalize: 'characters', placeholder: 'ABC123', 'aria-label': 'Código de la sesión'
  });
  const form = h('form', {
    novalidate: true,
    onsubmit: (e) => {
      e.preventDefault();
      const c = limpiarCodigo(campo.value);
      if (!c) { error.textContent = 'Escribe el código que te dio tu docente.'; return; }
      location.href = `?s=${encodeURIComponent(c)}`;
    }
  }, h('label', { for: 'cod' }, 'Código de la sesión'), campo, error,
  h('button', { class: 'btn btn-primario btn-grande', type: 'submit' }, 'Entrar'));
  raiz.append(
    h('a', { class: 'acceso-esquina', href: 'docente.html' }, 'Acceso docente'),
    h('div', { class: 'inicio' }, h('div', { class: 'inicio-caja' },
      h('span', { class: 'logo', html: LOGO_SVG }),
      h('h1', {}, 'Buzón de preguntas'),
      h('p', { class: 'sub', style: { marginBottom: '1rem' } }, 'Escanea el QR de tu docente o escribe el código.'),
      form)));
}

function aviso(emoji, titulo, texto) {
  vaciar(raiz);
  raiz.append(h('div', { class: 'inicio' }, h('div', { class: 'inicio-caja' },
    h('span', { class: 'logo', html: LOGO_SVG }),
    h('div', { class: 'tarjeta' }, h('div', { style: { fontSize: '2.4rem' } }, emoji), h('h2', {}, titulo), h('p', {}, texto)),
    h('p', {}, h('a', { href: './' }, 'Escribir otro código')))));
}

/* ───────── Sesión ───────── */
function sesion() {
  let datos = null;
  let pintado = '';
  let pantalla = 'form'; // 'form' | 'listo'
  const firmaDe = (b) => JSON.stringify([b.abierta, b.materia, b.grupo, b.tema, limiteDe(b), usaLista(b), alumnosDe(b)]);
  const borrador = { nombre: leerLocal('buzon:nombre', ''), texto: '', anonima: false };

  db.onDoc(rutaBuzon(codigo), (b) => {
    datos = b ? { id: codigo, ...b } : null;
    if (!b) { pintado = 'nada'; return aviso('🔎', 'No encontramos esta sesión', 'Revisa el código con tu docente.'); }
    if (pantalla === 'listo') return;
    // Solo se repinta si cambió algo que el alumno ve (conserva lo que está escribiendo).
    const firma = firmaDe(b);
    if (firma === pintado) return;
    pintado = firma;
    if (!b.abierta) return aviso('🔒', 'Esta sesión está cerrada', 'Ya no recibe preguntas. Si necesitas participar, coméntalo con tu docente.');
    formulario();
  }, () => aviso('⚠️', 'No pudimos cargar la sesión', 'Revisa tu conexión e inténtalo de nuevo.'));

  function cabecera() {
    return h('header', { class: 'alumno-cab' },
      h('span', { class: 'logo-chico', html: LOGO_SVG }),
      h('div', {},
        h('div', { class: 'clase' }, claseTexto(datos)),
        datos.tema ? h('div', { class: 'tema' }, datos.tema) : null));
  }

  function puntos(usadas, limite) {
    const quedan = Math.max(0, limite - usadas);
    return h('div', { class: 'medidor', 'aria-live': 'polite' },
      h('span', { class: 'puntos', 'aria-hidden': 'true' },
        Array.from({ length: limite }, (_, i) => h('span', { class: `punto${i < Math.min(usadas, limite) ? ' lleno' : ''}` }))),
      h('span', {}, quedan === 0 ? 'Ya usaste todas tus participaciones'
        : `Te ${quedan === 1 ? 'queda' : 'quedan'} ${quedan} de ${limite}`));
  }

  function formulario() {
    vaciar(raiz);
    const limite = limiteDe(datos);
    const lista = usaLista(datos);
    const error = h('p', { class: 'error', role: 'alert' });
    const contMedidor = h('div');
    const contMias = h('div');

    // Nombre: escrito o elegido de la lista que cargó el docente.
    let campoNombre;
    if (lista) {
      const nombres = alumnosDe(datos).slice().sort(ordenAlfabetico);
      if (!nombres.includes(borrador.nombre)) borrador.nombre = '';
      campoNombre = h('select', { id: 'nombre', onchange: (e) => { borrador.nombre = e.target.value; refrescar(); } },
        h('option', { value: '' }, 'Elige tu nombre…'),
        nombres.map((n) => h('option', { value: n, selected: n === borrador.nombre }, n)));
    } else {
      campoNombre = h('input', {
        type: 'text', id: 'nombre', maxlength: '60', autocomplete: 'name', placeholder: 'Nombre y apellido', value: borrador.nombre,
        oninput: (e) => { borrador.nombre = e.target.value; refrescar(); }
      });
    }

    const texto = h('textarea', {
      id: 'texto', rows: '5', maxlength: String(MAX_TEXTO + 50), placeholder: 'Escribe aquí tu pregunta…', 'aria-describedby': 'contador',
      oninput: () => { borrador.texto = texto.value; contar(); }
    });
    texto.value = borrador.texto;
    const contador = h('div', { class: 'contador', id: 'contador' });
    const contar = () => {
      const n = texto.value.length;
      contador.textContent = `${n} / ${MAX_TEXTO}`;
      contador.classList.toggle('excede', n > MAX_TEXTO);
    };
    contar();

    const anonima = h('input', { type: 'checkbox', id: 'anonima', checked: borrador.anonima, onchange: (e) => { borrador.anonima = e.target.checked; } });
    const boton = h('button', { class: 'btn btn-primario btn-grande', type: 'submit' }, 'Enviar pregunta');

    function refrescar() {
      const nombre = limpiarNombre(borrador.nombre);
      const yo = nombre ? misDatos(nombre) : { usadas: 0, mias: [] };
      vaciar(contMedidor).append(puntos(yo.usadas, limite));
      const lleno = !!nombre && yo.usadas >= limite;
      texto.disabled = lleno;
      boton.disabled = lleno;
      vaciar(contMias);
      if (yo.mias.length) {
        contMias.append(h('div', { class: 'mias' },
          h('h3', {}, 'Tus preguntas en esta clase'),
          h('ol', {}, yo.mias.map((m) => h('li', {}, m.texto, m.anonima ? h('span', { class: 'badge anonima' }, 'Anónima para el grupo') : null)))));
      }
    }

    const form = h('form', {
      class: 'caja-form', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        error.textContent = '';
        const nombre = limpiarNombre(borrador.nombre);
        const t = texto.value.trim();
        if (!nombre) { error.textContent = lista ? 'Elige tu nombre de la lista.' : 'Escribe tu nombre para que cuente tu participación.'; campoNombre.focus(); return; }
        if (!t) { error.textContent = 'Escribe tu pregunta.'; texto.focus(); return; }
        if (t.length > MAX_TEXTO) { error.textContent = `Tu pregunta pasa de ${MAX_TEXTO} caracteres. Acórtala un poco.`; return; }
        boton.disabled = true;
        boton.textContent = 'Enviando…';
        try {
          const fresca = await db.get(rutaBuzon(codigo));
          if (!fresca || !fresca.abierta) { pintado = ''; return aviso('🔒', 'Esta sesión ya cerró', 'Tu pregunta no se guardó.'); }
          const lim = limiteDe(fresca);
          const n = await enviar(nombre, t, borrador.anonima, lim);
          const yo = misDatos(nombre);
          if (!n) {
            guardarLocal(claveMias(nombre), { ...yo, usadas: lim });
            boton.textContent = 'Enviar pregunta';
            refrescar();
            error.textContent = `Ya usaste tus ${lim} ${lim === 1 ? 'participación' : 'participaciones'} de esta clase. Tu pregunta no se envió.`;
            return;
          }
          yo.usadas = Math.max(yo.usadas, n);
          yo.mias.push({ texto: t, anonima: borrador.anonima });
          guardarLocal(claveMias(nombre), yo);
          guardarLocal('buzon:nombre', nombre);
          borrador.texto = '';
          pantalla = 'listo';
          listo(nombre, borrador.anonima, Math.max(0, lim - yo.usadas));
        } catch (err) {
          boton.disabled = false;
          boton.textContent = 'Enviar pregunta';
          error.textContent = 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.';
        }
      }
    },
    h('label', { for: 'nombre' }, lista ? 'Elige tu nombre' : 'Tu nombre'), campoNombre,
    h('p', { class: 'nota' }, 'Tu nombre registra tu participación y solo lo ve tu docente.'),
    h('label', { for: 'texto' }, 'Tu pregunta'), texto, contador,
    h('label', { class: 'casilla', for: 'anonima' }, anonima,
      h('span', {}, h('b', {}, 'Mostrar mi pregunta como anónima'),
        h('small', {}, 'Si tu docente la proyecta, el grupo no verá tu nombre. Tu docente sí lo verá para registrar tu participación.'))),
    contMedidor, error, boton);

    raiz.append(h('div', { class: 'pagina-alumno' }, cabecera(), form, contMias));
    refrescar();
  }

  // Busca el primer lugar libre (1 … límite) para este nombre. Devuelve el número o 0 si no queda.
  async function enviar(nombre, texto, anonima, limite) {
    for (let n = 1; n <= limite; n++) {
      const ruta = rutaPregunta(codigo, idPregunta(nombre, n));
      // La base local de demostración no tiene reglas: se revisa a mano si el lugar ya está ocupado.
      if (modoDemo && (await db.get(ruta))) continue;
      try {
        await db.set(ruta, { nombre, texto, anonima: !!anonima, ts: db.TS });
        return n;
      } catch (e) {
        // Lugar ocupado (o fuera del límite): las reglas lo rechazan; se prueba el siguiente.
        if (e && e.code === 'permission-denied') continue;
        throw e;
      }
    }
    return 0;
  }

  function listo(nombre, anonima, quedan) {
    vaciar(raiz);
    raiz.append(h('div', { class: 'pagina-alumno' }, cabecera(),
      h('div', { class: 'caja-form listo' },
        h('div', { class: 'palomita', 'aria-hidden': 'true' }, '✓'),
        h('h2', {}, `¡Pregunta enviada, ${nombre}!`),
        h('p', {}, anonima ? 'Se registró tu participación. Si se proyecta, aparecerá como anónima.' : 'Se registró tu participación.'),
        h('p', { class: 'quedan' }, quedan === 0 ? 'Ya usaste todas tus participaciones de esta clase.'
          : `Te ${quedan === 1 ? 'queda' : 'quedan'} ${quedan} ${quedan === 1 ? 'participación' : 'participaciones'}.`),
        quedan > 0 ? h('button', {
          class: 'btn btn-primario btn-grande', type: 'button',
          onclick: () => {
            pantalla = 'form';
            if (datos && datos.abierta) { pintado = firmaDe(datos); formulario(); } else aviso('🔒', 'Esta sesión está cerrada', 'Ya no recibe preguntas.');
          }
        }, 'Hacer otra pregunta') : null)));
  }
}

if (!codigo) inicio();
else sesion();
