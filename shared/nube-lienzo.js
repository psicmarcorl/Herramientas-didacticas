// Nube de palabras: agrupación de términos, distribución sin empalmes, dibujo animado y exportación.
import { h, hash32 } from './ui.js';

export const FUENTE = '"Nunito", ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif';

export const PALETAS = {
  oceano: {
    nombre: 'Océano', fondo: '#eef9fc', tinta: '#0b3b57',
    colores: ['#0b6e99', '#0e8aa8', '#15a6b5', '#1fb5a3', '#3a86c8', '#1d4e89', '#4bb3c4']
  },
  atardecer: {
    nombre: 'Atardecer', fondo: '#fff6ec', tinta: '#5a1f2a',
    colores: ['#e4572e', '#f3722c', '#e08a00', '#d62f6e', '#c9184a', '#f2a30f', '#b5179e']
  },
  bosque: {
    nombre: 'Bosque', fondo: '#f6f3e6', tinta: '#26402f',
    colores: ['#2d6a4f', '#40916c', '#6b8f3a', '#b08a3e', '#8a6a3b', '#52796f', '#a86f3a']
  },
  aurora: {
    nombre: 'Aurora', fondo: '#0b1f3a', tinta: '#e9f1ff', oscuro: true,
    colores: ['#4cc9f0', '#80ffdb', '#ff4d9d', '#ffd166', '#b8f2e6', '#c77dff', '#ff9f1c']
  },
  institucional: {
    nombre: 'Institucional', fondo: '#ffffff', tinta: '#1f3864',
    colores: ['#1f3864', '#2c5aa0', '#4a79c4', '#6b7384', '#b08d2a', '#c9a227', '#3c4a68']
  }
};
export const paletaDe = (id) => PALETAS[id] || PALETAS.oceano;

/* ───── Agrupar respuestas ───── */
// docs: [{k, t, ts}] → [{k, t (grafía más frecuente), n}] ordenado por n desc.
export function agrupar(docs) {
  const mapa = new Map();
  for (const d of docs) {
    if (!d || !d.k || !d.t) continue;
    let g = mapa.get(d.k);
    if (!g) { g = { k: d.k, n: 0, vars: new Map() }; mapa.set(d.k, g); }
    g.n++;
    g.vars.set(d.t, (g.vars.get(d.t) || 0) + 1);
  }
  const out = [];
  for (const g of mapa.values()) {
    const ord = [...g.vars.entries()].sort((a, b) =>
      b[1] - a[1] || (/[^\u0000-\u007f]/.test(b[0]) - /[^\u0000-\u007f]/.test(a[0])) || a[0].localeCompare(b[0]));
    out.push({ k: g.k, t: ord[0][0], n: g.n });
  }
  return out.sort((a, b) => b.n - a.n || a.k.localeCompare(b.k));
}

/* ───── Distribución (espiral elíptica, sin empalmes) ───── */
let ctxMedida = null;
function medir(texto, size) {
  if (!ctxMedida) ctxMedida = document.createElement('canvas').getContext('2d');
  ctxMedida.font = `800 ${size}px ${FUENTE}`;
  return ctxMedida.measureText(texto).width;
}

export function disponer(terminos, W, H) {
  if (!terminos.length || W < 60 || H < 60) return [];
  const nmax = terminos[0].n;
  const nmin = terminos[terminos.length - 1].n;
  const lado = Math.min(W, H);
  const tamMax = Math.min(H * 0.24, W * 0.13, 130);
  const tamMin = Math.max(13, lado * 0.035);
  const margen = 6;
  const hueco = 4;
  // Parte de un tamaño grande y se reduce hasta que todo cabe, para que la nube llene el espacio.
  let escala = 2.3;
  let mejor = [];

  for (let intento = 0; intento < 34; intento++) {
    const puestos = [];
    let completo = true;
    for (let i = 0; i < terminos.length; i++) {
      const t = terminos[i];
      const rel = nmax === nmin ? 0.55 : (t.n - nmin) / (nmax - nmin);
      let size = (tamMin + (tamMax - tamMin) * Math.pow(rel, 0.8)) * escala;
      size = Math.max(size, 10);
      const vertical = i > 0 && hash32(t.k) % 100 < 26;
      const tw = medir(t.t, size) + size * 0.3;
      const th = size * 1.22;
      const w = vertical ? th : tw;
      const hh = vertical ? tw : th;
      const pos = buscarHueco(puestos, w, hh, W, H, margen, hueco);
      if (!pos) { completo = false; break; }
      puestos.push({
        k: t.k, t: t.t, n: t.n, cx: pos.x, cy: pos.y, w, h: hh, size,
        rot: vertical ? (hash32(t.k + 'r') % 2 ? 90 : -90) : 0
      });
    }
    mejor = puestos;
    if (completo) return puestos;
    escala *= 0.93;
  }
  return mejor;
}

