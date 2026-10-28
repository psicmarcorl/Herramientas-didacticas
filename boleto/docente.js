// Boleto de salida — panel docente.
import { db } from '../shared/db.js';
import { iniciarDocente } from '../shared/shell.js';
import {
  h, vaciar, avisar, confirmar, copiar, descargar, enlace, nombreArchivo, qrNodo, qrPng, mostrarQrGrande, fechaHora
} from '../shared/ui.js';
import {
  TIPOS, ORDEN_TIPOS, IDEAS_RAPIDAS, PREGUNTA_INICIAL, LIMITE_MIN, LIMITE_MAX, LIMITE_PASO,
  rutaSesion, rutaAportes, codigoNuevo, tiposActivos, exportarExcel
} from './modelo.js';

iniciarDocente({
  raiz: document.getElementById('app'),
  titulo: 'Boleto de salida',
  subtitulo: 'Panel docente',
  render: panel
});

const urlAlumno = (c) => enlace(`./?s=${encodeURIComponent(c)}`);
const urlTablero = (c) => enlace(`tablero.html?s=${encodeURIComponent(c)}`);

function panel(cuerpo) {
  let sesiones = [];
  let actual = null; // código de la sesión que se administra
  let cargado = false;
  let conteos = {};
  let aportes = [];
  let cancelarAportes = null;
  let temporizador = null;
  let borradorPregunta = null;
  let refs = {};

  const buscar = (c) => sesiones.find((s) => s.id === c);
  const sesionActual = () => (actual ? buscar(actual) : null);

  let firma = '';
  let creandoPrimera = false;
  const cancelarSesiones = db.onCol('sesiones', (docs) => {
    const nuevaFirma = JSON.stringify(docs.map((d) => [d.id, d.pregunta, d.limite, d.abierta, (d.tipos || []).join()]).sort());
    if (cargado && nuevaFirma === firma) return; // nada cambió: no repintar (conserva lo que se está escribiendo)
    firma = nuevaFirma;
    sesiones = docs.sort((a, b) => (b.creada || 0) - (a.creada || 0));
    cargado = true;
    if (!actual || !buscar(actual)) {
      let guardado = null;
      try { guardado = localStorage.getItem('boleto:actual'); } catch (e) { /* sin almacenamiento */ }
      actual = guardado && buscar(guardado) ? guardado : (sesiones[0] ? sesiones[0].id : null);
      suscribirAportes();
    }
    if (!sesiones.length) {
      if (!creandoPrimera) { creandoPrimera = true; crearSesion(null, true); }
      return;
    }
    pintar();
    contarTodas();
  }, () => {
    vaciar(cuerpo);
    cuerpo.append(h('div', { class: 'tarjeta' }, h('h2', {}, 'No se pudieron leer tus sesiones'),
      h('p', {}, 'Revisa que las reglas de Firestore estén publicadas y que tu correo coincida con el de las reglas (ver README).')));
  });

  async function contarTodas() {
    for (const s of sesiones) {
      try { conteos[s.id] = await db.count(rutaAportes(s.id)); } catch (e) { /* sin red */ }
    }
    pintarLista();
  }
  temporizador = setInterval(contarTodas, 20000);

  function suscribirAportes() {
    if (cancelarAportes) { cancelarAportes(); cancelarAportes = null; }
    aportes = [];
    if (!actual) return;
    cancelarAportes = db.onCol(rutaAportes(actual), (docs) => {
      aportes = docs;
      conteos[actual] = docs.length;
      pintarConteos();
      pintarLista();
    }, () => { /* sin permiso */ });
  }

  function elegir(codigo) {
    actual = codigo;
    borradorPregunta = null;
    try { localStorage.setItem('boleto:actual', codigo); } catch (e) { /* sin almacenamiento */ }
    suscribirAportes();
    pintar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function crearSesion(base, primera) {
    const ant = base || sesionActual();
    const codigo = codigoNuevo();
    const datos = {
      pregunta: ant ? ant.pregunta : PREGUNTA_INICIAL,
      limite: ant ? ant.limite : 200,
      tipos: ant ? tiposActivos(ant) : ORDEN_TIPOS.slice(),
      abierta: true,
      creada: Date.now()
    };
    try {
      if (ant && !primera && ant.abierta) await db.set(rutaSesion(ant.id), { abierta: false }, { merge: true });
      await db.set(rutaSesion(codigo), datos);
      sesiones.unshift({ id: codigo, ...datos });
      if (ant && ant.id) { const a = buscar(ant.id); if (a && !primera) a.abierta = false; }
      elegir(codigo);
      if (!primera) avisar('Nueva sesión creada con su propio QR');
    } catch (e) {
      avisar('No se pudo crear la sesión', 'error');
    }
  }

  async function guardar(parcial) {
    const s = sesionActual();
    if (!s) return;
    try {
      await db.set(rutaSesion(s.id), parcial, { merge: true });
      Object.assign(s, parcial);
    } catch (e) {
      avisar('No se pudo guardar', 'error');
    }
  }

  /* ───────── Pintado ───────── */
  function pintar() {
    vaciar(cuerpo);
    refs = {};
    if (!cargado) { cuerpo.append(h('p', { class: 'nota' }, 'Cargando…')); return; }
    const s = sesionActual();
    if (!s) return;
    cuerpo.append(barraSesion(s), h('div', { class: 'cuadricula-2' }, tarjetaPregunta(s), tarjetaAjustes(s), tarjetaQr(s), tarjetaClase(s)),
      h('h2', { style: { margin: '1.6rem 0 .2rem', color: 'var(--madera)' } }, 'Tableros'), h('p', { class: 'nota' }, 'Todas tus sesiones. Puedes presentarlas, exportarlas a Excel o eliminarlas.'),
      (refs.lista = h('div', { class: 'lista-tableros' })));
    pintarLista();
    pintarConteos();
  }

  function barraSesion(s) {
    const interruptor = h('input', {
      type: 'checkbox', checked: !!s.abierta, id: 'abierta',
      onchange: async (e) => {
        await guardar({ abierta: e.target.checked });
        pintarLista();
        avisar(e.target.checked ? 'Sesión abierta: los alumnos pueden participar' : 'Sesión cerrada: ya no recibe aportes');
      }
    });
    return h('div', { class: 'sesion-barra' },
      h('div', {}, h('span', { class: 'nota' }, 'Sesión actual'), h('div', { class: 'cod' }, s.id), s.creada ? h('span', { class: 'nota' }, `Creada ${fechaHora(s.creada)}`) : null),
      h('label', { class: 'interruptor', for: 'abierta' }, interruptor, 'Recibiendo aportes'),
      h('button', { class: 'btn btn-primario', type: 'button', onclick: nuevaSesion }, '＋ Nueva sesión'));
  }

  async function nuevaSesion() {
    const s = sesionActual();
    const ok = await confirmar('Nueva sesión',
      'Se creará un tablero nuevo con su propio código y QR, y la sesión actual se cerrará pero se conserva en “Tableros”. Se copian la pregunta y los ajustes.',
      { si: 'Crear sesión' });
    if (ok) crearSesion(s, false);
  }

  /* 1. Pregunta */
  function tarjetaPregunta(s) {
    const texto = h('textarea', { id: 'pregunta', maxlength: '200', rows: '3' });
    texto.value = borradorPregunta !== null ? borradorPregunta : (s.pregunta || '');
    const vistaTexto = h('div', {}, '');
    const actualizarVista = () => { vistaTexto.textContent = texto.value.trim() || 'Tu pregunta aparecerá aquí'; };
    texto.addEventListener('input', () => { borradorPregunta = texto.value; actualizarVista(); });
    actualizarVista();
    return h('section', { class: 'tarjeta' },
      h('h2', {}, 'Pregunta o reflexión'),
      h('label', { for: 'pregunta' }, 'Lo que verán tus alumnos'), texto,
      h('p', { class: 'nota', style: { margin: '.6em 0 .2em' } }, 'Ideas rápidas:'),
      h('div', { class: 'chips' }, IDEAS_RAPIDAS.map((i) => h('button', { class: 'chip', type: 'button', onclick: () => { texto.value = i; borradorPregunta = i; actualizarVista(); texto.focus(); } }, i))),
      h('p', { class: 'nota', style: { margin: '0 0 .3em' } }, 'Vista previa:'),
      h('div', { class: 'vista-previa' }, h('div', { class: 'nota-papel' }, h('span', { class: 'chincheta' }), vistaTexto)),
      h('button', {
        class: 'btn btn-primario', type: 'button',
        onclick: async () => {
          const t = texto.value.trim();
          if (!t) { avisar('Escribe la pregunta primero', 'error'); return; }
          await guardar({ pregunta: t });
          borradorPregunta = null;
          pintarLista();
          avisar('Pregunta guardada');
        }
      }, 'Guardar pregunta'));
  }

  /* 2. Ajustes */
  function tarjetaAjustes(s) {
    const valor = h('span', { class: 'valor' }, String(s.limite || 200));
    const ajustar = async (delta) => {
      const nuevo = Math.min(LIMITE_MAX, Math.max(LIMITE_MIN, (Number(s.limite) || 200) + delta));
      if (nuevo === s.limite) return;
      valor.textContent = String(nuevo);
      await guardar({ limite: nuevo });
    };
    const activos = new Set(tiposActivos(s));
    const casillas = ORDEN_TIPOS.map((id) => {
      const c = h('input', {
        type: 'checkbox', id: `tipo-${id}`, checked: activos.has(id),
        onchange: async () => {
          const nuevos = ORDEN_TIPOS.filter((t) => (t === id ? c.checked : activos.has(t)));
          if (!nuevos.length) { c.checked = true; avisar('Deja al menos un tipo de aporte activo', 'error'); return; }
          c.checked ? activos.add(id) : activos.delete(id);
          await guardar({ tipos: nuevos });
        }
      });
      return h('label', { class: 'interruptor', for: `tipo-${id}`, style: { background: TIPOS[id].color, padding: '.55em .9em', borderRadius: '10px', marginBottom: '.4em', display: 'flex' } }, c, TIPOS[id].nombre);
    });
    return h('section', { class: 'tarjeta' },
      h('h2', {}, 'Ajustes'),
      h('label', {}, 'Límite de caracteres por aporte'),
      h('div', { class: 'paso' },
        h('button', { class: 'btn btn-suave', type: 'button', 'aria-label': 'Menos caracteres', onclick: () => ajustar(-LIMITE_PASO) }, '−'),
        valor,
        h('button', { class: 'btn btn-suave', type: 'button', 'aria-label': 'Más caracteres', onclick: () => ajustar(LIMITE_PASO) }, '+'),
        h('span', { class: 'nota' }, `de ${LIMITE_PASO} en ${LIMITE_PASO} (${LIMITE_MIN}–${LIMITE_MAX})`)),
      h('label', {}, 'Tipos de aporte activos'), casillas);
  }

  /* 3. QR y enlace */
  function tarjetaQr(s) {
    const url = urlAlumno(s.id);
    return h('section', { class: 'tarjeta' },
      h('h2', {}, 'Código QR y enlace'),
      h('div', { class: 'qr-fila' },
        qrNodo(url, 170),
        h('div', {}, h('p', { class: 'nota', style: { margin: 0 } }, 'Código para escribir'), h('div', { class: 'codigo-grande' }, s.id))),
      h('label', { for: 'enlace' }, 'Enlace de la sesión'),
      h('input', { type: 'text', id: 'enlace', readonly: true, value: url, onfocus: (e) => e.target.select() }),
      h('div', { class: 'acciones', style: { display: 'flex', flexWrap: 'wrap', gap: '.4em', marginTop: '.7em' } },
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => copiar(url) }, 'Copiar enlace'),
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: async () => descargar(await qrPng(url), nombreArchivo(`qr boleto ${s.id}`, 'png')) }, 'Descargar QR'),
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => mostrarQrGrande(url, `Código ${s.id}`) }, 'Proyectar QR')));
  }

  /* 4. En clase */
  function tarjetaClase(s) {
    refs.conteos = h('div', { class: 'conteos' });
    return h('section', { class: 'tarjeta' },
      h('h2', {}, 'En clase'),
      refs.conteos,
      h('div', { style: { display: 'grid', gap: '.5em' } },
        h('button', { class: 'btn btn-primario btn-grande', type: 'button', onclick: () => window.open(urlTablero(s.id), '_blank', 'noopener') }, '📌 Presentar tablero de corcho'),
        h('button', { class: 'btn btn-suave', type: 'button', onclick: () => exportar(s) }, '⬇ Exportar aportes (Excel)')));
  }

  function pintarConteos() {
    if (!refs.conteos) return;
    vaciar(refs.conteos);
    const s = sesionActual();
    if (!s) return;
    const act = tiposActivos(s);
    refs.conteos.append(h('div', { class: 'conteo', style: { background: '#fff', border: '2px solid #eadfc9' } }, 'Total de aportes', h('b', {}, String(aportes.length))));
    for (const id of ORDEN_TIPOS) {
      if (!act.includes(id)) continue;
      refs.conteos.append(h('div', { class: 'conteo', style: { background: TIPOS[id].color } }, TIPOS[id].nombre, h('b', {}, String(aportes.filter((a) => a.tipo === id).length))));
    }
  }

  async function exportar(s) {
    try {
      const lista = s.id === actual ? aportes : await db.list(rutaAportes(s.id));
      if (!lista.length) { avisar('Todavía no hay aportes para exportar', 'error'); return; }
      exportarExcel(s, lista);
    } catch (e) {
      avisar('No se pudo exportar', 'error');
    }
  }

  /* Lista de tableros */
  function pintarLista() {
    if (!refs.lista) return;
    vaciar(refs.lista);
    for (const s of sesiones) {
      const c = conteos[s.id];
      refs.lista.append(h('div', { class: `fila-tablero${s.id === actual ? ' actual' : ''}` },
        h('div', { class: 'info' },
          h('b', {}, s.pregunta || '(sin pregunta)'),
          h('span', { class: 'nota' }, `${s.id} · ${s.creada ? fechaHora(s.creada) : ''} · ${c === undefined ? '…' : c} ${c === 1 ? 'aporte' : 'aportes'} · `,
            h('span', { class: `badge ${s.abierta ? 'abierta' : 'cerrada'}` }, s.abierta ? 'Abierta' : 'Cerrada'))),
        h('div', { style: { display: 'flex', gap: '.4em', flexWrap: 'wrap' } },
          s.id === actual ? h('span', { class: 'badge abierta' }, 'Administrando') : h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => elegir(s.id) }, 'Administrar'),
          h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => window.open(urlTablero(s.id), '_blank', 'noopener') }, 'Presentar'),
          h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => exportar(s) }, 'Excel'),
          h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => eliminar(s) }, 'Eliminar'))));
    }
  }

  async function eliminar(s) {
    const ok = await confirmar('Eliminar tablero', `Se borrará el tablero ${s.id} con todos sus aportes. Esta acción no se puede deshacer.`, { si: 'Eliminar', peligro: true });
    if (!ok) return;
    try {
      await db.delCol(rutaAportes(s.id));
      await db.del(rutaSesion(s.id));
      sesiones = sesiones.filter((x) => x.id !== s.id);
      if (s.id === actual) {
        actual = sesiones[0] ? sesiones[0].id : null;
        suscribirAportes();
      }
      avisar('Tablero eliminado');
      if (!sesiones.length) crearSesion(null, true); else pintar();
    } catch (e) {
      avisar('No se pudo eliminar', 'error');
    }
  }

  pintar();
  return () => {
    clearInterval(temporizador);
    if (cancelarAportes) cancelarAportes();
    if (typeof cancelarSesiones === 'function') cancelarSesiones();
  };
}
