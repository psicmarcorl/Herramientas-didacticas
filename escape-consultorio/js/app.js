/* Código MEDIR · escape del consultorio
   Lógica del juego. El contenido (textos, respuestas, pistas) está en js/contenido.js. */
(function () {
  'use strict';

  var C = window.CONTENIDO;
  var R = C.reglas;
  var CLAVE = 'codigo-medir-v1';
  var movimientoReducido = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ================================================================ Utilidades */

  function $(sel, raiz) { return (raiz || document).querySelector(sel); }

  // Crea elementos: el('div', {class: 'x', text: 'hola', onclick: fn}, hijos...)
  function el(tag, attrs) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'disabled' || k === 'checked' || k === 'hidden' || k === 'open' || k === 'selected') n[k] = !!v;
      else if (k === 'value') n.value = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) agregar(n, arguments[i]);
    return n;
  }
  function agregar(n, h) {
    if (h === null || h === undefined || h === false) return;
    if (Array.isArray(h)) { h.forEach(function (x) { agregar(n, x); }); return; }
    n.appendChild(typeof h === 'string' || typeof h === 'number' ? document.createTextNode(String(h)) : h);
  }
  function deHTML(str) {
    var t = document.createElement('template');
    t.innerHTML = str.trim();
    return t.content.firstChild;
  }
  function barajar(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function barajarDistinto(a) {
    if (a.length < 2) return a.slice();
    var b;
    do { b = barajar(a); } while (b.every(function (x, i) { return x === a[i]; }));
    return b;
  }
  function rango(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function normalizar(t) {
    return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function anunciar(msg) {
    var a = $('#avisos');
    a.textContent = '';
    setTimeout(function () { a.textContent = msg; }, 60);
  }
  function formatoTiempo(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60;
    var dd = function (x) { return (x < 10 ? '0' : '') + x; };
    return h > 0 ? h + ':' + dd(m) + ':' + dd(seg) : dd(m) + ':' + dd(seg);
  }
  function tiempoLargo(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60;
    return (h ? h + ' h ' : '') + m + ' min ' + seg + ' s';
  }

  /* ================================================================ Íconos (SVG) */

  var TRAZO48 = 'viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  var TRAZO24 = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  var ICONOS = {
    archivero: [TRAZO48, '<rect x="10" y="5" width="28" height="38" rx="2"/><path d="M10 17.5h28M10 30h28"/><rect x="20" y="10" width="8" height="3"/><rect x="20" y="22.5" width="8" height="3"/><rect x="20" y="35" width="8" height="3"/>'],
    ensamblaje: [TRAZO48, '<rect x="3" y="31" width="42" height="9" rx="4.5"/><circle cx="10" cy="35.5" r="1.5"/><circle cx="24" cy="35.5" r="1.5"/><circle cx="38" cy="35.5" r="1.5"/><rect x="7" y="21" width="9" height="10"/><rect x="20" y="15" width="9" height="16"/><rect x="33" y="9" width="9" height="22"/>'],
    constructo: [TRAZO48, '<circle cx="24" cy="8" r="4"/><circle cx="13" cy="23" r="3.5"/><circle cx="35" cy="23" r="3.5"/><circle cx="8" cy="39" r="2.5"/><circle cx="18" cy="39" r="2.5"/><circle cx="30" cy="39" r="2.5"/><circle cx="40" cy="39" r="2.5"/><path d="M21.5 11.5L15 20M26.5 11.5L33 20M11.5 26.5L9 36.5M14.5 26.5L17 36.5M33.5 26.5L31 36.5M36.5 26.5L39 36.5"/>'],
    taller: [TRAZO48, '<circle cx="20" cy="20" r="12"/><path d="M29 29l12 12"/><path d="M13 17h14M13 22h9"/>'],
    likert: [TRAZO48, '<rect x="11" y="4" width="26" height="40" rx="2"/><path d="M16 34v-2M20 34v-4M24 34v-6M28 34v-8M32 34v-10"/><circle cx="32" cy="16" r="1.5"/>'],
    candado: [TRAZO48, '<rect x="12" y="22" width="24" height="20" rx="3"/><path d="M17 22v-7a7 7 0 0 1 14 0v7"/><path d="M24 30v5"/>'],
    puertaFinal: [TRAZO48, '<path d="M10 44V6h28v38"/><path d="M6 44h36"/><circle cx="31" cy="26" r="2"/><path d="M16 14h16"/>'],
    bien: ['viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"', '<path d="M5 12l4 4 10-10"/>'],
    mal: ['viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true" focusable="false"', '<path d="M6 6l12 12M18 6L6 18"/>'],
    bombilla: [TRAZO24, '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>'],
    reloj: [TRAZO24, '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    lampara: [TRAZO24, '<path d="M8 3h8l3 8H5z"/><path d="M12 11v8M7 21h10"/><path d="M3 14l2-1M21 14l-2-1"/>'],
    arriba: ['viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"', '<path d="M6 15l6-6 6 6"/>'],
    abajo: ['viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"', '<path d="M6 9l6 6 6-6"/>'],
    atras: ['viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"', '<path d="M15 6l-6 6 6 6"/>'],
    entrar: [TRAZO24, '<path d="M14 3h5v18h-5"/><path d="M3 12h11M10 8l4 4-4 4"/>'],
    imprimir: [TRAZO24, '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>']
  };
  function icono(nombre, tam, clase) {
    var d = ICONOS[nombre];
    return deHTML('<svg ' + d[0] + ' width="' + tam + '" height="' + tam + '"' + (clase ? ' class="' + clase + '"' : '') + '>' + d[1] + '</svg>');
  }

  /* ================================================================ Estado y guardado */

  function estadoNuevo() {
    return {
      v: 1,
      pantalla: 'inicio',
      pareja: null,
      inicio: null,
      fin: null,
      orden: barajarDistinto(rango(C.salas.length)),
      salas: C.salas.map(function () { return { reto: 0, fallos: 0, pistas: 0, completa: false, pistasVistas: {} }; }),
      pistasUsadas: 0,
      indicador: Math.floor(Math.random() * buscarReto('redactar').indicadores.length),
      item: null,
      borrador: '',
      salaActual: 0,
      uv: false
    };
  }
  function buscarReto(tipo) {
    for (var i = 0; i < C.salas.length; i++) {
      for (var j = 0; j < C.salas[i].retos.length; j++) {
        if (C.salas[i].retos[j].tipo === tipo) return C.salas[i].retos[j];
      }
    }
    return { indicadores: [''] };
  }
  function cargar() {
    try {
      var t = window.localStorage.getItem(CLAVE);
      if (!t) return null;
      var e = JSON.parse(t);
      if (!e || e.v !== 1 || !Array.isArray(e.salas) || e.salas.length !== C.salas.length || !Array.isArray(e.orden)) return null;
      return e;
    } catch (err) { return null; }
  }
  function guardar() {
    try { window.localStorage.setItem(CLAVE, JSON.stringify(E)); } catch (err) { /* sin guardado: la app sigue funcionando */ }
  }
  function borrarGuardado() {
    try { window.localStorage.removeItem(CLAVE); } catch (err) { /* nada */ }
  }

  var E = cargar() || estadoNuevo();
  var U = { clave: null }; // estado temporal del reto en pantalla (no se guarda)

  /* ================================================================ Puntaje */

  function puntosSala(i) {
    var s = E.salas[i];
    return Math.max(R.minimoPorSala, R.puntosPorSala - s.fallos * R.penalizacionIntento - s.pistas * R.penalizacionPista);
  }
  function puntajeTotal() {
    var t = 0;
    E.salas.forEach(function (s, i) { if (s.completa) t += puntosSala(i); });
    return t;
  }
  function pistasRestantes() { return Math.max(0, R.pistasTotales - E.pistasUsadas); }
  function todasCompletas() { return E.salas.every(function (s) { return s.completa; }); }
  function siguienteSala() {
    for (var i = 0; i < E.salas.length; i++) if (!E.salas[i].completa) return i;
    return -1;
  }

  /* ================================================================ Render general */

  var pantallas = {};

  function render(opc) {
    opc = opc || {};
    var activo = document.activeElement;
    var claveFoco = activo && activo.getAttribute ? activo.getAttribute('data-k') : null;
    renderBarra();
    var main = $('#principal');
    main.textContent = '';
    var fn = pantallas[E.pantalla] || pantallas.inicio;
    main.appendChild(fn());
    document.body.classList.toggle('uv', E.pantalla === 'sala' && !!E.uv);
    if (opc.nuevaPantalla) {
      window.scrollTo(0, 0);
      var h = main.querySelector('h1');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    } else if (opc.foco) {
      enfocar(opc.foco);
    } else if (claveFoco) {
      enfocar(claveFoco);
    }
  }
  function enfocar(clave) {
    var n = document.querySelector('[data-k="' + clave + '"]');
    if (n && n.disabled && n.getAttribute('data-k-alt')) n = document.querySelector('[data-k="' + n.getAttribute('data-k-alt') + '"]');
    if (n && !n.disabled) n.focus({ preventScroll: true });
  }
  function ir(pantalla) {
    E.pantalla = pantalla;
    guardar();
    render({ nuevaPantalla: true });
  }

  function renderBarra() {
    var b = $('#barra');
    var visible = E.pareja && ['mapa', 'sala', 'letra', 'puerta'].indexOf(E.pantalla) !== -1;
    b.hidden = !visible;
    b.textContent = '';
    if (!visible) return;
    if (E.pantalla !== 'mapa') {
      b.appendChild(el('button', { type: 'button', class: 'boton-mapa', 'data-k': 'barra-mapa', onclick: function () { ir('mapa'); } }, icono('atras', 18), 'Mapa'));
    }
    b.appendChild(el('span', { class: 'dato reloj', 'aria-label': 'Tiempo transcurrido' }, icono('reloj', 18, 'reloj-icono'), el('span', { id: 'reloj', text: formatoTiempo(tiempoTranscurrido()) })));
    b.appendChild(el('span', { class: 'dato' }, 'Puntaje ', el('strong', { text: String(puntajeTotal()) })));
    b.appendChild(el('span', { class: 'dato', 'aria-label': 'Pistas disponibles: ' + pistasRestantes() + ' de ' + R.pistasTotales }, icono('bombilla', 18), el('strong', { text: pistasRestantes() + '/' + R.pistasTotales })));
  }
  function tiempoTranscurrido() {
    if (!E.inicio) return 0;
    return (E.fin || Date.now()) - E.inicio;
  }
  setInterval(function () {
    var r = document.getElementById('reloj');
    if (r) r.textContent = formatoTiempo(tiempoTranscurrido());
  }, 1000);

  function reiniciar() {
    if (!window.confirm('¿Reiniciar la partida? Se borrará todo el avance de este dispositivo.')) return;
    borrarGuardado();
    E = estadoNuevo();
    U = { clave: null };
    ir('inicio');
    anunciar('Partida reiniciada.');
  }

  function retro(tipo, titulo, cuerpo) {
    return el('div', { class: 'retro ' + tipo, role: 'status' },
      icono(tipo === 'bien' ? 'bien' : 'mal', 22),
      el('div', { class: 'cuerpo' }, el('p', {}, el('strong', { text: titulo }), cuerpo && typeof cuerpo === 'string' ? ' ' + cuerpo : ''), cuerpo && typeof cuerpo !== 'string' ? cuerpo : null));
  }

  /* ================================================================ Pantalla: inicio */

  var SVG_PUERTA = '<svg class="puerta-inicio" viewBox="0 0 390 230" role="img" aria-label="Puerta cerrada del consultorio de la Dra. Escala, con un candado y luz que se escapa por debajo">' +
    '<ellipse cx="195" cy="226" rx="120" ry="10" fill="#FFC20E" opacity="0.18"/>' +
    '<rect x="125" y="18" width="140" height="206" rx="3" fill="#2A261F" stroke="#B8860B" stroke-width="2"/>' +
    '<rect x="140" y="92" width="110" height="52" rx="2" fill="none" stroke="#4A4235" stroke-width="2"/>' +
    '<rect x="140" y="156" width="110" height="56" rx="2" fill="none" stroke="#4A4235" stroke-width="2"/>' +
    '<rect x="150" y="36" width="90" height="40" rx="3" fill="#E0A800"/>' +
    '<text x="195" y="54" text-anchor="middle" font-family="Calibri, Carlito, sans-serif" font-size="13" font-weight="700" fill="#1E1B16">Dra. Escala</text>' +
    '<text x="195" y="68" text-anchor="middle" font-family="Consolas, Menlo, monospace" font-size="9" fill="#1E1B16">Céd. 5-20-100</text>' +
    '<circle cx="246" cy="128" r="6" fill="#FFC20E"/>' +
    '<path d="M240 140v-6a6 6 0 0 1 12 0v6" fill="none" stroke="#B8860B" stroke-width="2.5"/>' +
    '<rect x="236" y="140" width="20" height="16" rx="2" fill="#B8860B"/>' +
    '<rect x="125" y="221" width="140" height="3" fill="#FFC20E"/>' +
    '<path d="M58 70h34l10 26H48z" fill="#3A3428" stroke="#B8860B" stroke-width="2"/>' +
    '<path d="M75 96v118M60 216h30" stroke="#B8860B" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M48 96l-20 60h94l-20-60z" fill="#FFC20E" opacity="0.07"/>' +
    '<circle cx="322" cy="56" r="26" fill="none" stroke="#4A4235" stroke-width="2"/>' +
    '<text x="322" y="60" text-anchor="middle" font-family="Consolas, Menlo, monospace" font-size="14" fill="#E0A800">21:47</text>' +
    '</svg>';

  pantallas.inicio = function () {
    var H = C.historia;
    var campos = [
      { id: 'p1', etiqueta: 'Nombre de la persona 1', requerido: true },
      { id: 'p2', etiqueta: 'Nombre de la persona 2', requerido: true },
      { id: 'grupo', etiqueta: 'Grupo', requerido: false }
    ];
    var form = el('form', { class: 'pantalla', novalidate: true, onsubmit: function (ev) {
      ev.preventDefault();
      var primero = null, datos = {};
      campos.forEach(function (c) {
        var inp = $('#' + c.id), err = $('#err-' + c.id);
        var v = inp.value.trim().replace(/\s+/g, ' ').slice(0, 60);
        datos[c.id] = v;
        if (c.requerido && !v) {
          inp.setAttribute('aria-invalid', 'true');
          err.hidden = false;
          if (!primero) primero = inp;
        } else {
          inp.removeAttribute('aria-invalid');
          if (err) err.hidden = true;
        }
      });
      if (primero) { primero.focus(); anunciar('Faltan nombres por escribir.'); return; }
      E.pareja = { p1: datos.p1, p2: datos.p2, grupo: datos.grupo };
      E.inicio = Date.now();
      E.fin = null;
      ir('mapa');
      anunciar('Entraron al consultorio. El cronómetro está corriendo.');
    } });

    campos.forEach(function (c) {
      form.appendChild(el('div', { class: 'campo' },
        el('label', { for: c.id }, c.etiqueta, c.requerido ? el('span', { 'aria-hidden': 'true', style: 'color: var(--oro)' }, ' *') : el('span', { class: 'opcional' }, ' (opcional)')),
        el('input', { id: c.id, name: c.id, type: 'text', autocomplete: 'off', maxlength: '60', required: c.requerido ? true : null, 'aria-describedby': c.requerido ? 'err-' + c.id : null }),
        c.requerido ? el('p', { id: 'err-' + c.id, class: 'error-campo', hidden: true }, icono('mal', 16), 'Escribe este nombre para continuar.') : null));
    });
    form.appendChild(el('button', { type: 'submit', class: 'btn btn-primario btn-grande' }, icono('entrar', 22), 'Entrar al consultorio'));

    return el('div', { class: 'pantalla' },
      deHTML(SVG_PUERTA),
      el('div', { class: 'titulo-juego' }, el('h1', { text: C.titulo }), el('p', { text: C.subtitulo })),
      el('div', { class: 'manila' },
        el('p', { class: 'etiqueta-mono', text: 'Expediente 112 · Confidencial' }),
        el('p', { text: H.premisa }),
        el('div', { class: 'mensaje-doctora' },
          el('img', { src: C.doctora.imagen, alt: C.doctora.alt, width: '72', height: '72' }),
          el('p', {}, el('strong', { text: 'Mensaje de la ' + C.doctora.nombre + ': ' }), el('em', { text: H.mensaje }))),
        el('details', { class: 'historia' },
          el('summary', { text: 'Leer la historia completa' }),
          H.completa.map(function (p) { return el('p', { text: p }); }))),
      form,
      el('p', { class: 'nota-pie', text: C.duracion }),
      el('p', { class: 'nota-pie' }, el('a', { href: '../' }, '← Herramientas de aula')));
  };

  /* ================================================================ Pantalla: mapa */

  function svgLibrero() {
    // 5 libros: la altura depende de la posición de su letra en la palabra (1 a 5).
    // Están acomodados en el mismo orden revuelto que las letras del mapa.
    var x0 = 40, ancho = 40, sep = 48, base = 106, partes = [];
    var encendidos = 0;
    E.orden.forEach(function (salaIdx, p) {
      var alto = 20 + salaIdx * 19;
      var x = x0 + p * sep, y = base - alto;
      var hecho = E.salas[salaIdx].completa;
      if (hecho) encendidos++;
      partes.push('<rect x="' + x + '" y="' + y + '" width="' + ancho + '" height="' + alto + '" rx="2" fill="' + (hecho ? '#B8860B' : '#3A3428') + '" stroke="' + (hecho ? '#FFC20E' : '#4A4235') + '"/>');
      if (hecho) partes.push('<text x="' + (x + ancho / 2) + '" y="' + (base - 7) + '" text-anchor="middle" font-family="Consolas, Menlo, monospace" font-size="15" font-weight="700" fill="#1E1B16">' + C.salas[salaIdx].letra + '</text>');
    });
    var etiqueta = 'Librero de la Dra. Escala: cinco libros de distintas alturas. ' + (encendidos ? encendidos + ' tienen una letra encendida en el lomo.' : 'Ninguno está encendido todavía.');
    return deHTML('<svg viewBox="0 0 358 118" role="img" aria-label="' + etiqueta + '">' + partes.join('') +
      '<rect x="20" y="106" width="318" height="8" rx="2" fill="#4A4235"/><path d="M290 106c0-18 6-30 20-36" fill="none" stroke="#6B604E" stroke-width="2"/><circle cx="312" cy="68" r="6" fill="#4A4235"/></svg>');
  }

  pantallas.mapa = function () {
    var sig = siguienteSala();
    var letras = el('div', { class: 'letras', role: 'list', 'aria-label': 'Letras encontradas, en desorden' });
    E.orden.forEach(function (salaIdx) {
      var hecho = E.salas[salaIdx].completa;
      letras.appendChild(el('div', { role: 'listitem', class: 'ficha' + (hecho ? '' : ' vacia'), 'aria-label': hecho ? 'Letra ' + C.salas[salaIdx].letra : 'Letra sin descubrir' }, hecho ? C.salas[salaIdx].letra : '?'));
    });

    var puertas = el('div', { class: 'puertas' });
    C.salas.forEach(function (sala, i) {
      var st = E.salas[i];
      var estado = st.completa ? 'hecha' : (i === sig ? 'siguiente' : 'cerrada');
      var lado;
      if (estado === 'hecha') lado = el('span', { class: 'estado' }, icono('bien', 26), puntosSala(i) + ' pts');
      else if (estado === 'siguiente') lado = el('span', { class: 'estado' }, el('span', { class: 'entrar', text: st.reto > 0 ? 'Seguir' : 'Entrar' }));
      else lado = el('span', { class: 'estado' }, icono('candado', 26), 'Cerrada');
      var etiquetaEstado = estado === 'hecha' ? 'superada, ' + puntosSala(i) + ' puntos. Toca para repasar.' : (estado === 'siguiente' ? 'disponible' : 'cerrada hasta completar la anterior');
      puertas.appendChild(el('button', {
        type: 'button', class: 'puerta ' + estado, 'data-k': 'sala-' + i,
        'aria-disabled': estado === 'cerrada' ? 'true' : null,
        'aria-label': 'Sala ' + sala.id + ': ' + sala.titulo + ', ' + etiquetaEstado,
        onclick: function () {
          if (estado === 'cerrada') { anunciar('Esta sala se abre al completar la anterior.'); return; }
          E.salaActual = i;
          ir(estado === 'hecha' ? 'letra' : 'sala');
        }
      }, el('span', { class: 'icono' }, icono(sala.icono, 44)),
        el('span', { class: 'info' }, el('span', { class: 'num', text: 'Sala ' + sala.id + (estado === 'siguiente' ? ' · siguiente' : '') }), el('span', { class: 'nombre', text: sala.titulo })),
        lado));
    });

    var final = null;
    if (todasCompletas()) {
      final = E.fin
        ? el('button', { type: 'button', class: 'btn btn-primario btn-grande', onclick: function () { ir('constancia'); } }, 'Ver constancia de escape')
        : el('button', { type: 'button', class: 'btn btn-primario btn-grande', 'data-k': 'ir-puerta', onclick: function () { ir('puerta'); } }, icono('puertaFinal', 24), 'Ir a la puerta final');
    }

    var p = E.pareja || { p1: '', p2: '', grupo: '' };
    return el('div', { class: 'pantalla' },
      el('div', {}, el('h1', { text: 'Mapa del consultorio', style: 'font-size: 28px' }),
        el('p', { style: 'color: var(--suave); margin-top: 4px', text: p.p1 + ' y ' + p.p2 + (p.grupo ? ' · ' + p.grupo : '') })),
      el('div', { style: 'display:flex; flex-direction:column; gap:8px' }, el('h2', { class: 'subtitulo-oro', text: 'Letras encontradas (revueltas)' }), letras),
      final,
      puertas,
      el('div', { class: 'librero' }, svgLibrero(), el('p', { text: 'Librero de la Dra. Escala' })),
      el('button', { type: 'button', class: 'btn btn-texto', style: 'align-self:center', onclick: reiniciar }, 'Reiniciar partida'));
  };

  /* ================================================================ Pantalla: sala */

  function prepararReto(salaIdx, retoIdx) {
    var clave = salaIdx + '-' + retoIdx;
    if (U.clave === clave) return;
    var reto = C.salas[salaIdx].retos[retoIdx];
    U = { clave: clave, resultado: null, mensaje: null, marcas: null, confirmarPista: false };
    if (reto.tipo === 'clasificar') {
      U.orden = barajar(rango(reto.tarjetas.length));
      U.lugar = {};
      U.sel = null;
    } else if (reto.tipo === 'ordenar') {
      U.orden = barajarDistinto(rango(reto.elementos.length));
    } else if (reto.tipo === 'emparejar') {
      U.resp = {};
      U.opciones = reto.opciones.length > 3 ? barajar(reto.opciones) : reto.opciones.slice();
    } else if (reto.tipo === 'opciones') {
      U.resp = {};
      U.ordenes = reto.preguntas.map(function (p) { return barajar(rango(p.opciones.length)); });
    } else if (reto.tipo === 'redactar') {
      U.texto = E.borrador || '';
      U.checks = reto.autoverificacion.map(function () { return false; });
    }
  }
  function cambio() { U.resultado = null; U.mensaje = null; U.marcas = null; }

  pantallas.sala = function () {
    var i = E.salaActual;
    var sala = C.salas[i], st = E.salas[i];
    if (!sala || (st.completa && U.resultado !== 'bien')) { setTimeout(function () { ir('mapa'); }, 0); return el('div'); }
    var retoIdx = Math.min(st.reto, sala.retos.length - 1);
    prepararReto(i, retoIdx);
    var reto = sala.retos[retoIdx];

    var cab = el('div', { class: 'cabeza-sala' },
      el('span', { class: 'icono' }, icono(sala.icono, 64)),
      el('div', { class: 'titulos' }, el('span', { class: 'subtitulo-oro', text: 'Sala ' + sala.id + ' · ' + sala.tema }), el('h1', { text: sala.titulo })),
      el('button', {
        type: 'button', class: 'boton-uv', 'data-k': 'uv', 'aria-pressed': E.uv ? 'true' : 'false',
        'aria-label': 'Luz UV de la lámpara', title: 'Luz UV de la lámpara',
        onclick: function () { E.uv = !E.uv; guardar(); render(); anunciar(E.uv ? 'Luz UV encendida: apareció una nota escondida.' : 'Luz UV apagada.'); }
      }, icono('lampara', 26)));

    var partes = [cab];
    if (retoIdx === 0 && !U.resultado) {
      partes.push(el('div', { class: 'manila' }, el('p', { class: 'etiqueta-mono', text: 'Al entrar' }), el('p', { text: sala.intro })));
    }
    if (E.uv) {
      partes.push(el('div', { class: 'nota-uv', role: 'note' },
        el('img', { src: C.doctora.imagen, alt: '', width: '44', height: '44' }),
        el('div', {}, el('p', { class: 'etiqueta-mono', text: 'Tinta invisible · ' + C.doctora.nombre }), el('p', { text: sala.notaUV }))));
    }
    if (sala.apoyo) {
      partes.push(el('details', { class: 'cartel', open: true },
        el('summary', { text: sala.apoyo.titulo }),
        sala.apoyo.texto ? el('p', { text: sala.apoyo.texto }) : null,
        el('ul', {}, sala.apoyo.lista.map(function (x) { return el('li', { html: x }); }))));
    }
    var prog = el('div', { class: 'progreso', role: 'img', 'aria-label': 'Reto ' + (retoIdx + 1) + ' de ' + sala.retos.length });
    sala.retos.forEach(function (r, k) { prog.appendChild(el('span', { class: k < retoIdx || (k === retoIdx && U.resultado === 'bien') ? 'lleno' : '' })); });
    partes.push(prog);

    partes.push(el('div', { class: 'tarjeta' },
      el('h2', { class: 'subtitulo-oro', text: 'Reto ' + reto.id + ' · ' + nombreTipo(reto.tipo) }),
      el('p', { class: 'consigna', text: reto.consigna })));

    partes.push(CUERPOS[reto.tipo](reto, sala, i));

    if (st.pistasVistas[reto.id]) {
      partes.push(el('div', { class: 'pista-caja' }, icono('bombilla', 22), el('p', {}, el('strong', { text: 'Pista: ' }), reto.pista)));
    }
    if (U.mensaje) partes.push(U.mensaje);

    partes.push(botonesReto(reto, sala, i, retoIdx));
    if (!st.completa) {
      partes.push(el('p', { class: 'vale' }, 'Esta sala vale ahora ', el('strong', { text: puntosSala(i) + ' de ' + R.puntosPorSala }), ' puntos'));
    }
    return el('div', { class: 'pantalla' }, partes);
  };

  function nombreTipo(t) {
    return { clasificar: 'Clasifica', ordenar: 'Ordena', emparejar: 'Relaciona', opciones: 'Elige', redactar: 'Redacta' }[t] || '';
  }

  function botonesReto(reto, sala, i, retoIdx) {
    var st = E.salas[i];
    if (U.resultado === 'bien') {
      var ultimo = retoIdx === sala.retos.length - 1;
      return el('button', {
        type: 'button', class: 'btn btn-primario btn-grande', 'data-k': 'siguiente',
        onclick: function () {
          if (ultimo) { U = { clave: null }; ir('letra'); }
          else { st.reto = retoIdx + 1; guardar(); U = { clave: null }; render({ nuevaPantalla: true }); }
        }
      }, ultimo ? 'Abrir el candado de la sala' : 'Siguiente reto');
    }
    var caja = el('div', { style: 'display:flex; flex-direction:column; gap:10px' });
    if (U.confirmarPista) {
      caja.appendChild(el('div', { class: 'pista-caja', role: 'alertdialog', 'aria-label': 'Confirmar pista' },
        icono('bombilla', 22),
        el('div', { style: 'display:flex; flex-direction:column; gap:10px; flex:1' },
          el('p', { text: '¿Usar una pista? Cuesta ' + R.penalizacionPista + ' puntos de esta sala. Les quedarían ' + (pistasRestantes() - 1) + ' para toda la partida.' }),
          el('div', { class: 'fila-botones' },
            el('button', { type: 'button', class: 'btn btn-primario', 'data-k': 'pista-si', onclick: function () {
              E.pistasUsadas++; st.pistas++; st.pistasVistas[reto.id] = true; U.confirmarPista = false; guardar(); render({ foco: 'comprobar' });
              anunciar('Pista: ' + reto.pista);
            } }, 'Sí, usar pista'),
            el('button', { type: 'button', class: 'btn btn-secundario', 'data-k': 'pista-no', onclick: function () { U.confirmarPista = false; render({ foco: 'pista' }); } }, 'Cancelar')))));
    }
    var fila = el('div', { class: 'fila-botones' });
    if (!st.pistasVistas[reto.id]) {
      var quedan = pistasRestantes();
      fila.appendChild(el('button', {
        type: 'button', class: 'btn btn-secundario', 'data-k': 'pista', disabled: quedan === 0 || U.confirmarPista,
        onclick: function () { U.confirmarPista = true; render({ foco: 'pista-si' }); }
      }, icono('bombilla', 20), quedan === 0 ? 'Sin pistas' : 'Pista · −' + R.penalizacionPista));
    }
    fila.appendChild(el('button', { type: 'button', class: 'btn btn-primario', 'data-k': 'comprobar', style: 'flex-grow: 1.5', onclick: function () { comprobar(reto, sala, i, retoIdx); } }, 'Comprobar'));
    caja.appendChild(fila);
    return caja;
  }

  function exito(reto, sala, i, retoIdx, extra) {
    U.resultado = 'bien';
    var ultimo = retoIdx === sala.retos.length - 1;
    if (ultimo) { E.salas[i].completa = true; E.salas[i].reto = retoIdx; }
    guardar();
    U.mensaje = retro('bien', '¡Correcto!', extra ? el('div', {}, extra, el('p', { text: reto.exito })) : reto.exito);
    render({ foco: 'siguiente' });
    anunciar('¡Correcto! ' + reto.exito);
  }
  function fallo(i, titulo, cuerpo) {
    E.salas[i].fallos++;
    guardar();
    U.resultado = 'mal';
    U.mensaje = retro('mal', titulo + ' (−' + R.penalizacionIntento + ' punto)', cuerpo);
    render({ foco: 'comprobar' });
    anunciar(titulo + '. Revisen la retroalimentación.');
  }
  function incompleto(texto) {
    U.resultado = null;
    U.mensaje = retro('mal', 'Falta algo.', texto + ' (Esto no resta puntos.)');
    render({ foco: 'comprobar' });
    anunciar(texto);
  }

  function comprobar(reto, sala, i, retoIdx) {
    U.confirmarPista = false;
    COMPROBAR[reto.tipo](reto, sala, i, retoIdx);
  }

  /* ---------- Cuerpos de cada tipo de reto ---------- */

  var CUERPOS = {};
  var COMPROBAR = {};

  // CLASIFICAR: tocar tarjeta → tocar cajón
  CUERPOS.clasificar = function (reto) {
    var cont = el('div', { style: 'display:flex; flex-direction:column; gap:14px' });
    var mazo = el('div', { class: 'mazo', role: 'group', 'aria-label': 'Tarjetas por guardar' });
    var pendientes = U.orden.filter(function (t) { return !U.lugar[t]; });
    pendientes.forEach(function (t) {
      mazo.appendChild(el('button', {
        type: 'button', class: 'carta', 'data-k': 't' + t, 'aria-pressed': U.sel === t ? 'true' : 'false',
        onclick: function () { U.sel = U.sel === t ? null : t; render(); if (U.sel !== null) anunciar('Seleccionaste: ' + reto.tarjetas[t].texto + '. Ahora toca un cajón.'); }
      }, reto.tarjetas[t].texto));
    });
    if (!pendientes.length) mazo.appendChild(el('p', { class: 'mazo-vacio', text: 'Todas las tarjetas están en un cajón. Pueden tocar una para moverla.' }));
    cont.appendChild(mazo);
    if (U.sel !== null && U.lugar[U.sel]) {
      cont.appendChild(el('button', { type: 'button', class: 'btn btn-texto', style: 'align-self:flex-start', 'data-k': 'regresar', onclick: function () {
        delete U.lugar[U.sel]; U.sel = null; cambio(); render({ foco: 'comprobar' });
      } }, 'Regresar «' + reto.tarjetas[U.sel].texto + '» al montón'));
    }
    var cajones = el('div', { class: 'cajones' });
    reto.cajones.forEach(function (c, ci) {
      var dentro = U.orden.filter(function (t) { return U.lugar[t] === c.id; });
      var letra = String.fromCharCode(65 + ci);
      var accion = U.sel !== null ? 'Guardar aquí' : dentro.length + (dentro.length === 1 ? ' tarjeta' : ' tarjetas');
      var contenido = el('div', { class: 'cajon-contenido' });
      if (!dentro.length) contenido.appendChild(el('span', { class: 'vacio', text: 'Vacío' }));
      dentro.forEach(function (t) {
        var marca = U.marcas ? U.marcas[t] : null;
        contenido.appendChild(el('button', {
          type: 'button', class: 'ficha-colocada' + (marca ? ' marca-' + marca : ''), 'data-k': 't' + t,
          'aria-pressed': U.sel === t ? 'true' : 'false',
          'aria-label': reto.tarjetas[t].texto + (marca === 'bien' ? ' (correcta)' : marca === 'mal' ? ' (revisar)' : '') + '. Toca para moverla.',
          onclick: function () { U.sel = U.sel === t ? null : t; render(); }
        }, marca ? el('span', { class: 'simbolo ' + marca, 'aria-hidden': 'true', text: marca === 'bien' ? '✓' : '✕' }) : null, reto.tarjetas[t].texto));
      });
      cajones.appendChild(el('div', { class: 'cajon' + (U.sel !== null ? ' activo' : '') },
        el('button', {
          type: 'button', class: 'cajon-boton', 'data-k': 'c' + c.id,
          'aria-label': U.sel !== null ? 'Guardar «' + reto.tarjetas[U.sel].texto + '» en el cajón ' + c.nombre : 'Cajón ' + c.nombre + ': ' + dentro.length + ' tarjetas. Primero toca una tarjeta.',
          onclick: function () {
            if (U.sel === null) { anunciar('Primero toquen una tarjeta.'); return; }
            var texto = reto.tarjetas[U.sel].texto;
            U.lugar[U.sel] = c.id; U.sel = null; cambio();
            var resto = U.orden.filter(function (t) { return !U.lugar[t]; });
            render({ foco: resto.length ? 't' + resto[0] : 'comprobar' });
            anunciar('«' + texto + '» guardada en ' + c.nombre + '.');
          }
        }, el('span', {}, el('span', { class: 'nombre', text: 'Cajón ' + letra + ' · ' + c.nombre }), ' ', el('span', { class: 'accion', text: '· ' + accion })), el('span', { class: 'tirador', 'aria-hidden': 'true' })),
        contenido));
    });
    cont.appendChild(cajones);
    return cont;
  };
  COMPROBAR.clasificar = function (reto, sala, i, retoIdx) {
    var faltan = reto.tarjetas.length - Object.keys(U.lugar).length;
    if (faltan > 0) { incompleto('Faltan ' + faltan + (faltan === 1 ? ' tarjeta' : ' tarjetas') + ' por guardar en un cajón.'); return; }
    var malas = [];
    U.marcas = {};
    reto.tarjetas.forEach(function (t, k) {
      var ok = U.lugar[k] === t.cajon;
      U.marcas[k] = ok ? 'bien' : 'mal';
      if (!ok) malas.push(k);
    });
    U.sel = null;
    if (!malas.length) { exito(reto, sala, i, retoIdx); return; }
    var lista = el('ul', {}, malas.map(function (k) { return el('li', {}, el('strong', { text: '«' + reto.tarjetas[k].texto + '»: ' }), reto.tarjetas[k].porque); }));
    var marcas = U.marcas;
    fallo(i, malas.length === 1 ? 'Aún no: 1 tarjeta está en el cajón equivocado' : 'Aún no: ' + malas.length + ' tarjetas están en el cajón equivocado',
      el('div', {}, el('p', { text: 'Están marcadas con ✕. Piensen por qué:' }), lista, el('p', { text: 'Tóquenlas para moverlas y vuelvan a comprobar.' })));
    U.marcas = marcas;
  };

  // ORDENAR: flechas subir/bajar
  CUERPOS.ordenar = function (reto) {
    var lista = el('ol', { class: 'lista-orden', 'aria-label': 'Elementos en el orden actual' });
    U.orden.forEach(function (idx, pos) {
      var marca = U.marcas ? U.marcas[pos] : null;
      var etiqueta = reto.etiquetasPosicion ? reto.etiquetasPosicion[pos] : String(pos + 1);
      lista.appendChild(el('li', { class: 'fila-orden' + (marca ? ' marca-' + marca : '') + (U.movida === idx ? ' movida' : '') },
        el('span', { class: 'pos' + (reto.etiquetasPosicion ? ' etiqueta' : ''), text: etiqueta }),
        el('span', { class: 'texto', text: reto.elementos[idx] }),
        marca ? el('span', { class: 'simbolo ' + marca, 'aria-label': marca === 'bien' ? 'en su lugar' : 'fuera de lugar', text: marca === 'bien' ? '✓' : '✕' }) : null,
        el('span', { class: 'flechas' },
          el('button', { type: 'button', class: 'flecha', 'data-k': 'u' + idx, 'data-k-alt': 'd' + idx, disabled: pos === 0, 'aria-label': 'Subir: ' + reto.elementos[idx], onclick: function () { mover(pos, -1, reto); } }, icono('arriba', 20)),
          el('button', { type: 'button', class: 'flecha', 'data-k': 'd' + idx, 'data-k-alt': 'u' + idx, disabled: pos === U.orden.length - 1, 'aria-label': 'Bajar: ' + reto.elementos[idx], onclick: function () { mover(pos, 1, reto); } }, icono('abajo', 20)))));
    });
    return lista;
  };
  function mover(pos, dir, reto) {
    var dest = pos + dir;
    if (dest < 0 || dest >= U.orden.length) return;
    var t = U.orden[pos]; U.orden[pos] = U.orden[dest]; U.orden[dest] = t;
    U.movida = t;
    cambio();
    render();
    anunciar('«' + reto.elementos[t] + '» ahora está en la posición ' + (dest + 1) + '.');
  }
  COMPROBAR.ordenar = function (reto, sala, i, retoIdx) {
    U.movida = null;
    var marcas = U.orden.map(function (idx, pos) { return idx === pos ? 'bien' : 'mal'; });
    var bien = marcas.filter(function (m) { return m === 'bien'; }).length;
    if (bien === U.orden.length) { U.marcas = marcas; exito(reto, sala, i, retoIdx); return; }
    U.marcas = marcas;
    fallo(i, 'Aún no: ' + bien + ' de ' + U.orden.length + ' están en su lugar', el('div', {}, el('p', { text: 'Los que están en su lugar tienen ✓; los demás, ✕.' }), el('p', { text: reto.retroError })));
    U.marcas = marcas;
  };

  // EMPAREJAR: un selector (o botones si hay 2–3 opciones) por elemento
  CUERPOS.emparejar = function (reto) {
    var cont = el('div', { style: 'display:flex; flex-direction:column; gap:10px' });
    var enLinea = reto.opciones.length <= 3;
    reto.elementos.forEach(function (it, k) {
      var marca = U.marcas ? U.marcas[k] : null;
      var fs = el('fieldset', { class: 'pregunta' + (marca ? ' marca-' + marca : '') }, el('legend', { text: it.texto }));
      if (enLinea) {
        var fila = el('div', { class: 'opciones-en-linea' });
        U.opciones.forEach(function (op, j) {
          fila.appendChild(el('label', { class: 'opcion' },
            el('input', { type: 'radio', name: 'e' + k, value: op, 'data-k': 'e' + k + '-' + j, checked: U.resp[k] === op, onchange: function () { U.resp[k] = op; cambio(); render(); } }),
            el('span', { text: op })));
        });
        fs.appendChild(fila);
      } else {
        var sel = el('select', { class: 'selector', 'data-k': 'e' + k, 'aria-label': 'Respuesta para: ' + it.texto, onchange: function (ev) { U.resp[k] = ev.target.value; cambio(); render(); } },
          el('option', { value: '', text: '— Elige una opción —' }));
        U.opciones.forEach(function (op) { sel.appendChild(el('option', { value: op, text: op, selected: U.resp[k] === op })); });
        fs.appendChild(sel);
      }
      if (marca) {
        fs.appendChild(el('p', { class: 'retro-item ' + marca },
          el('span', { 'aria-hidden': 'true', text: marca === 'bien' ? '✓' : '✕' }),
          el('span', { text: marca === 'bien' ? (U.resultado === 'bien' ? it.porque : 'Correcto.') : 'Revisar: ' + it.porque })));
      }
      cont.appendChild(fs);
    });
    return cont;
  };
  COMPROBAR.emparejar = function (reto, sala, i, retoIdx) {
    var faltan = reto.elementos.filter(function (it, k) { return !U.resp[k]; }).length;
    if (faltan) { incompleto('Faltan ' + faltan + (faltan === 1 ? ' respuesta' : ' respuestas') + ' por elegir.'); return; }
    var marcas = reto.elementos.map(function (it, k) { return U.resp[k] === it.correcta ? 'bien' : 'mal'; });
    var malas = marcas.filter(function (m) { return m === 'mal'; }).length;
    U.marcas = marcas;
    if (!malas) { exito(reto, sala, i, retoIdx); return; }
    fallo(i, 'Aún no: ' + malas + (malas === 1 ? ' respuesta necesita' : ' respuestas necesitan') + ' revisión', 'Lean la explicación marcada con ✕ debajo de cada una y corrijan.');
    U.marcas = marcas;
  };

  // OPCIONES: una o varias preguntas de opción múltiple
  CUERPOS.opciones = function (reto) {
    var cont = el('div', { style: 'display:flex; flex-direction:column; gap:12px' });
    reto.preguntas.forEach(function (p, k) {
      var marca = U.marcas ? U.marcas[k] : null;
      var fs = el('fieldset', { class: 'pregunta' + (marca ? ' marca-' + marca : '') }, el('legend', { text: p.enunciado }));
      var caja = el('div', { style: 'display:flex; flex-direction:column; gap:8px' });
      U.ordenes[k].forEach(function (oi) {
        caja.appendChild(el('label', { class: 'opcion' },
          el('input', { type: 'radio', name: 'p' + k, value: String(oi), 'data-k': 'p' + k + '-' + oi, checked: U.resp[k] === oi, onchange: function () { U.resp[k] = oi; cambio(); render(); } }),
          el('span', { text: p.opciones[oi].texto })));
      });
      fs.appendChild(caja);
      if (marca) {
        var elegida = p.opciones[U.resp[k]];
        fs.appendChild(el('p', { class: 'retro-item ' + marca },
          el('span', { 'aria-hidden': 'true', text: marca === 'bien' ? '✓' : '✕' }),
          el('span', { text: (marca === 'bien' ? 'Correcto: ' : 'Revisar: ') + elegida.retro })));
      }
      cont.appendChild(fs);
    });
    return cont;
  };
  COMPROBAR.opciones = function (reto, sala, i, retoIdx) {
    var faltan = reto.preguntas.filter(function (p, k) { return U.resp[k] === undefined; }).length;
    if (faltan) { incompleto(reto.preguntas.length > 1 ? 'Respondan todas las preguntas antes de comprobar.' : 'Elijan una opción antes de comprobar.'); return; }
    var marcas = reto.preguntas.map(function (p, k) { return p.opciones[U.resp[k]].correcta ? 'bien' : 'mal'; });
    var malas = marcas.filter(function (m) { return m === 'mal'; }).length;
    U.marcas = marcas;
    if (!malas) { exito(reto, sala, i, retoIdx); return; }
    fallo(i, reto.preguntas.length > 1 ? 'Aún no: ' + malas + ' de ' + reto.preguntas.length + ' respuestas necesitan revisión' : 'Aún no es la mejor opción', 'Lean por qué debajo de la pregunta marcada con ✕ y vuelvan a intentarlo.');
    U.marcas = marcas;
  };

  // REDACTAR: ítem propio con revisiones automáticas + autoverificación
  function revisarItem(texto, reto) {
    var limpio = texto.trim();
    var tokens = normalizar(limpio).split(/[^a-z0-9ñ]+/).filter(Boolean);
    var extremas = reto.palabrasExtremas.map(normalizar);
    var conectores = reto.conectores.map(normalizar);
    var encontradasExt = tokens.filter(function (t) { return extremas.indexOf(t) !== -1; });
    var encontradosCon = tokens.filter(function (t) { return conectores.indexOf(t) !== -1; });
    var iNo = tokens.indexOf('no');
    var dobleNeg = iNo !== -1 && tokens.slice(iNo + 1).some(function (t) { return t === 'nunca' || t === 'ni' || t === 'no'; });
    return [
      { ok: limpio.length > 0, texto: 'No está vacío.' },
      { ok: tokens.length > 0 && tokens.length <= reto.maxPalabras, texto: 'Tiene máximo ' + reto.maxPalabras + ' palabras (lleva ' + tokens.length + ').' },
      { ok: encontradasExt.length === 0, texto: encontradasExt.length ? 'Quiten las expresiones extremas: «' + encontradasExt.join('», «') + '».' : 'Sin expresiones extremas (siempre, nunca, todos, nadie…).' },
      { ok: encontradosCon.length === 0, texto: encontradosCon.length ? 'Revisen si hay dos ideas: encontramos «' + encontradosCon.join('», «') + '».' : 'Sin «y», «e» ni «pero» (una sola idea).' },
      { ok: !dobleNeg, texto: dobleNeg ? 'Parece haber una doble negación («no… nunca», «no… ni», «no… no»).' : 'Sin dobles negaciones.' },
      { ok: /\.$/.test(limpio), texto: 'Termina en punto.' }
    ];
  }
  function listaRevisiones(revs) {
    return el('ul', { class: 'revisiones', id: 'revisiones' }, revs.map(function (r) {
      return el('li', { class: r.ok ? 'ok' : 'no' },
        el('span', { class: 'simbolo', 'aria-hidden': 'true', text: r.ok ? '✓' : '✕' }),
        el('span', {}, el('span', { class: 'sr-only', text: r.ok ? 'Cumple: ' : 'Pendiente: ' }), r.texto));
    }));
  }
  CUERPOS.redactar = function (reto) {
    var indicador = reto.indicadores[E.indicador] || reto.indicadores[0];
    var bloqueado = U.resultado === 'bien';
    var area = el('textarea', {
      id: 'item', rows: '3', maxlength: '300', 'data-k': 'item', disabled: bloqueado,
      'aria-describedby': 'revisiones-titulo',
      oninput: function (ev) {
        U.texto = ev.target.value;
        E.borrador = U.texto; guardar();
        var viejo = $('#revisiones');
        if (viejo) viejo.replaceWith(listaRevisiones(revisarItem(U.texto, reto)));
        if (U.mensaje) { U.mensaje = null; var m = $('#principal .retro'); if (m) m.remove(); }
      }
    });
    area.value = U.texto;
    var casillas = el('fieldset', { style: 'display:flex; flex-direction:column; gap:2px' },
      el('legend', { class: 'subtitulo-oro', style: 'margin-bottom:6px', text: 'Autoverificación de la pareja' }));
    reto.autoverificacion.forEach(function (txt, k) {
      casillas.appendChild(el('label', { class: 'casilla' },
        el('input', { type: 'checkbox', 'data-k': 'chk' + k, checked: U.checks[k], disabled: bloqueado, onchange: function (ev) { U.checks[k] = ev.target.checked; } }),
        el('span', { text: txt })));
    });
    return el('div', { style: 'display:flex; flex-direction:column; gap:14px' },
      el('div', { class: 'tarjeta' }, el('p', { class: 'subtitulo-oro', text: 'Indicador que les tocó' }), el('p', { class: 'indicador', text: indicador }),
        el('p', { style: 'color: var(--suave); font-size: 15px', text: 'Se responderá con la escala de 5 puntos: Totalmente en desacuerdo … Totalmente de acuerdo.' })),
      el('div', { class: 'campo' }, el('label', { for: 'item', text: 'Su ítem' }), area),
      el('div', { class: 'tarjeta' }, el('p', { class: 'subtitulo-oro', id: 'revisiones-titulo', text: 'Revisión automática' }), listaRevisiones(revisarItem(U.texto, reto))),
      casillas);
  };
  COMPROBAR.redactar = function (reto, sala, i, retoIdx) {
    var revs = revisarItem(U.texto, reto);
    var pendientes = revs.filter(function (r) { return !r.ok; });
    var sinMarcar = reto.autoverificacion.filter(function (t, k) { return !U.checks[k]; });
    if (pendientes.length || sinMarcar.length) {
      U.resultado = null;
      var lista = el('ul', {}, pendientes.map(function (r) { return el('li', { text: r.texto }); })
        .concat(sinMarcar.map(function (t) { return el('li', { text: 'Marquen en la autoverificación: «' + t + '».' }); })));
      U.mensaje = retro('mal', 'Su ítem todavía no abre la puerta.', el('div', {}, el('p', { text: 'Revisen esto (no resta puntos):' }), lista));
      render({ foco: 'comprobar' });
      anunciar('Su ítem todavía no cumple todas las revisiones.');
      return;
    }
    E.item = { indicador: reto.indicadores[E.indicador] || reto.indicadores[0], texto: U.texto.trim() };
    exito(reto, sala, i, retoIdx, el('p', {}, 'Su ítem: ', el('em', { text: '«' + E.item.texto + '»' })));
  };

  /* ================================================================ Pantalla: letra revelada */

  var SVG_CANDADO = '<svg class="candado" viewBox="0 0 200 150" role="img" aria-label="Candado dorado que se abre">' +
    '<path class="rayos" d="M100 6v16M40 30l11 11M160 30l-11 11M18 84h16M166 84h16" stroke="#FFC20E" stroke-width="3" stroke-linecap="round" opacity="0.7"/>' +
    '<path class="arco" d="M78 74V52a22 22 0 0 1 44 0v22" fill="none" stroke="#E0A800" stroke-width="9" stroke-linecap="round"/>' +
    '<rect x="62" y="74" width="76" height="64" rx="10" fill="#FFC20E"/>' +
    '<rect x="62" y="74" width="76" height="12" rx="6" fill="#E0A800"/>' +
    '<circle cx="100" cy="104" r="7" fill="#1E1B16"/>' +
    '<path d="M100 108v14" stroke="#1E1B16" stroke-width="5" stroke-linecap="round"/></svg>';

  pantallas.letra = function () {
    var i = E.salaActual, sala = C.salas[i], st = E.salas[i];
    if (!st.completa) { setTimeout(function () { ir('mapa'); }, 0); return el('div'); }
    var fin = todasCompletas();
    var desglose = el('div', { class: 'desglose' },
      el('span', {}, el('strong', { text: String(puntosSala(i)) }), ' / ' + R.puntosPorSala + ' pts'),
      el('span', { 'aria-hidden': 'true', text: '·' }),
      el('span', { text: st.fallos + (st.fallos === 1 ? ' intento fallido' : ' intentos fallidos') + (st.fallos ? ' (−' + st.fallos * R.penalizacionIntento + ')' : '') }),
      el('span', { 'aria-hidden': 'true', text: '·' }),
      el('span', { text: st.pistas + (st.pistas === 1 ? ' pista' : ' pistas') + (st.pistas ? ' (−' + st.pistas * R.penalizacionPista + ')' : '') }));
    return el('div', { class: 'pantalla revelacion' },
      deHTML(SVG_CANDADO),
      el('p', { class: 'superada' }, icono('bien', 18), 'SALA ' + sala.id + ' SUPERADA'),
      el('h1', { text: 'Encontraron una letra', style: 'font-size: 28px' }),
      el('div', { class: 'letra-grande', role: 'img', 'aria-label': 'Letra ' + sala.letra, text: sala.letra }),
      desglose,
      el('div', { class: 'manila' }, el('p', { class: 'etiqueta-mono', text: 'Lo que te llevas' }), el('p', { style: 'font-size: 18px', text: sala.sintesis })),
      fin && !E.fin
        ? el('button', { type: 'button', class: 'btn btn-primario btn-grande', 'data-k': 'ir-puerta', onclick: function () { ir('puerta'); } }, icono('puertaFinal', 24), 'Ir a la puerta final')
        : el('button', { type: 'button', class: 'btn btn-primario btn-grande', 'data-k': 'volver-mapa', onclick: function () { ir('mapa'); } }, 'Volver al mapa'));
  };

  /* ================================================================ Pantalla: puerta final */

  pantallas.puerta = function () {
    if (!todasCompletas()) { setTimeout(function () { ir('mapa'); }, 0); return el('div'); }
    if (U.clave !== 'puerta') U = { clave: 'puerta', picks: [], mensaje: null, abierta: false };
    var P = C.puertaFinal;
    var letras = E.orden.map(function (s) { return C.salas[s].letra; });
    var casillas = el('div', { class: 'casillas', role: 'group', 'aria-label': 'Código escrito: ' + (U.picks.map(function (k) { return letras[k]; }).join(' ') || 'vacío') });
    for (var c = 0; c < letras.length; c++) {
      casillas.appendChild(el('div', { class: 'casilla-letra', 'aria-hidden': 'true', text: U.picks[c] !== undefined ? letras[U.picks[c]] : '' }));
    }
    var teclas = el('div', { class: 'teclas' });
    letras.forEach(function (l, k) {
      var usada = U.picks.indexOf(k) !== -1;
      teclas.appendChild(el('button', {
        type: 'button', class: 'tecla', 'data-k': 'tecla' + k, disabled: usada || U.abierta,
        'aria-label': 'Letra ' + l + (usada ? ', ya usada' : ''),
        onclick: function () {
          if (U.picks.length >= letras.length) return;
          U.picks.push(k); U.mensaje = null;
          var libre = letras.map(function (x, j) { return j; }).filter(function (j) { return U.picks.indexOf(j) === -1; });
          render({ foco: libre.length ? 'tecla' + libre[0] : 'abrir' });
          anunciar('Letra ' + l + '. Código: ' + U.picks.map(function (j) { return letras[j]; }).join(''));
        }
      }, l));
    });
    var marco = el('div', { class: 'marco-puerta' + (U.abierta ? ' abierta' : '') },
      el('div', { class: 'hoja-puerta' },
        el('div', { class: 'placa-salida', text: 'SALIDA' }),
        casillas,
        deHTML('<svg width="180" height="60" viewBox="0 0 180 60" aria-hidden="true"><rect x="8" y="4" width="164" height="52" rx="3" fill="none" stroke="#4A4235" stroke-width="2"/><circle cx="150" cy="30" r="7" fill="#FFC20E"/></svg>')));
    return el('div', { class: 'pantalla' },
      el('div', { style: 'text-align:center; display:flex; flex-direction:column; gap:4px' },
        el('p', { class: 'subtitulo-oro', text: P.titulo }),
        el('h1', { text: 'Escriban el código', style: 'font-size: 28px' })),
      marco,
      el('div', { class: 'pista-caja' }, icono('bombilla', 22), el('p', { text: P.pista })),
      el('div', { style: 'display:flex; flex-direction:column; gap:8px' }, el('p', { style: 'color: var(--suave); font-size: 15px', text: 'Toquen las letras en orden:' }), teclas),
      U.mensaje,
      el('div', { class: 'fila-botones' },
        el('button', { type: 'button', class: 'btn btn-secundario', 'data-k': 'borrar', disabled: U.abierta, onclick: function () { U.picks = []; U.mensaje = null; render({ foco: 'tecla0' }); anunciar('Código borrado.'); } }, 'Borrar'),
        el('button', { type: 'button', class: 'btn btn-primario', 'data-k': 'abrir', style: 'flex-grow:1.6', disabled: U.abierta, onclick: abrirPuerta }, 'Abrir la puerta')));

    function abrirPuerta() {
      if (U.picks.length < letras.length) {
        U.mensaje = retro('mal', 'Faltan letras.', 'Usen las ' + letras.length + ' letras para formar la palabra.');
        render({ foco: 'abrir' }); anunciar('Faltan letras.'); return;
      }
      var palabra = U.picks.map(function (k) { return letras[k]; }).join('');
      if (normalizar(palabra) === normalizar(P.palabra)) {
        E.fin = Date.now();
        guardar();
        U.abierta = true;
        U.mensaje = retro('bien', '¡' + P.palabra + '!', 'La cerradura hace clic y la puerta se abre…');
        render();
        anunciar('¡Correcto! La puerta se abre.');
        setTimeout(function () { U = { clave: null }; ir('salida'); }, movimientoReducido ? 900 : 2200);
      } else {
        U.mensaje = retro('mal', 'La puerta no cede.', P.errorTexto.replace(/^La puerta no cede\.\s*/, '') + ' (Aquí no se restan puntos.)');
        U.picks = [];
        render({ foco: 'tecla0' });
        anunciar(P.errorTexto);
      }
    }
  };

  /* ================================================================ Pantalla: salida (escena final) */

  pantallas.salida = function () {
    if (!E.fin) { setTimeout(function () { ir('mapa'); }, 0); return el('div'); }
    var F = C.final;
    return el('div', { class: 'pantalla final-escena' },
      el('h1', { text: F.titulo, style: 'font-size: 30px; color: var(--oro)' }),
      el('img', { class: 'retrato', src: C.doctora.imagen, alt: C.doctora.alt, width: '640', height: '795' }),
      el('div', { class: 'manila', style: 'text-align:left' },
        el('p', { text: F.texto }),
        el('p', { style: 'font-size: 19px; font-style: italic', text: F.nota }),
        el('p', { style: 'text-align:right; font-weight:700', text: F.firma })),
      el('p', { style: 'color: var(--suave)' }, 'Tiempo: ', el('strong', { style: 'color: var(--texto)', text: tiempoLargo(tiempoTranscurrido()) }), ' · Puntaje: ', el('strong', { style: 'color: var(--texto)', text: puntajeTotal() + ' / ' + R.puntosPorSala * C.salas.length })),
      el('button', { type: 'button', class: 'btn btn-primario btn-grande', 'data-k': 'ver-constancia', onclick: function () { ir('constancia'); } }, 'Ver constancia de escape'));
  };

  /* ================================================================ Pantalla: constancia */

  var SVG_SELLO = '<svg class="sello" viewBox="0 0 100 100" role="img" aria-label="Sello dorado de la Dra. Escala">' +
    '<defs><path id="sello-circulo" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"/></defs>' +
    '<circle cx="50" cy="50" r="47" fill="#FFC20E"/><circle cx="50" cy="50" r="44" fill="none" stroke="#B8860B" stroke-width="1.5"/>' +
    '<circle cx="50" cy="50" r="30" fill="none" stroke="#B8860B" stroke-width="1.5"/>' +
    '<text font-family="Consolas, Menlo, monospace" font-size="7.2" font-weight="700" fill="#6B4E00" letter-spacing="0.6"><textPath href="#sello-circulo">MEDIR · OBSERVAR · CUANTIFICAR · MEDIR · OBSERVAR ·</textPath></text>' +
    '<path d="M37 51l9 9 17-19" fill="none" stroke="#1E1B16" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  pantallas.constancia = function () {
    if (!E.fin || !E.pareja) { setTimeout(function () { ir('mapa'); }, 0); return el('div'); }
    var p = E.pareja;
    var fecha = new Date(E.fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    var tabla = el('table', { class: 'tabla-salas' },
      el('caption', { class: 'sr-only', text: 'Puntaje por sala' }),
      el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: 'Sala' }), el('th', { scope: 'col', text: 'Letra' }), el('th', { scope: 'col', class: 'num', text: 'Fallos' }), el('th', { scope: 'col', class: 'num', text: 'Pistas' }), el('th', { scope: 'col', class: 'num', text: 'Puntos' }))),
      el('tbody', {}, C.salas.map(function (s, i) {
        var st = E.salas[i];
        return el('tr', {}, el('td', { text: s.id + '. ' + s.titulo }), el('td', { text: s.letra }), el('td', { class: 'num', text: String(st.fallos) }), el('td', { class: 'num', text: String(st.pistas) }), el('td', { class: 'num', text: String(puntosSala(i)) }));
      })));
    var escala = el('div', { class: 'escala-c', 'aria-label': 'Escala de respuesta de 1 a 5' },
      ['Totalmente en desacuerdo', 'En desacuerdo', 'Ni de acuerdo ni en desacuerdo', 'De acuerdo', 'Totalmente de acuerdo'].map(function (t, k) {
        return el('div', {}, el('b', { text: String(k + 1) }), t);
      }));
    var item = E.item || { indicador: '—', texto: '—' };
    return el('div', { class: 'pantalla' },
      el('article', { class: 'constancia', 'aria-labelledby': 'titulo-constancia' },
        el('p', { class: 'encabezado-c', text: C.encabezado }),
        el('div', { class: 'titulo-c' }, deHTML(SVG_SELLO),
          el('div', {}, el('p', { class: 'etiqueta-mono', text: 'Expediente 112 · Cerrado' }), el('h1', { id: 'titulo-constancia', text: 'Constancia de escape' }))),
        el('p', { style: 'font-size: 17px' }, 'Se hace constar que ', el('strong', { text: p.p1 }), ' y ', el('strong', { text: p.p2 }),
          ' lograron salir del consultorio de la ' + C.doctora.nombre + ' con el código ', el('strong', { text: C.puertaFinal.palabra }), '.'),
        el('div', { class: 'datos' },
          el('div', { class: 'dato-c' }, el('span', { text: 'Grupo' }), el('strong', { text: p.grupo || '—' })),
          el('div', { class: 'dato-c' }, el('span', { text: 'Fecha' }), el('strong', { text: fecha })),
          el('div', { class: 'dato-c' }, el('span', { text: 'Tiempo total' }), el('strong', { text: tiempoLargo(E.fin - E.inicio) })),
          el('div', { class: 'dato-c' }, el('span', { text: 'Puntaje' }), el('strong', { text: puntajeTotal() + ' / ' + R.puntosPorSala * C.salas.length })),
          el('div', { class: 'dato-c ancho' }, el('span', { text: 'Pistas usadas' }), el('strong', { text: E.pistasUsadas + ' de ' + R.pistasTotales }))),
        tabla,
        el('div', { class: 'item-c' },
          el('p', { class: 'etiqueta-mono', text: 'Nuestro ítem Likert (reto 5.3)' }),
          el('p', { style: 'font-size: 14px; color: #5C4A1E', text: 'Indicador: ' + item.indicador }),
          el('p', { class: 'item-texto', text: '«' + item.texto + '»' }),
          escala),
        el('div', { class: 'referencias' }, el('p', { class: 'etiqueta-mono', style: 'padding-left:0; text-indent:0; margin-bottom: 6px', text: 'Referencias' }),
          C.referencias.map(function (r) { return el('p', { html: r }); }))),
      el('div', { class: 'no-imprimir', style: 'display:flex; flex-direction:column; gap:12px' },
        el('button', { type: 'button', class: 'btn btn-primario btn-grande', 'data-k': 'imprimir', onclick: function () { window.print(); } }, icono('imprimir', 22), 'Imprimir / guardar PDF'),
        el('p', { class: 'instruccion', text: C.constancia.instruccion }),
        el('button', { type: 'button', class: 'btn btn-texto', style: 'align-self:center', onclick: reiniciar }, 'Reiniciar para otra pareja')));
  };

  /* ================================================================ Arranque */

  $('#encabezado-texto').textContent = C.encabezado;
  if (!E.pareja) E.pantalla = 'inicio';
  render({ nuevaPantalla: true });
})();
