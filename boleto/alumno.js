// Boleto de salida — vista del alumno (código o QR, nombre, tipo de aporte, texto).
import { db } from '../shared/db.js';
import { h, vaciar, param, bannerDemo } from '../shared/ui.js';
import { TIPOS, LOGO_SVG, rutaSesion, rutaAportes, limpiarCodigo, tiposActivos } from './modelo.js';

const raiz = document.getElementById('app');
bannerDemo();
const codigo = limpiarCodigo(param('s'));

if (!codigo) inicio();
else sesion();

/* ───────── Inicio: escribir el código ───────── */
function inicio(mensaje) {
  vaciar(raiz);
  const error = h('p', { class: 'error', role: 'alert' }, mensaje || '');
  const campo = h('input', {
    type: 'text', id: 'cod', maxlength: '8', autocomplete: 'off', autocapitalize: 'characters', inputmode: 'text', placeholder: 'ABC123', 'aria-label': 'Código de la sesión'
  });
  const form = h('form', {
    novalidate: true,
    onsubmit: (e) => {
      e.preventDefault();
      const c = limpiarCodigo(campo.value);
      if (!c) { error.textContent = 'Escribe el código que aparece en el pizarrón.'; return; }
      location.href = `?s=${encodeURIComponent(c)}`;
    }
  }, h('label', { for: 'cod' }, 'Código de la sesión'), campo, error,
  h('button', { class: 'btn btn-primario btn-grande', type: 'submit' }, 'Entrar'));
  raiz.append(
    h('a', { class: 'acceso-esquina', href: 'docente.html' }, 'Acceso docente'),
    h('div', { class: 'inicio' }, h('div', { class: 'inicio-caja' },
      h('span', { class: 'logo', html: LOGO_SVG }),
      h('h1', {}, 'Boleto de salida'),
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
  let pantalla = 'form'; // 'form' | 'listo'
  let ultimoNombre = '';
  let pintado = '';
  let refs = {};
  let tipoElegido = null;

  db.onDoc(rutaSesion(codigo), (s) => {
    datos = s;
    if (!s) { pintado = 'nada'; return aviso('🔎', 'No encontramos esta sesión', 'Revisa el código con tu docente.'); }
    if (refs.pregunta) refs.pregunta.textContent = s.pregunta || '';
    if (pantalla === 'listo') return;
    const clave = s.abierta ? 'abierta' : 'cerrada';
    if (clave === pintado) return;
    pintado = clave;
    if (!s.abierta) return aviso('🔒', 'Esta sesión está cerrada', 'Ya no recibe aportes. Pregunta a tu docente si necesitas participar.');
    formulario();
  }, () => aviso('⚠️', 'No pudimos cargar la sesión', 'Revisa tu conexión e inténtalo de nuevo.'));

  function formulario() {
    vaciar(raiz);
    const limite = Number(datos.limite) || 200;
    const tipos = tiposActivos(datos);
    if (!tipos.includes(tipoElegido)) tipoElegido = tipos.length === 1 ? tipos[0] : null;
    let nombreGuardado = '';
    try { nombreGuardado = ultimoNombre || localStorage.getItem('boleto:nombre') || ''; } catch (e) { /* sin almacenamiento */ }

    refs.pregunta = h('div', {}, datos.pregunta || '');
    const nombre = h('input', { type: 'text', id: 'nombre', maxlength: '60', autocomplete: 'name', placeholder: 'Tu nombre', value: nombreGuardado });
    const texto = h('textarea', { id: 'texto', rows: '5', placeholder: 'Escribe aquí…', 'aria-describedby': 'contador' });
    const contador = h('div', { class: 'contador', id: 'contador', 'aria-live': 'polite' }, `0 / ${limite}`);
    const error = h('p', { class: 'error', role: 'alert' });
    const botones = new Map();
    const pintarTipos = () => botones.forEach((b, id) => b.setAttribute('aria-pressed', String(id === tipoElegido)));
    const contTipos = h('div', { class: 'tipos', role: 'group', 'aria-label': 'Tipo de aporte' });
    for (const id of tipos) {
      const b = h('button', {
        type: 'button', class: 'tipo-btn', style: { background: TIPOS[id].color }, 'aria-pressed': 'false',
        onclick: () => { tipoElegido = id; pintarTipos(); error.textContent = ''; }
      }, h('span', { class: 'marca' }), TIPOS[id].nombre);
      botones.set(id, b);
      contTipos.append(b);
    }
    pintarTipos();

    texto.addEventListener('input', () => {
      const n = texto.value.length;
      contador.textContent = `${n} / ${limite}`;
      contador.classList.toggle('excede', n > limite);
    });

    const boton = h('button', { class: 'btn btn-primario btn-grande', type: 'submit' }, 'Pegar en el tablero');
    const form = h('form', {
      class: 'marco-form', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        error.textContent = '';
        const quien = nombre.value.trim().replace(/\s+/g, ' ');
        const t = texto.value.trim();
        if (!quien) { error.textContent = 'Escribe tu nombre para continuar.'; nombre.focus(); return; }
        if (!tipoElegido) { error.textContent = 'Elige qué tipo de aporte vas a pegar.'; return; }
        if (!t) { error.textContent = 'Escribe tu aporte para continuar.'; texto.focus(); return; }
        if (t.length > limite) { error.textContent = `Tu aporte pasa de ${limite} caracteres. Acórtalo un poco.`; return; }
        boton.disabled = true;
        boton.textContent = 'Pegando…';
        try {
          const fresca = await db.get(rutaSesion(codigo));
          if (!fresca || !fresca.abierta) { datos = fresca || datos; pintado = 'cerrada'; return aviso('🔒', 'Esta sesión ya cerró', 'Tu aporte no se guardó.'); }
          await db.add(rutaAportes(codigo), { nombre: quien, tipo: tipoElegido, texto: t, ts: db.TS });
          ultimoNombre = quien;
          try { localStorage.setItem('boleto:nombre', quien); } catch (err) { /* sin almacenamiento */ }
          pantalla = 'listo';
          listo(quien);
        } catch (err) {
          boton.disabled = false;
          boton.textContent = 'Pegar en el tablero';
          error.textContent = 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.';
        }
      }
    },
    h('label', { for: 'nombre' }, 'Tu nombre'), nombre,
    h('label', {}, 'Tipo de aporte'), contTipos,
    h('label', { for: 'texto' }, 'Tu aporte'), texto, contador,
    error, boton);

    raiz.append(h('div', { class: 'pagina-alumno' },
      h('div', { class: 'tira-corcho' }, h('div', { class: 'nota-papel' }, h('span', { class: 'chincheta' }), refs.pregunta)),
      form));
  }

  function listo(quien) {
    vaciar(raiz);
    refs = {};
    raiz.append(h('div', { class: 'pagina-alumno listo' },
      h('div', { class: 'nota-papel' }, h('span', { class: 'chincheta' }), `¡Listo, ${quien}!`),
      h('p', {}, 'Tu aporte ya está en el tablero.'),
      h('button', {
        class: 'btn btn-primario btn-grande', type: 'button',
        onclick: () => { pantalla = 'form'; pintado = ''; if (datos && datos.abierta) { pintado = 'abierta'; formulario(); } else { aviso('🔒', 'Esta sesión está cerrada', 'Ya no recibe aportes.'); } }
      }, 'Enviar otro aporte')));
  }
}