function buscarHueco(puestos, w, h, W, H, margen, hueco) {
  if (w > W - margen * 2 || h > H - margen * 2) return null;
  const cx = W / 2;
  const cy = H / 2;
  const razon = Math.min(Math.max(W / H, 1), 2.4);
  const rMax = Math.hypot(W, H);
  const a = Math.max(1.4, Math.min(w, h) * 0.12);
  let th = 0;
  for (let iter = 0; iter < 60000; iter++) {
    const r = a * th;
    if (r > rMax) return null;
    th += Math.max(0.04, 5 / Math.max(r, 10));
    const x = cx + r * Math.cos(th) * razon;
    const y = cy + r * Math.sin(th);
    if (x - w / 2 < margen || x + w / 2 > W - margen || y - h / 2 < margen || y + h / 2 > H - margen) continue;
    let choca = false;
    for (let i = 0; i < puestos.length; i++) {
      const p = puestos[i];
      if (Math.abs(x - p.cx) < (w + p.w) / 2 + hueco && Math.abs(y - p.cy) < (h + p.h) / 2 + hueco) { choca = true; break; }
    }
    if (!choca) return { x, y };
  }
}

export const colorDe = (paleta, k) => paleta.colores[hash32(k) % paleta.colores.length];

/* ───── Dibujo en el DOM, con animación suave ───── */
// opciones: { paleta (id), mios (Set de claves), alVer }
export function crearLienzo(contenedor, opciones = {}) {
  let paleta = paletaDe(opciones.paleta);
  let mios = opciones.mios || new Set();
  let datos = [];
  const nodos = new Map();
  const lienzo = h('div', { class: 'lienzo', role: 'img', 'aria-label': 'Nube de palabras' });
  const vacio = h('p', { class: 'lienzo-vacio' }, 'Aún no hay participaciones.');
  const tip = h('div', { class: 'lienzo-tip', role: 'status' });
  lienzo.append(vacio, tip);
  contenedor.append(lienzo);
  aplicarPaleta();

  let ocultar = null;
  function mostrarTip(el, item) {
    tip.textContent = item.n === 1 ? '1 vez' : `${item.n} veces`;
    tip.classList.add('visible');
    const r = el.getBoundingClientRect();
    const c = lienzo.getBoundingClientRect();
    tip.style.left = `${Math.min(Math.max(r.left - c.left + r.width / 2, 40), c.width - 40)}px`;
    tip.style.top = `${Math.max(r.top - c.top - 8, 14)}px`;
    clearTimeout(ocultar);
    ocultar = setTimeout(() => tip.classList.remove('visible'), 2200);
  }

  function aplicarPaleta() {
    lienzo.style.background = paleta.fondo;
    lienzo.style.setProperty('--tinta-nube', paleta.tinta);
    lienzo.classList.toggle('oscuro', !!paleta.oscuro);
  }

  function pintar() {
    const W = lienzo.clientWidth;
    const H = lienzo.clientHeight;
    vacio.classList.toggle('oculto', datos.length > 0);
    const items = disponer(datos, W, H);
    const vivos = new Set();
    for (const it of items) {
      vivos.add(it.k);
      let el = nodos.get(it.k);
      const transform = `translate(${it.cx.toFixed(1)}px, ${it.cy.toFixed(1)}px) translate(-50%, -50%) rotate(${it.rot}deg)`;
      if (!el) {
        el = h('span', { class: 'termino', tabindex: '0' });
        el.style.opacity = '0';
        el.style.transform = `${transform} scale(.4)`;
        el.style.fontSize = `${it.size.toFixed(1)}px`;
        lienzo.append(el);
        void el.offsetWidth; // fuerza el primer cuadro para animar la entrada
        el.style.opacity = '1';
        nodos.set(it.k, el);
        el.addEventListener('pointerenter', () => el._it && mostrarTip(el, el._it));
        el.addEventListener('click', () => el._it && mostrarTip(el, el._it));
        el.addEventListener('focus', () => el._it && mostrarTip(el, el._it));
      }
      el._it = it;
      if (el.textContent !== it.t) el.textContent = it.t;
      el.style.transform = transform;
      el.style.fontSize = `${it.size.toFixed(1)}px`;
      el.style.color = colorDe(paleta, it.k);
      el.style.opacity = '1';
      el.classList.toggle('mio', mios.has(it.k));
      el.setAttribute('aria-label', `${it.t}, ${it.n} ${it.n === 1 ? 'vez' : 'veces'}`);
    }
    for (const [k, el] of nodos) {
      if (!vivos.has(k)) { el.remove(); nodos.delete(k); }
    }
  }

  let esperando = 0;
  const agendar = () => { cancelAnimationFrame(esperando); esperando = requestAnimationFrame(pintar); };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(agendar) : null;
  if (ro) ro.observe(lienzo);
  // Si la fuente web termina de cargar después, recalcula medidas.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(agendar);

  return {
    actualizar(terminos) { datos = terminos; agendar(); },
    setPaleta(id) { paleta = paletaDe(id); aplicarPaleta(); agendar(); },
    setMios(s) { mios = s; agendar(); },
    get datos() { return datos; },
    destruir() { if (ro) ro.disconnect(); cancelAnimationFrame(esperando); lienzo.remove(); }
  };
}

