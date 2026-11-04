// Ruleta de participación — pantalla para proyectar y girar. Requiere sesión docente.
import { db } from '../shared/db.js';
import { iniciarDocente } from '../shared/shell.js';
import { h, vaciar, param, avisar, confirmar, fechaHora } from '../shared/ui.js';
import {
  RESULTADOS, rutaRuleta, rutaTurnos, alumnosDe, ausentesHoy, presentes, candidatos, azar, hoy,
  paseDeLista, masNuevoPrimero
} from './modelo.js';
import { crearRueda, prepararAudio, sonarTick, sonarFanfarria } from './rueda.js';

const id = param('g');

iniciarDocente({
  raiz: document.getElementById('app'),
  titulo: 'Ruleta de participación',
  subtitulo: 'Inicia sesión para usar la ruleta',
  menu: 'docente.html',
  cabecera: false,
  render: pantalla
});

function leerSonido() {
  try { return localStorage.getItem('ruleta:sonido') !== 'no'; } catch (e) { return true; }
}

function pantalla(raiz) {
  if (!id) {
    raiz.append(h('div', { class: 'ruleta-mensaje' }, h('p', {}, 'Elige un grupo desde el panel docente.'),
      h('a', { class: 'btn btn-primario', href: 'docente.html' }, 'Ir al panel')));
    return null;
  }
  let grupo = null;
  let turnos = [];
  let sonido = leerSonido();
  let pendiente = false; // hay un ganador en pantalla sin registrar

  const titulo = h('h1', {}, 'Cargando…');
  const estado = h('p', { class: 'ruleta-estado', 'aria-live': 'polite' }, '');
  const zona = h('div', { class: 'rueda-zona' });
  const boton = h('button', { class: 'btn btn-girar', type: 'button', onclick: girar }, '🎡 Girar');
  const ayuda = h('p', { class: 'ruleta-ayuda' }, 'También puedes pulsar la barra espaciadora');
  const ultimos = h('ol', { class: 'ultimos' });
  const btnSonido = h('button', {
    class: 'btn btn-chico', type: 'button', 'aria-pressed': String(sonido),
    onclick: () => {
      sonido = !sonido;
      try { localStorage.setItem('ruleta:sonido', sonido ? 'si' : 'no'); } catch (e) { /* sin almacenamiento */ }
      btnSonido.setAttribute('aria-pressed', String(sonido));
      btnSonido.textContent = sonido ? '🔊 Sonido' : '🔇 Sin sonido';
    }
  }, sonido ? '🔊 Sonido' : '🔇 Sin sonido');

  raiz.append(h('div', { class: 'ruleta-pantalla' },
    h('header', { class: 'ruleta-cab' },
      h('div', {}, titulo, estado),
      h('div', { class: 'ruleta-controles' },
        h('button', { class: 'btn btn-chico', type: 'button', onclick: pasarLista }, '📋 Pase de lista'),
        btnSonido,
        h('button', {
          class: 'btn btn-chico', type: 'button',
          onclick: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen())
        }, '⛶ Pantalla completa'),
        h('a', { class: 'btn btn-chico', href: `docente.html` }, '← Panel'))),
    h('main', { class: 'ruleta-cuerpo' },
      h('div', { class: 'ruleta-centro' }, zona, boton, ayuda),
      h('aside', { class: 'ruleta-lado' }, h('h2', {}, 'Últimos turnos'), ultimos))));

  const rueda = crearRueda(zona, { alTick: () => { if (sonido) sonarTick(); } });

  function actualizar() {
    if (!grupo) return;
    titulo.textContent = grupo.nombre || 'Grupo';
    document.title = `${grupo.nombre || 'Grupo'} · Ruleta de participación`;
    const pres = presentes(grupo);
    const cands = candidatos(grupo, turnos);
    const aus = alumnosDe(grupo).length - pres.length;
    const ausTxt = aus ? ` · ${aus} ${aus === 1 ? 'ausente' : 'ausentes'} hoy` : '';
    if (!alumnosDe(grupo).length) {
      estado.textContent = 'Este grupo todavía no tiene alumnos. Agrégalos desde el panel.';
    } else if (grupo.modo === 'azar') {
      estado.textContent = `Modo al azar · ${pres.length} presentes${ausTxt}`;
    } else {
      estado.textContent = `Ronda ${grupo.ronda || 1} · faltan ${cands.length} de ${pres.length}${ausTxt}`;
    }
    if (!rueda.girando && !pendiente) rueda.fijar(cands);
    const rondaLlena = grupo.modo !== 'azar' && pres.length > 0 && cands.length === 0;
    boton.textContent = rondaLlena ? '🔄 Empezar nueva ronda' : '🎡 Girar';
    boton.disabled = !pres.length;
    pintarUltimos();
  }

  function pintarUltimos() {
    vaciar(ultimos);
    const lista = turnos.slice().sort(masNuevoPrimero).slice(0, 10);
    if (!lista.length) { ultimos.append(h('li', { class: 'vacio' }, 'Aún no hay turnos.')); return; }
    for (const t of lista) {
      const res = RESULTADOS[t.r] || {};
      ultimos.append(h('li', {},
        h('span', { class: 'quien' }, t.n),
        h('span', { class: 'res', style: { background: res.fondo, color: res.color } }, res.nombre || t.r),
        h('span', { class: 'cuando' }, t.ts ? fechaHora(t.ts).split(', ')[1] : 'ahora')));
    }
  }

  async function girar() {
    if (!grupo || rueda.girando || pendiente) return;
    prepararAudio();
    const pres = presentes(grupo);
    if (!pres.length) { avisar('No hay alumnos presentes', 'error'); return; }
    const cands = candidatos(grupo, turnos);
    if (!cands.length) {
      const ok = await confirmar(`¡Ronda ${grupo.ronda || 1} completa!`, 'Todos los alumnos presentes ya participaron. ¿Empezamos una ronda nueva con todo el grupo?', { si: 'Nueva ronda' });
      if (!ok) return;
      try {
        await db.set(rutaRuleta(id), { ronda: (grupo.ronda || 1) + 1 }, { merge: true });
        avisar('Nueva ronda: todos vuelven a la ruleta');
      } catch (e) { avisar('No se pudo iniciar la ronda', 'error'); }
      return;
    }
    rueda.fijar(cands);
    pendiente = true;
    boton.disabled = true;
    const elegido = await rueda.girar(azar(cands.length));
    if (sonido) sonarFanfarria();
    mostrarGanador(elegido);
  }

  function mostrarGanador(a) {
    const confeti = h('div', { class: 'confeti', 'aria-hidden': 'true' });
    const colores = ['#6a3fb5', '#f2b705', '#e4572e', '#17a398', '#ff8fab', '#2f5de0', '#8bd450'];
    for (let i = 0; i < 60; i++) {
      confeti.append(h('i', {
        style: {
          left: `${Math.random() * 100}%`, background: colores[i % colores.length],
          animationDelay: `${Math.random() * 0.5}s`, animationDuration: `${2.2 + Math.random() * 1.6}s`,
          '--giro': `${Math.random() * 720 - 360}deg`
        }
      }));
    }
    const cerrar = () => {
      fondo.remove();
      document.removeEventListener('keydown', tecla, true);
      pendiente = false;
      actualizar();
      boton.focus();
    };
    const registrar = async (r) => {
      cerrar();
      try {
        await db.add(rutaTurnos(id), { a: a.id, n: a.n, r, ronda: grupo.ronda || 1, ts: db.TS });
      } catch (e) { avisar('No se pudo guardar el turno', 'error'); }
    };
    const ausente = async () => {
      cerrar();
      const ids = Array.from(ausentesHoy(grupo));
      if (!ids.includes(a.id)) ids.push(a.id);
      try {
        await db.set(rutaRuleta(id), { ausentes: { dia: hoy(), ids } }, { merge: true });
        avisar(`${a.n} quedó como ausente hoy`);
      } catch (e) { avisar('No se pudo guardar', 'error'); }
    };
    const tecla = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
      else if (e.key === '1') { e.preventDefault(); registrar('participo'); }
      else if (e.key === '2') { e.preventDefault(); registrar('noresp'); }
      else if (e.key === '3') { e.preventDefault(); ausente(); }
      else if (e.key === ' ') e.preventDefault();
    };
    const fondo = h('div', { class: 'ganador-fondo', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Le toca a ${a.n}` },
      confeti,
      h('div', { class: 'ganador' },
        h('p', { class: 'ganador-pre' }, 'Le toca a…'),
        h('p', { class: 'ganador-nombre' }, a.n),
        h('div', { class: 'ganador-botones' },
          h('button', { class: 'btn btn-res participo', type: 'button', onclick: () => registrar('participo') }, '✓ Participó', h('kbd', {}, '1')),
          h('button', { class: 'btn btn-res noresp', type: 'button', onclick: () => registrar('noresp') }, 'No respondió', h('kbd', {}, '2')),
          h('button', { class: 'btn btn-res ausente', type: 'button', onclick: ausente }, 'Está ausente', h('kbd', {}, '3'))),
        h('button', { class: 'btn btn-suave btn-chico ganador-cancelar', type: 'button', onclick: cerrar }, 'Cerrar sin registrar (Esc)')));
    document.body.append(fondo);
    document.addEventListener('keydown', tecla, true);
    fondo.querySelector('.participo').focus();
  }

  async function pasarLista() {
    if (!grupo) return;
    const ids = await paseDeLista(grupo);
    if (!ids) return;
    try {
      await db.set(rutaRuleta(id), { ausentes: { dia: hoy(), ids } }, { merge: true });
      avisar('Pase de lista guardado');
    } catch (e) { avisar('No se pudo guardar', 'error'); }
  }

  const alTeclado = (e) => {
    if (e.code !== 'Space' || e.repeat) return;
    if (document.querySelector('.modal-fondo, .ganador-fondo')) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.tagName === 'A')) return;
    e.preventDefault();
    girar();
  };
  document.addEventListener('keydown', alTeclado);

  const alGrupo = db.onDoc(rutaRuleta(id), (g) => {
    if (!g) {
      vaciar(raiz);
      raiz.append(h('div', { class: 'ruleta-mensaje' }, h('p', {}, 'No encontramos este grupo. Quizá se eliminó.'),
        h('a', { class: 'btn btn-primario', href: 'docente.html' }, 'Volver al panel')));
      return;
    }
    grupo = g;
    actualizar();
  }, () => {
    estado.textContent = 'No se pudo leer el grupo. Revisa tu sesión y las reglas de Firestore (ver README).';
  });
  const alTurnos = db.onCol(rutaTurnos(id), (docs) => { turnos = docs; actualizar(); }, () => { /* sin permiso */ });

  boton.focus();
  return () => {
    document.removeEventListener('keydown', alTeclado);
    rueda.destruir();
    if (alGrupo) alGrupo();
    if (alTurnos) alTurnos();
  };
}
