// Buzón de preguntas — panel docente.
import { db } from '../shared/db.js';
import { iniciarDocente } from '../shared/shell.js';
import {
  h, vaciar, avisar, confirmar, dialogo, copiar, descargar, enlace, nombreArchivo, qrNodo, qrPng, mostrarQrGrande, fechaHora, soloFecha
} from '../shared/ui.js';
import {
  LIMITE_MIN, LIMITE_MAX, LIMITE_INICIAL, MAX_ALUMNOS, rutaBuzon, rutaPreguntas, rutaPregunta, codigoNuevo,
  limiteDe, alumnosDe, usaLista, listaDesdeTexto, claseTexto, hora, horaDe, numeroDe, resumenParticipacion,
  exportarExcel, exportarHistorial
} from './modelo.js';

iniciarDocente({
  raiz: document.getElementById('app'),
  titulo: 'Buzón de preguntas',
  subtitulo: 'Panel docente',
  render: panel
});

const urlAlumno = (c) => enlace(`./?s=${encodeURIComponent(c)}`);
const urlProyector = (c) => enlace(`proyector.html?s=${encodeURIComponent(c)}`);
const abrirProyector = (c) => window.open(urlProyector(c), '_blank', 'noopener');

function panel(cuerpo) {
  let sesiones = [];
  let actual = null;
  let cargado = false;
  let preguntas = [];
  let cancelarPreguntas = null;
  let conteos = {};
  let refs = {};
  let borr = {}; // lo que el docente está escribiendo y aún no guarda
  let filtro = 'todas';
  let hist = { materia: '', grupo: '' };
  let firma = '';
  let creandoPrimera = false;

  const buscar = (c) => sesiones.find((s) => s.id === c);
  const sesionActual = () => (actual ? buscar(actual) : null);

  const cancelarSesiones = db.onCol('buzones', (docs) => {
    // Solo se repinta todo si cambió algo de la configuración (conserva lo que se escribe).
    const nuevaFirma = JSON.stringify(docs.map((d) => [d.id, d.materia, d.grupo, d.tema, d.limite, d.modoNombre, alumnosDe(d), d.abierta]).sort());
    sesiones = docs.sort((a, b) => (b.creada || 0) - (a.creada || 0));
    if (cargado && nuevaFirma === firma) { pintarProyeccion(); pintarVivo(); return; }
    firma = nuevaFirma;
    cargado = true;
    if (!actual || !buscar(actual)) {
      let guardado = null;
      try { guardado = localStorage.getItem('buzon:actual'); } catch (e) { /* sin almacenamiento */ }
      actual = guardado && buscar(guardado) ? guardado : (sesiones[0] ? sesiones[0].id : null);
      suscribirPreguntas();
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
      h('p', {}, 'Revisa que las reglas de Firestore estén publicadas (incluido el bloque del Buzón de preguntas) y que tu correo coincida con el de las reglas (ver README, paso 5).')));
  });

  async function contarTodas() {
    for (const s of sesiones) {
      if (s.id === actual) continue;
      try { conteos[s.id] = await db.count(rutaPreguntas(s.id)); } catch (e) { /* sin red */ }
    }
    pintarLista();
  }
  const temporizador = setInterval(contarTodas, 30000);

  function suscribirPreguntas() {
    if (cancelarPreguntas) { cancelarPreguntas(); cancelarPreguntas = null; }
    preguntas = [];
    if (!actual) return;
    const cod = actual;
    cancelarPreguntas = db.onCol(rutaPreguntas(cod), (docs) => {
      if (cod !== actual) return;
      const antes = preguntas.length;
      preguntas = docs;
      conteos[cod] = docs.length;
      pintarVivo();
      pintarLista();
      if (cargado && docs.length > antes && antes > 0) avisar('Nueva pregunta en el buzón');
    }, () => { /* sin permiso */ });
  }

  function elegir(codigo) {
    actual = codigo;
    borr = {};
    filtro = 'todas';
    try { localStorage.setItem('buzon:actual', codigo); } catch (e) { /* sin almacenamiento */ }
    suscribirPreguntas();
    pintar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function crearSesion(base, primera) {
    const ant = base || sesionActual();
    const codigo = codigoNuevo();
    const datos = {
      materia: ant ? ant.materia || '' : '',
      grupo: ant ? ant.grupo || '' : '',
      tema: '',
      limite: ant ? limiteDe(ant) : LIMITE_INICIAL,
      modoNombre: ant && ant.modoNombre === 'lista' ? 'lista' : 'libre',
      alumnos: ant ? alumnosDe(ant) : [],
      proyector: ant && ant.proyector === 'todas' ? 'todas' : 'seleccion',
      enPantalla: null,
      abierta: true,
      creada: Date.now()
    };
    try {
      if (ant && !primera && ant.abierta) await db.set(rutaBuzon(ant.id), { abierta: false }, { merge: true });
      await db.set(rutaBuzon(codigo), datos);
      if (!buscar(codigo)) sesiones.unshift({ id: codigo, ...datos });
      elegir(codigo);
      if (!primera) avisar('Nueva sesión creada con su propio QR');
    } catch (e) {
      avisar('No se pudo crear la sesión', 'error');
    }
  }

  async function guardar(parcial, s = sesionActual()) {
    if (!s) return false;
    try {
      await db.set(rutaBuzon(s.id), parcial, { merge: true });
      Object.assign(s, parcial);
      return true;
    } catch (e) {
      avisar('No se pudo guardar', 'error');
      return false;
    }
  }

  /* ───────── Pintado general ───────── */
  function pintar() {
    vaciar(cuerpo);
    refs = {};
    if (!cargado) { cuerpo.append(h('p', { class: 'nota' }, 'Cargando…')); return; }
    const s = sesionActual();
    if (!s) return;
    cuerpo.append(
      barraSesion(s),
      h('div', { class: 'cuadricula-2' }, tarjetaClase(s), tarjetaAjustes(s), tarjetaQr(s), tarjetaProyector(s)),
      h('h2', { class: 'titulo-seccion' }, 'En vivo'),
      h('p', { class: 'nota' }, 'Aquí siempre ves el nombre de quien pregunta, aunque haya elegido mostrarse como anónimo ante el grupo.'),
      h('div', { class: 'vivo' },
        h('section', { class: 'tarjeta' },
          h('div', { class: 'tarjeta-cab' }, (refs.tituloPreg = h('h2', {}, 'Preguntas')), (refs.filtros = h('div', { class: 'filtros', role: 'group', 'aria-label': 'Filtrar preguntas' }))),
          (refs.preguntas = h('div', { class: 'lista-preguntas' }))),
        h('section', { class: 'tarjeta' },
          h('div', { class: 'tarjeta-cab' }, h('h2', {}, 'Participación'),
            h('button', { class: 'btn btn-primario btn-chico', type: 'button', onclick: () => exportar(s) }, '⬇ Excel de esta sesión')),
          (refs.participacion = h('div')))),
      historial());
    pintarVivo();
    pintarProyeccion();
    pintarLista();
  }

  function barraSesion(s) {
    const interruptor = h('input', {
      type: 'checkbox', checked: !!s.abierta, id: 'abierta',
      onchange: async (e) => {
        await guardar({ abierta: e.target.checked });
        pintarLista();
        avisar(e.target.checked ? 'Sesión abierta: los alumnos pueden enviar preguntas' : 'Sesión cerrada: ya no recibe preguntas');
      }
    });
    return h('div', { class: 'sesion-barra' },
      h('div', {},
        h('span', { class: 'nota' }, 'Sesión actual'),
        h('div', { class: 'cod' }, s.id),
        h('span', { class: 'nota' }, `${claseTexto(s)}${s.creada ? ` · ${fechaHora(s.creada)}` : ''}`)),
      h('label', { class: 'interruptor', for: 'abierta' }, interruptor, 'Recibiendo preguntas'),
      h('button', { class: 'btn btn-primario', type: 'button', onclick: nuevaSesion }, '＋ Nueva sesión'));
  }

  async function nuevaSesion() {
    const s = sesionActual();
    const ok = await confirmar('Nueva sesión',
      'Se creará una sesión nueva (una clase) con su propio código y QR. La actual se cerrará y queda guardada en el historial. Se copian la materia, el grupo, el límite y la lista de alumnos; el tema queda en blanco.',
      { si: 'Crear sesión' });
    if (ok) crearSesion(s, false);
  }

  /* 1. Datos de la clase */
  function tarjetaClase(s) {
    const lista = (campo) => Array.from(new Set(sesiones.map((x) => (x[campo] || '').trim()).filter(Boolean))).sort();
    const campo = (id, etiqueta, ph, max, sugerencias) => {
      const i = h('input', {
        type: 'text', id: `c-${id}`, maxlength: String(max), placeholder: ph, list: sugerencias ? `dl-${id}` : null,
        oninput: (e) => { borr[id] = e.target.value; }
      });
      i.value = borr[id] !== undefined ? borr[id] : (s[id] || '');
      return [h('label', { for: `c-${id}` }, etiqueta), i,
        sugerencias ? h('datalist', { id: `dl-${id}` }, lista(id).map((v) => h('option', { value: v }))) : null];
    };
    return h('section', { class: 'tarjeta' },
      h('h2', {}, 'Datos de la clase'),
      h('p', { class: 'nota' }, 'Se guardan con cada participación y aparecen en el Excel.'),
      h('div', { class: 'rejilla-2' },
        h('div', {}, campo('materia', 'Materia', 'Teoría de la Medida', 80, true)),
        h('div', {}, campo('grupo', 'Grupo', '3° A', 30, true))),
      campo('tema', 'Tema de la sesión', 'Confiabilidad y validez', 120, false),
      h('button', {
        class: 'btn btn-primario', type: 'button', style: { marginTop: '.9em' },
        onclick: async () => {
          const val = (k) => (borr[k] !== undefined ? borr[k] : s[k] || '').trim();
          const ok = await guardar({ materia: val('materia'), grupo: val('grupo'), tema: val('tema') });
          if (!ok) return;
          delete borr.materia; delete borr.grupo; delete borr.tema;
          avisar('Datos de la clase guardados');
        }
      }, 'Guardar datos de la clase'));
  }

  /* 2. Ajustes: límite, modo de nombre y lista */
  function tarjetaAjustes(s) {
    const lim = limiteDe(s);
    const etiqueta = h('output', { class: 'valor', for: 'limite' }, String(lim));
    const texto = (n) => `${n} ${n === 1 ? 'participación' : 'participaciones'} por alumno en esta sesión`;
    const leyenda = h('span', { class: 'nota' }, texto(lim));
    const deslizador = h('input', {
      type: 'range', id: 'limite', min: String(LIMITE_MIN), max: String(LIMITE_MAX), step: '1', value: String(lim),
      oninput: (e) => { etiqueta.textContent = e.target.value; leyenda.textContent = texto(Number(e.target.value)); },
      onchange: async (e) => {
        const n = Number(e.target.value);
        if (await guardar({ limite: n })) { avisar(`Límite: ${texto(n)}`); pintarVivo(); }
      }
    });

    const alumnos = alumnosDe(s);
    const modo = s.modoNombre === 'lista' ? 'lista' : 'libre';
    const opcion = (valor, titulo, detalle) => h('label', { class: `opcion${modo === valor ? ' activa' : ''}`, for: `modo-${valor}` },
      h('input', {
        type: 'radio', name: 'modo', id: `modo-${valor}`, value: valor, checked: modo === valor,
        onchange: async () => {
          if (valor === 'lista' && !alumnosDe(s).length) {
            avisar('Primero carga y guarda la lista de alumnos', 'error');
            pintar();
            return;
          }
          if (await guardar({ modoNombre: valor })) avisar(valor === 'lista' ? 'Los alumnos elegirán su nombre de la lista' : 'Los alumnos escribirán su nombre');
        }
      }),
      h('span', {}, h('b', {}, titulo), h('small', {}, detalle)));

    const area = h('textarea', {
      id: 'lista', rows: '7', placeholder: 'Un nombre por renglón.\nPuedes copiar y pegar la columna de nombres desde Excel.',
      oninput: (e) => { borr.lista = e.target.value; cuenta.textContent = cuentaTexto(); }
    });
    area.value = borr.lista !== undefined ? borr.lista : alumnos.join('\n');
    const cuentaTexto = () => {
      const n = listaDesdeTexto(area.value).length;
      return `${n} ${n === 1 ? 'alumno' : 'alumnos'}${borr.lista !== undefined ? ' · sin guardar' : ''}`;
    };
    const cuenta = h('span', { class: 'nota' }, cuentaTexto());

    const guardarLista = async () => {
      const nueva = listaDesdeTexto(area.value);
      const parcial = { alumnos: nueva };
      if (!nueva.length && s.modoNombre === 'lista') parcial.modoNombre = 'libre';
      if (!(await guardar(parcial))) return;
      delete borr.lista;
      avisar(nueva.length ? `Lista guardada: ${nueva.length} alumnos` : 'Lista vaciada');
      if (parcial.modoNombre) avisar('Sin lista: los alumnos escribirán su nombre');
      pintar();
    };

    return h('section', { class: 'tarjeta' },
      h('h2', {}, 'Ajustes'),
      h('label', { for: 'limite' }, 'Participaciones permitidas por alumno'),
      h('div', { class: 'deslizador' }, h('span', { class: 'extremo' }, String(LIMITE_MIN)), deslizador, h('span', { class: 'extremo' }, String(LIMITE_MAX)), etiqueta),
      leyenda,
      h('label', {}, '¿Cómo registra su nombre el alumno?'),
      h('div', { class: 'opciones' },
        opcion('libre', 'Lo escribe', 'Cada alumno teclea su nombre.'),
        opcion('lista', 'Lo elige de la lista', alumnos.length ? `Elige entre los ${alumnos.length} nombres que cargaste.` : 'Carga primero la lista de abajo.')),
      h('details', { class: 'lista-alumnos', open: modo === 'lista' || borr.lista !== undefined || null },
        h('summary', {}, 'Lista de alumnos del grupo'),
        area,
        h('div', { class: 'fila', style: { justifyContent: 'space-between', marginTop: '.5em' } },
          cuenta,
          h('div', { class: 'fila' },
            h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => importarRuleta(area, cuenta, cuentaTexto) }, 'Traer de la Ruleta'),
            h('button', { class: 'btn btn-primario btn-chico', type: 'button', onclick: guardarLista }, 'Guardar lista'))),
        h('p', { class: 'nota', style: { marginTop: '.5em' } }, `Máximo ${MAX_ALUMNOS} nombres. La lista se copia a las sesiones nuevas.`)));
  }

  // Copia la lista de un grupo de la Ruleta de participación.
  async function importarRuleta(area, cuenta, cuentaTexto) {
    let grupos = [];
    try { grupos = await db.list('ruletas'); } catch (e) { avisar('No se pudieron leer los grupos de la Ruleta', 'error'); return; }
    grupos = grupos.filter((g) => alumnosDe(g).length);
    if (!grupos.length) { avisar('Todavía no tienes grupos con alumnos en la Ruleta', 'error'); return; }
    const sel = h('select', {}, grupos.map((g) => h('option', { value: g.id }, `${g.nombre || 'Grupo'} (${alumnosDe(g).length})`)));
    const r = await dialogo({
      titulo: 'Traer lista de la Ruleta',
      cuerpo: h('div', {}, h('p', {}, 'Elige el grupo. Sus nombres reemplazarán lo que está en el cuadro (después pulsa «Guardar lista»).'), sel),
      botones: [{ texto: 'Cancelar', valor: false, clase: 'btn-suave' }, { texto: 'Traer nombres', valor: true, clase: 'btn-primario' }]
    });
    if (!r) return;
    const g = grupos.find((x) => x.id === sel.value);
    area.value = alumnosDe(g).map((a) => a.n).join('\n');
    borr.lista = area.value;
    cuenta.textContent = cuentaTexto();
    area.focus();
  }

  /* 3. QR y enlace */
  function tarjetaQr(s) {
    const url = urlAlumno(s.id);
    return h('section', { class: 'tarjeta' },
      h('h2', {}, 'Código QR y enlace'),
      h('div', { class: 'qr-fila' },
        qrNodo(url, 170),
        h('div', {}, h('p', { class: 'nota', style: { margin: 0 } }, 'Código para escribir'), h('div', { class: 'codigo-grande' }, s.id))),
      h('label', { for: 'enlace' }, 'Enlace para tus alumnos'),
      h('input', { type: 'text', id: 'enlace', readonly: true, value: url, onfocus: (e) => e.target.select() }),
      h('div', { class: 'fila', style: { marginTop: '.7em' } },
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => copiar(url) }, 'Copiar enlace'),
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: async () => descargar(await qrPng(url), nombreArchivo(`qr buzon ${s.id}`, 'png')) }, 'Descargar QR'),
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => mostrarQrGrande(url, `Código ${s.id}`) }, 'Proyectar QR')));
  }

  /* 4. Proyector */
  function tarjetaProyector(s) {
    const modo = s.proyector === 'todas' ? 'todas' : 'seleccion';
    const opcion = (valor, titulo, detalle) => h('label', { class: `opcion${modo === valor ? ' activa' : ''}`, for: `proy-${valor}` },
      h('input', {
        type: 'radio', name: 'proyector', id: `proy-${valor}`, value: valor, checked: modo === valor,
        onchange: async () => {
          if (await guardar({ proyector: valor })) {
            cuerpo.querySelectorAll('input[name=proyector]').forEach((r) => r.closest('.opcion').classList.toggle('activa', r.checked));
          }
        }
      }),
      h('span', {}, h('b', {}, titulo), h('small', {}, detalle)));
    refs.enPantalla = h('div', { class: 'en-pantalla' });
    return h('section', { class: 'tarjeta' },
      h('h2', {}, 'Proyector'),
      h('p', { class: 'nota' }, 'En el proyector, las preguntas anónimas aparecen sin nombre.'),
      h('div', { class: 'opciones' },
        opcion('seleccion', 'Solo la que yo elija', 'Usa el botón 📽 de cada pregunta.'),
        opcion('todas', 'Todas las pendientes', 'Se muestran conforme llegan.')),
      refs.enPantalla,
      h('button', { class: 'btn btn-primario btn-grande', type: 'button', style: { marginTop: '.8em' }, onclick: () => abrirProyector(s.id) }, '📽 Abrir proyector'));
  }

  function pintarProyeccion() {
    if (!refs.enPantalla) return;
    const s = sesionActual();
    vaciar(refs.enPantalla);
    const p = s && s.enPantalla ? preguntas.find((x) => x.id === s.enPantalla) : null;
    if (!p) { refs.enPantalla.append(h('span', { class: 'nota' }, 'No hay ninguna pregunta en pantalla.')); return; }
    refs.enPantalla.append(
      h('div', {}, h('span', { class: 'nota' }, 'En pantalla ahora:'), h('p', { class: 'texto' }, p.texto)),
      h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => proyectar(null) }, 'Quitar'));
  }

  async function proyectar(id) {
    if (await guardar({ enPantalla: id })) {
      pintarProyeccion();
      pintarVivo();
      if (id) avisar('Pregunta enviada al proyector');
    }
  }

  /* ───────── En vivo: preguntas y participación ───────── */
  function pintarVivo() {
    const s = sesionActual();
    if (!s || !refs.preguntas) return;
    const respondidas = preguntas.filter((p) => p.estado === 'respondida').length;
    const cuentas = { todas: preguntas.length, pendientes: preguntas.length - respondidas, respondidas };
    refs.tituloPreg.textContent = `Preguntas (${preguntas.length})`;
    vaciar(refs.filtros);
    [['todas', 'Todas'], ['pendientes', 'Pendientes'], ['respondidas', 'Respondidas']].forEach(([id, txt]) => {
      refs.filtros.append(h('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(filtro === id),
        onclick: () => { filtro = id; pintarVivo(); }
      }, `${txt} · ${cuentas[id]}`));
    });

    const lim = limiteDe(s);
    const visibles = preguntas.slice().sort((a, b) => horaDe(b) - horaDe(a) || String(b.id).localeCompare(String(a.id)))
      .filter((p) => filtro === 'todas' || (filtro === 'respondidas') === (p.estado === 'respondida'));
    vaciar(refs.preguntas);
    if (!visibles.length) {
      refs.preguntas.append(h('p', { class: 'vacio' }, preguntas.length ? 'No hay preguntas con este filtro.' : 'Todavía no llegan preguntas. Comparte el QR o el código con tu grupo.'));
    }
    for (const p of visibles) {
      const resp = p.estado === 'respondida';
      const enPantalla = s.enPantalla === p.id;
      refs.preguntas.append(h('article', { class: `pregunta${resp ? ' respondida' : ''}${enPantalla ? ' proyectada' : ''}` },
        h('div', { class: 'pregunta-cab' },
          h('b', {}, p.nombre),
          h('span', { class: 'nota' }, `${hora(p.ts)} · participación ${numeroDe(p)} de ${lim}`),
          p.anonima ? h('span', { class: 'badge anonima' }, 'Anónima para el grupo') : null,
          enPantalla ? h('span', { class: 'badge abierta' }, 'En pantalla') : null),
        h('p', { class: 'texto' }, p.texto),
        h('div', { class: 'fila' },
          h('button', {
            class: `btn btn-chico ${resp ? 'btn-suave' : 'btn-primario'}`, type: 'button',
            onclick: () => marcar(p, resp ? 'pendiente' : 'respondida')
          }, resp ? '↺ Marcar pendiente' : '✓ Respondida'),
          h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => proyectar(enPantalla ? null : p.id) }, enPantalla ? 'Quitar de pantalla' : '📽 Proyectar'),
          h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => eliminarPregunta(p) }, 'Eliminar'))));
    }

    // Participación por alumno.
    const filas = resumenParticipacion(s, preguntas);
    const conPart = filas.filter((f) => f.n > 0).length;
    vaciar(refs.participacion);
    refs.participacion.append(h('p', { class: 'nota' },
      usaLista(s) || alumnosDe(s).length
        ? `${conPart} de ${alumnosDe(s).length} alumnos de la lista han participado.`
        : `${conPart} ${conPart === 1 ? 'alumno ha' : 'alumnos han'} participado.`));
    if (!filas.length) return;
    refs.participacion.append(h('div', { class: 'tabla-caja' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Alumno'), h('th', {}, 'Participaciones'))),
      h('tbody', {}, filas.map((f) => h('tr', { class: f.n === 0 ? 'sin' : '' },
        h('td', {}, f.nombre),
        h('td', {}, h('span', { class: 'puntos', 'aria-hidden': 'true' },
          Array.from({ length: Math.max(lim, f.n) }, (_, i) => h('span', { class: `punto${i < f.n ? ' lleno' : ''}` }))),
        ` ${f.n}${f.n >= lim ? ' (tope)' : ''}`)))))));
  }

  async function marcar(p, estado) {
    try {
      await db.set(rutaPregunta(actual, p.id), { estado }, { merge: true });
    } catch (e) {
      avisar('No se pudo actualizar la pregunta', 'error');
    }
  }

  async function eliminarPregunta(p) {
    const ok = await confirmar('Eliminar pregunta',
      `Se borrará la pregunta de ${p.nombre}. Su lugar queda libre: podrá enviar otra pregunta en esta sesión.`, { si: 'Eliminar', peligro: true });
    if (!ok) return;
    try {
      await db.del(rutaPregunta(actual, p.id));
      if (sesionActual() && sesionActual().enPantalla === p.id) await guardar({ enPantalla: null });
      avisar('Pregunta eliminada');
    } catch (e) {
      avisar('No se pudo eliminar', 'error');
    }
  }

  async function exportar(s) {
    try {
      const lista = s.id === actual ? preguntas : await db.list(rutaPreguntas(s.id));
      if (!lista.length && !alumnosDe(s).length) { avisar('Todavía no hay preguntas para exportar', 'error'); return; }
      exportarExcel(s, lista);
    } catch (e) {
      avisar('No se pudo exportar', 'error');
    }
  }

  /* ───────── Historial de sesiones ───────── */
  const filtradas = () => sesiones.filter((s) => (!hist.materia || (s.materia || '') === hist.materia) && (!hist.grupo || (s.grupo || '') === hist.grupo));

  function historial() {
    const valores = (campo) => Array.from(new Set(sesiones.map((s) => s[campo] || ''))).sort();
    const selector = (campo, todas) => h('select', {
      'aria-label': `Filtrar por ${campo}`,
      onchange: (e) => { hist[campo] = e.target.value; pintarLista(); }
    }, h('option', { value: '' }, todas), valores(campo).map((v) => h('option', { value: v, selected: hist[campo] === v }, v || '(sin nombre)')));
    refs.lista = h('div', { class: 'lista-sesiones' });
    return h('section', {},
      h('h2', { class: 'titulo-seccion' }, 'Historial de sesiones'),
      h('p', { class: 'nota' }, 'Cada sesión es una clase. Filtra por materia y grupo para descargar el acumulado del semestre.'),
      h('div', { class: 'fila filtros-hist' },
        selector('materia', 'Todas las materias'),
        selector('grupo', 'Todos los grupos'),
        h('button', { class: 'btn btn-primario', type: 'button', onclick: exportarAcumulado }, '⬇ Excel acumulado')),
      refs.lista);
  }

  async function exportarAcumulado() {
    const lista = filtradas().slice().sort((a, b) => (a.creada || 0) - (b.creada || 0));
    if (!lista.length) { avisar('No hay sesiones con ese filtro', 'error'); return; }
    try {
      const grupos = [];
      for (const s of lista) grupos.push({ sesion: s, preguntas: s.id === actual ? preguntas : await db.list(rutaPreguntas(s.id)) });
      exportarHistorial(grupos, [hist.materia, hist.grupo].filter(Boolean).join(' '));
    } catch (e) {
      avisar('No se pudo exportar el historial', 'error');
    }
  }

  function pintarLista() {
    if (!refs.lista) return;
    vaciar(refs.lista);
    const lista = filtradas();
    if (!lista.length) { refs.lista.append(h('p', { class: 'nota' }, 'No hay sesiones con ese filtro.')); return; }
    for (const s of lista) {
      const c = s.id === actual ? preguntas.length : conteos[s.id];
      refs.lista.append(h('div', { class: `fila-sesion${s.id === actual ? ' actual' : ''}` },
        h('div', { class: 'info' },
          h('b', {}, `${claseTexto(s)}${s.tema ? ` — ${s.tema}` : ''}`),
          h('span', { class: 'nota' }, `${s.creada ? `${soloFecha(s.creada)}, ${hora(s.creada)}` : ''} · ${s.id} · ${c === undefined ? '…' : c} ${c === 1 ? 'pregunta' : 'preguntas'} · `,
            h('span', { class: `badge ${s.abierta ? 'abierta' : 'cerrada'}` }, s.abierta ? 'Abierta' : 'Cerrada'))),
        h('div', { class: 'fila' },
          s.id === actual ? h('span', { class: 'badge abierta' }, 'Administrando') : h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => elegir(s.id) }, 'Administrar'),
          h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => abrirProyector(s.id) }, 'Proyectar'),
          h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => exportar(s) }, 'Excel'),
          h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => eliminarSesion(s) }, 'Eliminar'))));
    }
  }

  async function eliminarSesion(s) {
    const ok = await confirmar('Eliminar sesión',
      `Se borrará la sesión ${s.id} (${claseTexto(s)}) con todas sus preguntas y participaciones. Descarga antes el Excel si lo necesitas. No se puede deshacer.`,
      { si: 'Eliminar', peligro: true });
    if (!ok) return;
    try {
      await db.delCol(rutaPreguntas(s.id));
      await db.del(rutaBuzon(s.id));
      sesiones = sesiones.filter((x) => x.id !== s.id);
      if (s.id === actual) {
        actual = sesiones[0] ? sesiones[0].id : null;
        suscribirPreguntas();
      }
      avisar('Sesión eliminada');
      if (!sesiones.length) crearSesion(null, true); else pintar();
    } catch (e) {
      avisar('No se pudo eliminar', 'error');
    }
  }

  pintar();
  return () => {
    clearInterval(temporizador);
    if (cancelarPreguntas) cancelarPreguntas();
    if (typeof cancelarSesiones === 'function') cancelarSesiones();
  };
}
