// Nube de Ideas — panel docente.
import { db } from '../shared/db.js';
import { iniciarDocente } from '../shared/shell.js';
import {
  h, vaciar, avisar, confirmar, dialogo, copiar, descargar, csv, enlace, nombreArchivo, qrNodo, qrPng,
  mostrarQrGrande, codigoAleatorio, fechaHora, soloFecha, aInputLocal, deInputLocal
} from '../shared/ui.js';
import {
  PALETAS, agrupar, crearLienzo, nubeEnCanvas, canvasABlob
} from '../shared/nube-lienzo.js';
import { pdfDesdeJpeg } from '../shared/pdf.js';
import { estadoNube, ETIQUETA_ESTADO, rutaNube, rutaPublicas, rutaParticipaciones } from './modelo.js';

iniciarDocente({
  raiz: document.getElementById('app'),
  titulo: 'Nube de Ideas',
  subtitulo: 'Panel docente',
  render: panel
});

function panel(cuerpo) {
  let nubes = [];
  let conteos = {};
  let vista = { tipo: 'lista' };
  let limpiezas = [];
  let cargado = false;
  let temporizador = null;

  const limpiarVista = () => { limpiezas.forEach((f) => f()); limpiezas = []; };
  const ir = (v) => { vista = v; pintar(); window.scrollTo(0, 0); };
  const urlAlumno = (id) => enlace(`./?n=${encodeURIComponent(id)}`);
  const buscar = (id) => nubes.find((n) => n.id === id);

  const cancelar = db.onCol('nubes', (docs) => {
    nubes = docs.sort((a, b) => (b.creada || 0) - (a.creada || 0));
    cargado = true;
    refrescarCuentas();
    // Solo repinta lista y detalle; el formulario no se toca para no perder lo escrito.
    if (vista.tipo === 'lista') pintar();
    if (vista.tipo === 'detalle') actualizarDetalle();
  }, () => {
    vaciar(cuerpo);
    cuerpo.append(h('div', { class: 'tarjeta' }, h('h2', {}, 'No se pudieron leer tus nubes'),
      h('p', {}, 'Revisa que las reglas de Firestore estén publicadas y que tu correo coincida con el de las reglas (ver README).')));
  });

  async function refrescarCuentas() {
    for (const n of nubes) {
      try { conteos[n.id] = await db.count(rutaPublicas(n.id)); } catch (e) { /* sin permiso o sin red */ }
    }
    if (vista.tipo === 'lista') pintar();
    if (vista.tipo === 'detalle') actualizarDetalle();
  }
  temporizador = setInterval(refrescarCuentas, 15000);

  /* ───────── Pintado ───────── */
  function pintar() {
    limpiarVista();
    vaciar(cuerpo);
    if (!cargado) { cuerpo.append(h('p', { class: 'nota' }, 'Cargando…')); return; }
    if (vista.tipo === 'lista') pintarLista();
    else if (vista.tipo === 'detalle') pintarDetalle();
    else if (vista.tipo === 'form') pintarFormulario();
  }

  /* ───────── Lista ───────── */
  function pintarLista() {
    cuerpo.append(h('div', { class: 'barra-sup' },
      h('h2', {}, 'Mis nubes'),
      h('button', { class: 'btn btn-primario', type: 'button', onclick: () => ir({ tipo: 'form', id: null }) }, '＋ Nueva nube')));
    if (!nubes.length) {
      cuerpo.append(h('div', { class: 'tarjeta' }, h('h3', {}, 'Aún no tienes nubes'),
        h('p', {}, 'Crea la primera: define el tema, la pregunta y comparte el enlace o el código QR con tu grupo.')));
      return;
    }
    const grupos = new Map();
    for (const n of nubes) {
      const t = (n.tema || '').trim() || 'Sin tema';
      if (!grupos.has(t)) grupos.set(t, []);
      grupos.get(t).push(n);
    }
    for (const [tema, lista] of grupos) {
      cuerpo.append(h('h2', { class: 'tema-grupo' }, tema), h('div', { class: 'cuadricula' }, lista.map(tarjeta)));
    }
  }

  function tarjeta(n) {
    const est = estadoNube(n);
    const c = conteos[n.id];
    return h('article', { class: 'tarjeta nube-card' },
      h('h3', {}, n.pregunta || '(sin pregunta)'),
      h('div', { class: 'meta' },
        h('span', { class: `badge ${est}` }, ETIQUETA_ESTADO[est]),
        h('span', {}, c === undefined ? '…' : `${c} ${c === 1 ? 'participación' : 'participaciones'}`),
        n.creada ? h('span', {}, soloFecha(n.creada)) : null),
      h('div', { class: 'acciones' },
        h('button', { class: 'btn btn-primario btn-chico', type: 'button', onclick: () => ir({ tipo: 'detalle', id: n.id }) }, 'Administrar'),
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => copiar(urlAlumno(n.id)) }, 'Copiar enlace'),
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => mostrarQrGrande(urlAlumno(n.id), 'Escanea para participar') }, 'Ver QR'),
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => abrirProyector(n.id) }, 'Proyector')));
  }

  const abrirProyector = (id) => window.open(enlace(`proyector.html?n=${encodeURIComponent(id)}`), '_blank', 'noopener');

  /* ───────── Detalle ───────── */
  let refsDetalle = {};
  function pintarDetalle() {
    const n = buscar(vista.id);
    if (!n) { ir({ tipo: 'lista' }); return; }
    refsDetalle = {};
    const url = urlAlumno(n.id);

    refsDetalle.titulo = h('h2', {}, '');
    refsDetalle.meta = h('div', { class: 'meta' });
    const caja = h('div', { class: 'mini-nube' });
    const tabla = h('div', { class: 'tabla-caja' });
    refsDetalle.estado = h('div', {});
    refsDetalle.edicion = h('div', {});

    cuerpo.append(
      h('div', { class: 'barra-sup' },
        h('button', { class: 'btn btn-suave', type: 'button', onclick: () => ir({ tipo: 'lista' }) }, '← Mis nubes'),
        h('button', { class: 'btn btn-suave', type: 'button', onclick: () => abrirProyector(n.id) }, '🖥️ Abrir modo proyector')),
      h('div', { class: 'detalle-grid' },
        h('div', { class: 'principal' },
          h('div', { class: 'tarjeta', style: { marginBottom: '1rem' } },
            h('p', { class: 'nota', style: { margin: 0 } }, n.tema || 'Sin tema'),
            refsDetalle.titulo, refsDetalle.meta),
          h('div', { class: 'tarjeta', style: { marginBottom: '1rem' } }, h('h3', {}, 'La nube en vivo'), caja),
          h('div', { class: 'tarjeta' },
            h('div', { class: 'barra-sup', style: { marginBottom: '.6rem' } },
              h('h3', { style: { margin: 0 } }, 'Participaciones'),
              h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => exportarCsv(buscar(n.id)) }, '⬇ Exportar CSV (Excel)')),
            tabla)),
        h('div', { class: 'lateral' },
          h('div', { class: 'tarjeta' }, h('h3', {}, 'Estado'), refsDetalle.estado),
          h('div', { class: 'tarjeta' },
            h('h3', {}, 'Enlace y código QR'),
            h('div', { class: 'enlace-caja' },
              h('input', { type: 'text', readonly: true, value: url, 'aria-label': 'Enlace de la nube', onfocus: (e) => e.target.select() }),
              h('button', { class: 'btn btn-suave', type: 'button', onclick: () => copiar(url) }, 'Copiar')),
            h('div', { style: { display: 'grid', placeItems: 'center', margin: '.8rem 0' } }, qrNodo(url, 180)),
            h('div', { class: 'acciones' },
              h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => mostrarQrGrande(url, 'Escanea para participar') }, 'Proyectar QR'),
              h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: async () => descargar(await qrPng(url), nombreArchivo(`qr ${n.pregunta}`, 'png')) }, 'Descargar QR'))),
          h('div', { class: 'tarjeta' },
            h('h3', {}, 'Acciones'),
            h('div', { class: 'acciones', style: { flexDirection: 'column', alignItems: 'stretch' } },
              h('button', { class: 'btn btn-suave', type: 'button', onclick: () => ir({ tipo: 'form', id: n.id }) }, '✏️ Editar configuración'),
              h('button', { class: 'btn btn-suave', type: 'button', onclick: () => duplicar(buscar(n.id)) }, '⧉ Duplicar nube'),
              h('button', { class: 'btn btn-suave', type: 'button', onclick: () => descargarImagen(buscar(n.id), 'jpeg') }, '🖼 Descargar JPEG'),
              h('button', { class: 'btn btn-suave', type: 'button', onclick: () => descargarImagen(buscar(n.id), 'pdf') }, '📄 Descargar PDF'),
              h('button', { class: 'btn btn-suave', type: 'button', onclick: () => vaciarNube(buscar(n.id)) }, '🧹 Vaciar y reiniciar'),
              h('button', { class: 'btn btn-peligro', type: 'button', onclick: () => eliminar(buscar(n.id)) }, '🗑 Eliminar nube'))))));

    const lienzo = crearLienzo(caja, { paleta: n.paleta });
    refsDetalle.lienzo = lienzo;
    limpiezas.push(() => lienzo.destruir());
    limpiezas.push(db.onCol(rutaPublicas(n.id), (docs) => lienzo.actualizar(agrupar(docs))));

    // Tabla en vivo: con nombre si la nube lo pidió; si no, desde los términos públicos.
    const origen = n.pideNombre ? rutaParticipaciones(n.id) : rutaPublicas(n.id);
    limpiezas.push(db.onCol(origen, (docs) => pintarTabla(tabla, docs, n.pideNombre), () => {
      vaciar(tabla); tabla.append(h('p', { class: 'nota', style: { padding: '1rem' } }, 'No se pudieron leer las participaciones.'));
    }));
    actualizarDetalle();
  }

  function pintarTabla(tabla, docs, conNombre) {
    vaciar(tabla);
    if (!docs.length) { tabla.append(h('p', { class: 'nota', style: { padding: '1rem', margin: 0 } }, 'Todavía no hay participaciones.')); return; }
    const ord = docs.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const tope = 300;
    tabla.append(h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Nombre'), h('th', {}, 'Palabra o frase'), h('th', {}, 'Hora de envío'))),
      h('tbody', {}, ord.slice(0, tope).map((d) => h('tr', {},
        h('td', {}, conNombre ? d.nombre : '—'), h('td', {}, d.t), h('td', {}, fechaHora(d.ts)))))));
    if (ord.length > tope) tabla.append(h('p', { class: 'nota', style: { padding: '.6rem 1rem', margin: 0 } }, `Se muestran las ${tope} más recientes. El CSV incluye todas.`));
  }

  function actualizarDetalle() {
    const n = buscar(vista.id);
    if (!n || !refsDetalle.titulo) return;
    const est = estadoNube(n);
    const c = conteos[n.id];
    refsDetalle.titulo.textContent = n.pregunta || '';
    vaciar(refsDetalle.meta);
    refsDetalle.meta.append(
      h('span', { class: `badge ${est}` }, ETIQUETA_ESTADO[est]),
      h('span', {}, c === undefined ? '' : `${c} ${c === 1 ? 'participación' : 'participaciones'}`),
      h('span', {}, `${n.cantidad || 1} ${n.formato === 'frase' ? (Number(n.cantidad) === 1 ? 'frase' : 'frases') : (Number(n.cantidad) === 1 ? 'palabra' : 'palabras')} por alumno`),
      h('span', {}, n.pideNombre ? 'Con nombre' : 'Anónima'));
    if (refsDetalle.lienzo) refsDetalle.lienzo.setPaleta(n.paleta);

    const e = vaciar(refsDetalle.estado);
    e.append(
      h('p', {}, h('span', { class: `badge ${est}` }, ETIQUETA_ESTADO[est]),
        n.forzado ? h('span', { class: 'nota' }, ` · control manual (${n.forzado === 'abierta' ? 'abierta' : 'cerrada'})`) : null),
      h('p', { class: 'nota' },
        `Abre: ${n.abreEn ? fechaHora(n.abreEn) : 'de inmediato'}`, h('br'),
        `Cierra: ${n.cierraEn ? fechaHora(n.cierraEn) : 'sin cierre automático'}`),
      h('div', { class: 'acciones' },
        est !== 'abierta' ? h('button', { class: 'btn btn-primario btn-chico', type: 'button', onclick: () => db.set(rutaNube(n.id), { forzado: 'abierta' }, { merge: true }) }, 'Abrir ahora') : null,
        est !== 'cerrada' ? h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => db.set(rutaNube(n.id), { forzado: 'cerrada' }, { merge: true }) }, 'Cerrar ahora') : null,
        n.forzado ? h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => db.set(rutaNube(n.id), { forzado: null }, { merge: true }) }, 'Volver al horario') : null));
  }

  /* ───────── Formulario ───────── */
  function pintarFormulario() {
    const editando = vista.id ? buscar(vista.id) : null;
    const base = editando || {
      tema: '', pregunta: '', cantidad: 3, formato: 'palabra', pideNombre: false, paleta: 'oceano', abreEn: null, cierraEn: null, forzado: null
    };
    const bloqueado = editando ? (conteos[editando.id] || 0) > 0 : false;
    const temas = [...new Set(nubes.map((n) => (n.tema || '').trim()).filter(Boolean))];

    const tema = h('input', { type: 'text', id: 'f-tema', list: 'f-temas', maxlength: '120', placeholder: 'Ej. Violencia, jóvenes y convivencialidad', value: base.tema || '' });
    const pregunta = h('textarea', { id: 'f-pregunta', maxlength: '240', rows: '3', placeholder: 'Ej. ¿Qué palabra te viene a la mente cuando escuchas “convivencia”?' });
    pregunta.value = base.pregunta || '';
    const cantidad = h('select', { id: 'f-cantidad' }, Array.from({ length: 10 }, (_, i) => h('option', { value: i + 1, selected: Number(base.cantidad) === i + 1 }, String(i + 1))));
    const formato = h('select', { id: 'f-formato' },
      h('option', { value: 'palabra', selected: base.formato !== 'frase' }, 'Palabra (hasta 25 caracteres)'),
      h('option', { value: 'frase', selected: base.formato === 'frase' }, 'Frase corta (hasta 60 caracteres)'));
    const nombre = h('select', { id: 'f-nombre' },
      h('option', { value: 'si', selected: !!base.pideNombre }, 'Nombre requerido (solo el primer nombre)'),
      h('option', { value: 'no', selected: !base.pideNombre }, 'Sin nombre (anónimo)'));
    if (bloqueado) [cantidad, formato, nombre].forEach((x) => { x.disabled = true; });

    let paleta = PALETAS[base.paleta] ? base.paleta : 'oceano';
    const contPaletas = h('div', { class: 'paletas', role: 'group', 'aria-label': 'Paleta de colores' });
    const pintarPaletas = () => {
      vaciar(contPaletas);
      for (const [pid, p] of Object.entries(PALETAS)) {
        contPaletas.append(h('button', {
          type: 'button', class: 'paleta-op', 'aria-pressed': String(pid === paleta), onclick: () => { paleta = pid; pintarPaletas(); }
        }, h('div', { class: 'muestras', style: { background: p.fondo } }, p.colores.slice(0, 5).map((c) => h('i', { style: { background: c } }))), p.nombre));
      }
    };
    pintarPaletas();

    const abre = h('input', { type: 'datetime-local', id: 'f-abre', value: aInputLocal(base.abreEn) });
    const cierra = h('input', { type: 'datetime-local', id: 'f-cierra', value: aInputLocal(base.cierraEn) });
    const error = h('p', { class: 'error', role: 'alert' });

    const form = h('form', {
      class: 'tarjeta', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        error.textContent = '';
        if (!pregunta.value.trim()) { error.textContent = 'Escribe la pregunta principal.'; pregunta.focus(); return; }
        const abreEn = deInputLocal(abre.value);
        const cierraEn = deInputLocal(cierra.value);
        if (abreEn && cierraEn && cierraEn <= abreEn) { error.textContent = 'El cierre debe ser posterior a la apertura.'; return; }
        const datos = {
          tema: tema.value.trim(), pregunta: pregunta.value.trim(), paleta, abreEn, cierraEn
        };
        if (!bloqueado) {
          datos.cantidad = Number(cantidad.value);
          datos.formato = formato.value;
          datos.pideNombre = nombre.value === 'si';
        }
        try {
          if (editando) {
            const cambioHorario = (editando.abreEn || null) !== abreEn || (editando.cierraEn || null) !== cierraEn;
            if (cambioHorario) datos.forzado = null; // el nuevo horario vuelve a mandar
            await db.set(rutaNube(editando.id), datos, { merge: true });
            Object.assign(editando, datos);
            avisar('Cambios guardados');
            ir({ tipo: 'detalle', id: editando.id });
          } else {
            const id = codigoAleatorio(16);
            const nueva = { ...datos, forzado: null, creada: Date.now() };
            await db.set(rutaNube(id), nueva);
            nubes.unshift({ id, ...nueva });
            avisar('Nube creada');
            ir({ tipo: 'detalle', id });
          }
        } catch (err) {
          error.textContent = 'No se pudo guardar. Revisa tu conexión y los permisos de Firestore.';
        }
      }
    },
    h('h2', {}, editando ? 'Editar nube' : 'Nueva nube'),
    h('label', { for: 'f-tema' }, 'Tema'), tema,
    h('datalist', { id: 'f-temas' }, temas.map((t) => h('option', { value: t }))),
    h('label', { for: 'f-pregunta' }, 'Pregunta principal'), pregunta,
    bloqueado ? h('p', { class: 'aviso-bloqueo' }, 'Esta nube ya tiene participaciones: la cantidad, el formato y la opción de nombre quedan bloqueados. Puedes vaciar la nube si necesitas cambiarlos.') : null,
    h('div', { class: 'rejilla-2' },
      h('div', {}, h('label', { for: 'f-cantidad' }, 'Palabras o frases por alumno'), cantidad),
      h('div', {}, h('label', { for: 'f-formato' }, 'Formato de respuesta'), formato)),
    h('label', { for: 'f-nombre' }, 'Nombre del alumno'), nombre,
    h('label', {}, 'Paleta de colores'), contPaletas,
    h('div', { class: 'rejilla-2' },
      h('div', {}, h('label', { for: 'f-abre' }, 'Apertura (hora de México)'), abre),
      h('div', {}, h('label', { for: 'f-cierra' }, 'Cierre (hora de México)'), cierra)),
    h('p', { class: 'nota' }, 'Déjalas vacías para abrir de inmediato y cerrar manualmente. Puedes abrir o cerrar a mano en cualquier momento.'),
    error,
    h('div', { class: 'fila' },
      h('button', { class: 'btn btn-primario', type: 'submit' }, editando ? 'Guardar cambios' : 'Crear nube'),
      h('button', { class: 'btn btn-suave', type: 'button', onclick: () => ir(editando ? { tipo: 'detalle', id: editando.id } : { tipo: 'lista' }) }, 'Cancelar')));
    cuerpo.append(h('div', { style: { maxWidth: '720px', margin: '0 auto' } }, form));
    tema.focus();
  }

  /* ───────── Acciones ───────── */
  async function duplicar(n) {
    const id = codigoAleatorio(16);
    const copia = { ...n };
    delete copia.id;
    const nueva = { ...copia, forzado: null, creada: Date.now() };
    await db.set(rutaNube(id), nueva);
    nubes.unshift({ id, ...nueva });
    avisar('Nube duplicada: ajusta la fecha si lo necesitas');
    ir({ tipo: 'form', id });
  }

  async function datosParaTabla(n) {
    const filas = await db.list(n.pideNombre ? rutaParticipaciones(n.id) : rutaPublicas(n.id));
    return filas.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  }

  async function exportarCsv(n) {
    const filas = await datosParaTabla(n);
    const tabla = [['Nombre', n.formato === 'frase' ? 'Frase' : 'Palabra', 'Fecha y hora de envío']];
    filas.forEach((f) => tabla.push([n.pideNombre ? f.nombre : '', f.t, fechaHora(f.ts)]));
    descargar(csv(tabla), nombreArchivo(`participaciones ${n.tema || n.pregunta} ${soloFecha(Date.now()).replace(/\//g, '-')}`, 'csv'));
    return true;
  }

  async function lienzoParaExportar(n) {
    const docs = await db.list(rutaPublicas(n.id));
    return nubeEnCanvas({ tema: n.tema, pregunta: n.pregunta, terminos: agrupar(docs), paletaId: n.paleta });
  }
  async function descargarImagen(n, tipo) {
    try {
      const canvas = await lienzoParaExportar(n);
      const jpeg = await canvasABlob(canvas, 'image/jpeg', 0.92);
      if (tipo === 'jpeg') descargar(jpeg, nombreArchivo(`nube ${n.pregunta}`, 'jpg'));
      else descargar(pdfDesdeJpeg(new Uint8Array(await jpeg.arrayBuffer()), canvas.width, canvas.height), nombreArchivo(`nube ${n.pregunta}`, 'pdf'));
    } catch (e) {
      avisar('No se pudo generar el archivo', 'error');
    }
  }

  async function vaciarNube(n) {
    const respaldo = h('div', {},
      h('p', {}, '¿Seguro que quieres vaciar esta nube? Antes puedes descargar un respaldo.'),
      h('div', { class: 'acciones' },
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => exportarCsv(n) }, '⬇ Respaldo CSV'),
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => descargarImagen(n, 'jpeg') }, '⬇ Respaldo JPEG')));
    const r = await dialogo({
      titulo: 'Vaciar y reiniciar', cuerpo: respaldo,
      botones: [{ texto: 'Cancelar', valor: false, clase: 'btn-suave' }, { texto: 'Vaciar nube', valor: true, clase: 'btn-peligro' }]
    });
    if (!r) return;
    try {
      await db.delCol(rutaPublicas(n.id));
      await db.delCol(rutaParticipaciones(n.id));
      conteos[n.id] = 0;
      avisar('Nube vaciada');
      refrescarCuentas();
    } catch (e) {
      avisar('No se pudo vaciar la nube', 'error');
    }
  }

  async function eliminar(n) {
    const ok = await confirmar('Eliminar nube', `Se borrará “${n.pregunta}” con todas sus participaciones. Esta acción no se puede deshacer.`, { si: 'Eliminar', peligro: true });
    if (!ok) return;
    try {
      await db.delCol(rutaPublicas(n.id));
      await db.delCol(rutaParticipaciones(n.id));
      await db.del(rutaNube(n.id));
      avisar('Nube eliminada');
      ir({ tipo: 'lista' });
    } catch (e) {
      avisar('No se pudo eliminar la nube', 'error');
    }
  }

  pintar();
  return () => { clearInterval(temporizador); limpiarVista(); if (typeof cancelar === 'function') cancelar(); };
}