/* ───── Exportar a imagen (solo tema, pregunta y nube) ───── */
function partirLineas(ctx, texto, anchoMax) {
  const palabras = texto.split(/\s+/);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width > anchoMax && actual) { lineas.push(actual); actual = p; } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export async function nubeEnCanvas({ tema, pregunta, terminos, paletaId, W = 1600, H = 1100 }) {
  const paleta = paletaDe(paletaId);
  try { await document.fonts.load(`800 40px ${FUENTE}`); } catch (e) { /* sin fuente web */ }
  const c = h('canvas', { width: W, height: H });
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, W, H);

  const m = 48;
  let y = m;
  x.textBaseline = 'top';
  x.fillStyle = '#5a6475';
  x.font = `700 28px ${FUENTE}`;
  const lineasTema = partirLineas(x, (tema || '').toUpperCase(), W - m * 2).slice(0, 2);
  for (const l of lineasTema) { x.fillText(l, m, y); y += 36; }
  y += 6;
  x.fillStyle = '#1f3864';
  x.font = `800 46px ${FUENTE}`;
  const lineasPreg = partirLineas(x, pregunta || '', W - m * 2).slice(0, 3);
  for (const l of lineasPreg) { x.fillText(l, m, y); y += 56; }
  y += 18;

  const areaH = H - y - m;
  const areaW = W - m * 2;
  x.fillStyle = paleta.fondo;
  x.beginPath();
  x.roundRect(m, y, areaW, areaH, 28);
  x.fill();

  const items = disponer(terminos, areaW, areaH);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  for (const it of items) {
    x.save();
    x.translate(m + it.cx, y + it.cy);
    x.rotate((it.rot * Math.PI) / 180);
    x.fillStyle = colorDe(paleta, it.k);
    x.font = `800 ${it.size}px ${FUENTE}`;
    x.fillText(it.t, 0, it.size * 0.04);
    x.restore();
  }
  return c;
}

export function canvasABlob(canvas, tipo = 'image/jpeg', calidad = 0.92) {
  return new Promise((ok) => canvas.toBlob(ok, tipo, calidad));
}
