// Ruleta animada en <canvas>: dibuja los nombres en gajos y gira hasta un gajo elegido.
import { h } from '../shared/ui.js';
import { COLORES } from './modelo.js';

const DOS_PI = Math.PI * 2;
const ARRIBA = -Math.PI / 2; // el puntero está arriba
const menosMovimiento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function crearRueda(contenedor, { alTick } = {}) {
  const lienzo = h('canvas', { class: 'rueda-lienzo', role: 'img', 'aria-label': 'Ruleta de participación' });
  contenedor.append(lienzo);
  const ctx = lienzo.getContext('2d');

  let items = [];
  let rot = 0;
  let girando = false;
  let golpe = 0; // inclinación del puntero al pasar cada gajo
  let lado = 300;

  function colorDe(i, n) {
    let c = i % COLORES.length;
    // Evita que el último gajo tenga el mismo color que el primero.
    if (n > 1 && i === n - 1 && c === 0) c = 1;
    return COLORES[c];
  }

  function recortar(texto, max) {
    if (ctx.measureText(texto).width <= max) return texto;
    let t = texto;
    while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
    return t.trimEnd() + '…';
  }

  function dibujar() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, lado, lado);
    const c = lado / 2;
    const R = lado / 2 - Math.max(10, lado * 0.035);
    const n = items.length;

    // Aro exterior con focos
    ctx.beginPath();
    ctx.arc(c, c, R + Math.max(8, lado * 0.03), 0, DOS_PI);
    ctx.fillStyle = '#2a1a4a';
    ctx.fill();
    const focos = 28;
    for (let i = 0; i < focos; i++) {
      const a = (i / focos) * DOS_PI;
      ctx.beginPath();
      ctx.arc(c + Math.cos(a) * (R + lado * 0.016), c + Math.sin(a) * (R + lado * 0.016), Math.max(2, lado * 0.007), 0, DOS_PI);
      ctx.fillStyle = i % 2 ? '#ffe9a8' : '#fff6dc';
      ctx.fill();
    }

    if (!n) {
      ctx.beginPath();
      ctx.arc(c, c, R, 0, DOS_PI);
      ctx.fillStyle = '#e7e2f2';
      ctx.fill();
    } else {
      const s = DOS_PI / n;
      const fuente = Math.max(9, Math.min(R * 0.085, s * R * 0.5));
      const maxAncho = R * 0.72;
      const tipo = (px) => `800 ${px}px Nunito, "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) {
        const a0 = rot + i * s;
        const col = colorDe(i, n);
        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.arc(c, c, R, a0, a0 + s);
        ctx.closePath();
        ctx.fillStyle = col.f;
        ctx.fill();
        if (n > 1) {
          ctx.strokeStyle = 'rgba(255,255,255,.55)';
          ctx.lineWidth = Math.max(1, lado * 0.003);
          ctx.stroke();
        }
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(a0 + s / 2);
        ctx.fillStyle = col.t;
        // Achica la letra hasta un 30 % para que quepa el nombre completo; si aún no cabe, lo recorta.
        ctx.font = tipo(fuente);
        const w = ctx.measureText(items[i].n).width;
        if (w > maxAncho) ctx.font = tipo(Math.max(fuente * 0.7, fuente * (maxAncho / w)));
        ctx.fillText(recortar(items[i].n, maxAncho), R * 0.9, 0);
        ctx.restore();
      }
    }

    // Centro
    ctx.beginPath();
    ctx.arc(c, c, R * 0.13, 0, DOS_PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = Math.max(3, lado * 0.012);
    ctx.strokeStyle = '#2a1a4a';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, R * 0.045, 0, DOS_PI);
    ctx.fillStyle = '#6a3fb5';
    ctx.fill();

    // Puntero (fijo arriba, se inclina un poco con cada gajo)
    const ancho = Math.max(14, R * 0.09);
    const largo = Math.max(26, R * 0.17);
    const yBase = c - R - lado * 0.035;
    ctx.save();
    ctx.translate(c, yBase);
    ctx.rotate(golpe);
    ctx.beginPath();
    ctx.moveTo(-ancho, 0);
    ctx.lineTo(ancho, 0);
    ctx.lineTo(0, largo);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = Math.max(2, lado * 0.008);
    ctx.strokeStyle = '#2a1a4a';
    ctx.stroke();
    ctx.restore();
  }

  function medir() {
    const r = contenedor.getBoundingClientRect();
    const nuevo = Math.max(220, Math.floor(Math.min(r.width, r.height || r.width)));
    if (nuevo === lado && lienzo.width) return;
    lado = nuevo;
    const dpr = window.devicePixelRatio || 1;
    lienzo.width = Math.round(lado * dpr);
    lienzo.height = Math.round(lado * dpr);
    lienzo.style.width = `${lado}px`;
    lienzo.style.height = `${lado}px`;
    dibujar();
  }
  const obs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
  if (obs) obs.observe(contenedor); else window.addEventListener('resize', medir);
  medir();

  // Gajo que está bajo el puntero con la rotación actual.
  function gajoBajoPuntero() {
    const n = items.length;
    if (!n) return -1;
    const s = DOS_PI / n;
    const a = (((ARRIBA - rot) % DOS_PI) + DOS_PI) % DOS_PI;
    return Math.floor(a / s) % n;
  }

  function girar(indice) {
    const n = items.length;
    if (!n || girando) return Promise.resolve(null);
    girando = true;
    const s = DOS_PI / n;
    const ajuste = n > 1 ? (Math.random() * 0.7 - 0.35) : 0; // cae en un punto distinto del gajo cada vez
    const reducido = menosMovimiento();
    const vueltas = reducido ? 1 : 5 + Math.floor(Math.random() * 3);
    let fin = ARRIBA - (indice + 0.5 + ajuste) * s;
    while (fin < rot + vueltas * DOS_PI) fin += DOS_PI;
    const inicio = rot;
    const dur = reducido ? 900 : 5200 + Math.random() * 1200;
    const t0 = performance.now();
    let ultimo = gajoBajoPuntero();

    return new Promise((ok) => {
      const paso = (ahora) => {
        const t = Math.min(1, (ahora - t0) / dur);
        const e = 1 - Math.pow(1 - t, 4);
        rot = inicio + (fin - inicio) * e;
        const g = gajoBajoPuntero();
        if (g !== ultimo) {
          ultimo = g;
          golpe = -0.45;
          if (alTick) alTick();
        }
        golpe *= 0.82;
        dibujar();
        if (t < 1) requestAnimationFrame(paso);
        else {
          rot %= DOS_PI;
          golpe = 0;
          dibujar();
          girando = false;
          ok(items[indice]);
        }
      };
      requestAnimationFrame(paso);
    });
  }

  return {
    fijar(lista) { items = lista.slice(); if (!girando) dibujar(); },
    girar,
    get girando() { return girando; },
    destruir() { if (obs) obs.disconnect(); else window.removeEventListener('resize', medir); }
  };
}

/* ───────── Sonido (Web Audio, sin archivos) ───────── */
let audio = null;
export function prepararAudio() {
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch (e) { audio = null; }
}
function nota(frec, inicio, dur, vol = 0.08, tipo = 'square') {
  if (!audio) return;
  const t = audio.currentTime + inicio;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = tipo;
  o.frequency.value = frec;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
export const sonarTick = () => nota(1900, 0, 0.03, 0.05);
export function sonarFanfarria() {
  [523, 659, 784, 1047].forEach((f, i) => nota(f, i * 0.11, i === 3 ? 0.45 : 0.14, 0.07, 'triangle'));
}
