// Ruleta de participación — panel docente: grupos, lista de alumnos, modo, historial y Excel.
import { db } from '../shared/db.js';
import { iniciarDocente } from '../shared/shell.js';
import { h, vaciar, avisar, confirmar, dialogo, enlace, fechaHora } from '../shared/ui.js';
import {
  RESULTADOS, MODOS, MAX_ALUMNOS, MAX_NOMBRE, rutaRuleta, rutaTurnos, idNuevo, hoy, alumnosDe, ausentesHoy,
  presentes, candidatos, yaPasaron, listaDesdeTexto, resumen, exportarExcel, paseDeLista, masNuevoPrimero
} from './modelo.js';

iniciarDocente({
  raiz: document.getElementById('app'),
  titulo: 'Ruleta de participación',
  subtitulo: 'Panel docente',
  render: panel
});

const urlRuleta = (id) => enlace(`ruleta.html?g=${encodeURIComponent(id)}`);
const abrirRuleta = (id) => window.open(urlRuleta(id), '_blank', 'noopener');

function panel(cuerpo) {
  let grupos = [];
  let actual = null;
  let cargado = false;
  let turnos = [];
  let cancelarTurnos = null;
  let borradorLista = null;
  let refs = {};
  let firma = '';

  const buscar = (id) => grupos.find((g) => g.id === id);
  const grupoActual = () => (actual ? buscar(actual) : null);

  const cancelarGrupos = db.onCol('ruletas', (docs) => {
    const nueva = JSON.stringify(docs.map((d) => [d.id, d.nombre, d.modo, d.noRespVuelve, d.ronda, d.alumnos, d.ausentes]).sort());
    if (cargado && nueva === firma) return;
    firma = nueva;
    grupos = docs.sort((a, b) => (b.creada || 0) - (a.creada || 0));
    cargado = true;
    if (!actual || !buscar(actual)) {
      let guardado = null;
      try { guardado = localStorage.getItem('ruleta:actual'); } catch (e) { /* sin almacenamiento */ }
      actual = guardado && buscar(guardado) ? guardado : (grupos[0] ? grupos[0].id : null);
      suscribirTurnos();
    }
    pintar();
  }, () => {
    vaciar(cuerpo);
    cuerpo.append(h('div', { class: 'tarjeta' }, h('h2', {}, 'No se pudieron leer tus grupos'),
      h('p', {}, 'Revisa que las reglas de Firestore estén publicadas con el bloque de la ruleta (ver README, paso 5).')));
  });

  function suscribirTurnos() {
    if (cancelarTurnos) { cancelarTurnos(); cancelarTurnos = null; }
    turnos = [];
    if (!actual) return;
    cancelarTurnos = db.onCol(rutaTurnos(actual), (docs) => { turnos = docs; pintarDatos(); }, () => { /* sin permiso */ });
  }

  function elegir(id) {
    actual = id;
    borradorLista = null;
    try { localStorage.setItem('ruleta:actual', id); } catch (e) { /* sin almacenamiento */ }
    suscribirTurnos();
    pintar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function guardar(parcial) {
    const g = grupoActual();
    if (!g) return false;
    try {
      await db.set(rutaRuleta(g.id), parcial, { merge: true });
      Object.assign(g, parcial);
      return true;
    } catch (e) {
      avisar('No se pudo guardar', 'error');
      return false;
    }
  }

  /* ───────── Crear, renombrar, duplicar, eliminar ───────── */
  async function nuevoGrupo(base) {
    const nombre = h('input', { type: 'text', maxlength: '80', placeholder: 'Ej. 3.º A · Introducción a la Psicología' });
    nombre.value = base ? `${base.nombre} (copia)` : '';
    const lista = h('textarea', { rows: '8', placeholder: 'Pega aquí los nombres, uno por renglón (puedes copiarlos de una columna de Excel).' });
    if (base) lista.value = alumnosDe(base).map((a) => a.n).join('\n');
    const msg = h('p', { class: 'error', role: 'alert' });
    const cuerpoD = h('div', {},
      h('label', {}, 'Nombre del grupo'), nombre,
      h('label', {}, 'Alumnos (opcional, puedes agregarlos después)'), lista, msg);
    for (;;) {
      const ok = await dialogo({
        titulo: base ? 'Duplicar grupo' : 'Nuevo grupo', cuerpo: cuerpoD,
        botones: [{ texto: 'Cancelar', valor: false, clase: 'btn-suave' }, { texto: 'Crear grupo', valor: true, clase: 'btn-primario' }]
      });
      if (!ok) return;
      if (!nombre.value.trim()) { msg.textContent = 'Escribe un nombre para el grupo.'; continue; }
      break;
    }
    const id = idNuevo();
    const datos = {
      nombre: nombre.value.trim().slice(0, 80),
      alumnos: listaDesdeTexto(lista.value),
      modo: base ? base.modo || 'ronda' : 'ronda',
      noRespVuelve: base ? !!base.noRespVuelve : false,
      ronda: 1,
      ausentes: { dia: '', ids: [] },
      creada: Date.now()
    };
    try {
      await db.set(rutaRuleta(id), datos);
      if (!buscar(id)) grupos.unshift({ id, ...datos });
      elegir(id);
      avisar('Grupo creado');
    } catch (e) {
      avisar('No se pudo crear el grupo', 'error');
    }
  }

  async function renombrar(g) {
    const campo = h('input', { type: 'text', maxlength: '80' });
    campo.value = g.nombre || '';
    const ok = await dialogo({
      titulo: 'Cambiar nombre del grupo', cuerpo: h('div', {}, campo),
      botones: [{ texto: 'Cancelar', valor: false, clase: 'btn-suave' }, { texto: 'Guardar', valor: true, clase: 'btn-primario' }]
    });
    const t = campo.value.trim();
    if (!ok || !t) return;
    if (await guardar({ nombre: t.slice(0, 80) })) { firma = ''; pintar(); avisar('Nombre actualizado'); }
  }

  async function eliminar(g) {
    const ok = await confirmar('Eliminar grupo', `Se borrará “${g.nombre}” con su lista de alumnos y todo su historial de participación. Esta acción no se puede deshacer. Si lo necesitas, exporta antes a Excel.`, { si: 'Eliminar', peligro: true });
    if (!ok) return;
    try {
      await db.delCol(rutaTurnos(g.id));
      await db.del(rutaRuleta(g.id));
      grupos = grupos.filter((x) => x.id !== g.id);
      if (g.id === actual) { actual = grupos[0] ? grupos[0].id : null; suscribirTurnos(); }
      avisar('Grupo eliminado');
      pintar();
    } catch (e) {
      avisar('No se pudo eliminar', 'error');
    }
  }

  /* ───────── Pintado ───────── */
  function pintar() {
    vaciar(cuerpo);
    refs = {};
    if (!cargado) { cuerpo.append(h('p', { class: 'nota' }, 'Cargando…')); return; }
    const g = grupoActual();
    if (!g) {
      cuerpo.append(h('div', { class: 'tarjeta vacio-grupos' },
        h('div', { class: 'logo-grande', html: '🎡' }),
        h('h2', {}, 'Crea tu primer grupo'),
        h('p', {}, 'Escribe el nombre del grupo y pega la lista de alumnos. Después podrás proyectar la ruleta y registrar quién participa.'),
        h('button', { class: 'btn btn-primario btn-grande', type: 'button', onclick: () => nuevoGrupo() }, '＋ Nuevo grupo')));
      return;
    }
    cuerpo.append(
      barraGrupo(g),
      h('div', { class: 'cuadricula-2' }, tarjetaClase(g), tarjetaAlumnos(g), tarjetaModo(g)),
      h('div', { class: 'cuadricula-datos' }, tarjetaResumen(g), tarjetaHistorial()),
      h('h2', { class: 'titulo-seccion' }, 'Mis grupos'),
      (refs.lista = h('div', { class: 'lista-grupos' })));
    pintarLista();
    pintarDatos();
  }

  function barraGrupo(g) {
    let selector = null;
    if (grupos.length > 1) {
      selector = h('select', { 'aria-label': 'Cambiar de grupo', onchange: (e) => elegir(e.target.value) },
        grupos.map((x) => h('option', { value: x.id, selected: x.id === g.id }, x.nombre || '(sin nombre)')));
    }
    return h('div', { class: 'grupo-barra' },
      h('div', { class: 'grupo-nombre' }, h('span', { class: 'nota' }, 'Grupo'), h('b', {}, g.nombre || '(sin nombre)')),
      h('div', { class: 'fila' },
        selector,
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => renombrar(g) }, 'Cambiar nombre'),
        h('button', { class: 'btn btn-primario btn-chico', type: 'button', onclick: () => nuevoGrupo() }, '＋ Nuevo grupo')));
  }

  /* 1. En clase */
  function tarjetaClase(g) {
    refs.stats = h('div', { class: 'stats' });
    return h('section', { class: 'tarjeta' },
      h('h2', {}, 'En clase'),
      refs.stats,
      h('div', { style: { display: 'grid', gap: '.5em' } },
        h('button', { class: 'btn btn-primario btn-grande', type: 'button', onclick: () => abrirRuleta(g.id) }, '🎡 Abrir ruleta para proyectar'),
        h('div', { class: 'fila' },
          h('button', { class: 'btn btn-suave crece', type: 'button', onclick: () => pasarLista(g) }, '📋 Pase de lista de hoy'),
          g.modo === 'azar' ? null : h('button', { class: 'btn btn-suave crece', type: 'button', onclick: () => reiniciarRonda(g) }, '🔄 Nueva ronda'))));
  }

  async function pasarLista(g) {
    const ids = await paseDeLista(g);
    if (!ids) return;
    if (await guardar({ ausentes: { dia: hoy(), ids } })) { firma = ''; pintarDatos(); avisar('Pase de lista guardado'); }
  }

  async function reiniciarRonda(g) {
    const ok = await confirmar('Empezar nueva ronda', 'Todos los alumnos presentes vuelven a la ruleta. El historial se conserva.', { si: 'Nueva ronda' });
    if (!ok) return;
    if (await guardar({ ronda: (g.ronda || 1) + 1 })) { pintarDatos(); avisar('Nueva ronda iniciada'); }
  }

  /* 2. Alumnos */
  function tarjetaAlumnos(g) {
    const texto = h('textarea', { id: 'lista', rows: '10', spellcheck: 'false', placeholder: 'Un nombre por renglón' });
    texto.value = borradorLista !== null ? borradorLista : alumnosDe(g).map((a) => a.n).join('\n');
    const cuenta = h('span', { class: 'nota' });
    const contar = () => {
      const n = listaDesdeTexto(texto.value).length;
      cuenta.textContent = `${n} ${n === 1 ? 'alumno' : 'alumnos'}${n >= MAX_ALUMNOS ? ` (máximo ${MAX_ALUMNOS})` : ''}`;
    };
    texto.addEventListener('input', () => { borradorLista = texto.value; contar(); });
    contar();
    return h('section', { class: 'tarjeta' },
      h('h2', {}, 'Lista de alumnos'),
      h('label', { for: 'lista' }, 'Un nombre por renglón'),
      texto,
      h('div', { class: 'fila', style: { justifyContent: 'space-between', marginTop: '.5em' } },
        cuenta,
        h('button', {
          class: 'btn btn-primario', type: 'button',
          onclick: async () => {
            const nueva = listaDesdeTexto(texto.value, alumnosDe(g));
            if (await guardar({ alumnos: nueva })) {
              borradorLista = null;
              texto.value = nueva.map((a) => a.n).join('\n');
              contar();
              pintarDatos();
              pintarLista();
              avisar('Lista guardada');
            }
          }
        }, 'Guardar lista')),
      h('p', { class: 'nota', style: { marginTop: '.6em' } },
        `Copia la columna de nombres desde Excel o tu lista de asistencia y pégala aquí. Los nombres repetidos se omiten y cada nombre puede tener hasta ${MAX_NOMBRE} caracteres. Si corriges un nombre, su historial anterior queda como “ya no está en la lista”.`));
  }

  /* 3. Modo */
  function tarjetaModo(g) {
    const opciones = Object.values(MODOS).map((m) => h('label', { class: `opcion${(g.modo || 'ronda') === m.id ? ' elegida' : ''}` },
      h('input', {
        type: 'radio', name: 'modo', value: m.id, checked: (g.modo || 'ronda') === m.id,
        onchange: async () => { if (await guardar({ modo: m.id })) { firma = ''; pintar(); } }
      }),
      h('span', {}, h('b', {}, m.nombre), h('span', { class: 'nota' }, m.detalle))));
    const vuelve = h('input', {
      type: 'checkbox', id: 'vuelve', checked: !!g.noRespVuelve,
      onchange: async (e) => { if (await guardar({ noRespVuelve: e.target.checked })) pintarDatos(); }
    });
    return h('section', { class: 'tarjeta' },
      h('h2', {}, 'Modo de la ruleta'),
      h('div', { class: 'opciones' }, opciones),
      (g.modo || 'ronda') === 'ronda'
        ? h('label', { class: 'interruptor', for: 'vuelve', style: { marginTop: '.9em' } }, vuelve, 'Si alguien no responde, vuelve a la ruleta en esta ronda')
        : null);
  }

  /* 4. Resumen */
  function tarjetaResumen(g) {
    refs.resumen = h('div', { class: 'tabla-caja tabla-alta' });
    return h('section', { class: 'tarjeta' },
      h('h2', {}, 'Participación por alumno'),
      refs.resumen,
      h('div', { class: 'fila', style: { marginTop: '.7em' } },
        h('button', { class: 'btn btn-primario', type: 'button', onclick: () => exportar(g) }, '⬇ Exportar a Excel'),
        h('button', { class: 'btn btn-suave', type: 'button', onclick: () => vaciarHistorial(g) }, 'Vaciar historial')));
  }

  function exportar(g) {
    if (!alumnosDe(g).length && !turnos.length) { avisar('Todavía no hay datos para exportar', 'error'); return; }
    try { exportarExcel(g, turnos); } catch (e) { avisar('No se pudo exportar', 'error'); }
  }

  async function vaciarHistorial(g) {
    if (!turnos.length) { avisar('El historial ya está vacío'); return; }
    const ok = await confirmar('Vaciar historial', `Se borrarán los ${turnos.length} turnos registrados de “${g.nombre}” y la ronda volverá a 1. La lista de alumnos se conserva. Te recomendamos exportar a Excel antes.`, { si: 'Vaciar', peligro: true });
    if (!ok) return;
    try {
      await db.delCol(rutaTurnos(g.id));
      await guardar({ ronda: 1 });
      avisar('Historial vaciado');
    } catch (e) {
      avisar('No se pudo vaciar', 'error');
    }
  }

  /* 5. Historial */
  function tarjetaHistorial() {
    refs.historial = h('div', { class: 'tabla-caja tabla-alta' });
    return h('section', { class: 'tarjeta' },
      h('h2', {}, 'Historial de turnos'),
      h('p', { class: 'nota' }, 'Los más recientes primero. Si registraste un turno por error, puedes quitarlo.'),
      refs.historial);
  }

  /* Datos que cambian con cada turno */
  function pintarDatos() {
    const g = grupoActual();
    if (!g) return;
    if (refs.stats) {
      vaciar(refs.stats);
      const pres = presentes(g);
      const aus = ausentesHoy(g);
      const total = alumnosDe(g).length;
      const dato = (etq, val, clase = '') => h('div', { class: `stat ${clase}` }, h('b', {}, String(val)), h('span', {}, etq));
      if (g.modo === 'azar') {
        refs.stats.append(dato('modo al azar', '🎲'));
      } else {
        const ya = yaPasaron(g, turnos);
        const pasaron = pres.filter((a) => ya.has(a.id)).length;
        refs.stats.append(dato(`ronda actual`, g.ronda || 1), dato(`ya pasaron de ${pres.length}`, pasaron), dato('faltan', candidatos(g, turnos).length));
      }
      refs.stats.append(dato('alumnos', total), dato(`ausentes hoy`, aus.size, aus.size ? 'alerta' : ''), dato('turnos registrados', turnos.length));
      if (!total) refs.stats.append(h('p', { class: 'nota', style: { gridColumn: '1 / -1', margin: 0 } }, 'Agrega la lista de alumnos para poder girar la ruleta.'));
    }
    if (refs.resumen) {
      vaciar(refs.resumen);
      const filas = resumen(g, turnos);
      if (!filas.length) refs.resumen.append(h('p', { class: 'nota', style: { padding: '.8em' } }, 'Sin alumnos todavía.'));
      else {
        const aus = ausentesHoy(g);
        refs.resumen.append(h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Alumno'), h('th', {}, 'Salió'), h('th', {}, 'Participó'), h('th', {}, 'No resp.'))),
          h('tbody', {}, filas.map((f) => h('tr', {},
            h('td', {}, f.n, aus.has(f.id) ? h('span', { class: 'badge cerrada', style: { marginLeft: '.4em' } }, 'ausente hoy') : null),
            h('td', {}, String(f.veces)), h('td', {}, String(f.participo)), h('td', {}, String(f.noresp)))))));
      }
    }
    if (refs.historial) {
      vaciar(refs.historial);
      const lista = turnos.slice().sort(masNuevoPrimero).slice(0, 60);
      if (!lista.length) refs.historial.append(h('p', { class: 'nota', style: { padding: '.8em' } }, 'Aún no hay turnos. Abre la ruleta y gírala en clase.'));
      else {
        refs.historial.append(h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Alumno'), h('th', {}, 'Cuándo'), h('th', {}, 'Resultado'), h('th', {}, ''))),
          h('tbody', {}, lista.map((t) => {
            const res = RESULTADOS[t.r] || {};
            return h('tr', {},
              h('td', {}, t.n),
              h('td', {}, t.ts ? fechaHora(t.ts).replace(/\/\d{4},/, ',') : 'ahora'),
              h('td', {}, h('span', { class: 'badge', style: { background: res.fondo, color: res.color } }, res.nombre || t.r),
                h('span', { class: 'nota', style: { display: 'block', fontSize: '.78rem' } }, `ronda ${t.ronda || 1}`)),
              h('td', {}, h('button', {
                class: 'btn btn-suave btn-chico', type: 'button', title: 'Quitar turno', 'aria-label': `Quitar turno de ${t.n}`,
                onclick: async () => {
                  if (!(await confirmar('Quitar turno', `¿Quitar el turno de ${t.n}? Volverá a contar como pendiente en su ronda.`, { si: 'Quitar' }))) return;
                  try { await db.del(`${rutaTurnos(g.id)}/${t.id}`); avisar('Turno quitado'); } catch (e) { avisar('No se pudo quitar', 'error'); }
                }
              }, '✕')));
          }))));
        if (turnos.length > lista.length) refs.historial.append(h('p', { class: 'nota', style: { padding: '.6em .8em', margin: 0 } }, `Se muestran los ${lista.length} más recientes de ${turnos.length}. El Excel incluye todos.`));
      }
    }
  }

  function pintarLista() {
    if (!refs.lista) return;
    vaciar(refs.lista);
    for (const g of grupos) {
      const n = alumnosDe(g).length;
      refs.lista.append(h('div', { class: `fila-grupo${g.id === actual ? ' actual' : ''}` },
        h('div', { class: 'info' }, h('b', {}, g.nombre || '(sin nombre)'),
          h('span', { class: 'nota' }, `${n} ${n === 1 ? 'alumno' : 'alumnos'} · ${MODOS[g.modo || 'ronda'].nombre.replace(' (recomendado)', '')}${g.creada ? ` · creado ${fechaHora(g.creada).split(',')[0]}` : ''}`)),
        h('div', { class: 'fila' },
          g.id === actual ? h('span', { class: 'badge abierta' }, 'Administrando') : h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => elegir(g.id) }, 'Administrar'),
          h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => abrirRuleta(g.id) }, 'Ruleta'),
          h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => nuevoGrupo(g) }, 'Duplicar'),
          h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => eliminar(g) }, 'Eliminar'))));
    }
  }

  pintar();
  return () => {
    if (cancelarTurnos) cancelarTurnos();
    if (typeof cancelarGrupos === 'function') cancelarGrupos();
  };
}
