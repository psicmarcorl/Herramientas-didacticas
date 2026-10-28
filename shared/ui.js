// Utilidades de interfaz compartidas por todas las apps.
import qrcode from './qrcode.mjs';
import { modoDemo } from './db.js';

/* ───────── DOM ───────── */
// h('div', {class:'x', onclick: fn}, 'texto', otroNodo)  → siempre con textContent (seguro contra XSS)
export function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, val); else el.style[prop] = val;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v; // solo para SVG/HTML propio, nunca texto de alumnos
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export function vaciar(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/* ───────── Parámetros y enlaces ───────── */
export const param = (n) => new URLSearchParams(location.search).get(n);
// Enlace absoluto relativo a la página actual (funciona en cualquier subcarpeta de GitHub Pages).
export const enlace = (relativo) => new URL(relativo, location.href).href;

/* ───────── Aleatorios ───────── */
export function codigoAleatorio(largo, alfabeto = 'abcdefghjkmnpqrstuvwxyz23456789') {
  const a = new Uint8Array(largo);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => alfabeto[b % alfabeto.length]).join('');
}
export function hash32(texto) {
  let x = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    x ^= texto.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

/* ───────── Texto ───────── */
// Clave de unificación: sin mayúsculas, acentos, signos ni espacios extra.
export function normalizar(texto) {
  return String(texto)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ───────── Fechas (zona America/Mexico_City) ───────── */
const ZONA = 'America/Mexico_City';
function partes(ms) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const o = {};
  f.formatToParts(new Date(ms)).forEach((p) => { o[p.type] = p.value; });
  return o;
}
// 19/10/2026, 10:30 a. m.
export function fechaHora(ms) {
  if (!ms && ms !== 0) return '';
  const p = partes(ms);
  let hh = Number(p.hour);
  const suf = hh >= 12 ? 'p. m.' : 'a. m.';
  hh = hh % 12 || 12;
  return `${p.day}/${p.month}/${p.year}, ${hh}:${p.minute} ${suf}`;
}
export function soloFecha(ms) {
  const p = partes(ms);
  return `${p.day}/${p.month}/${p.year}`;
}
// ms → "2026-10-19T10:30" para <input type="datetime-local">
export function aInputLocal(ms) {
  if (!ms) return '';
  const p = partes(ms);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
// "2026-10-19T10:30" (hora de México) → ms UTC
export function deInputLocal(texto) {
  if (!texto) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(texto);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const p = partes(guess);
  const vista = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return guess - (vista - guess);
}

/* ───────── Descargas y portapapeles ───────── */
export function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch (e) {
    const t = h('textarea', { style: { position: 'fixed', opacity: '0' } });
    t.value = texto;
    document.body.append(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  }
  avisar('Enlace copiado');
}
export function nombreArchivo(texto, ext) {
  const base = normalizar(texto).replace(/\s+/g, '-').slice(0, 40) || 'archivo';
  return `${base}.${ext}`;
}
export function csv(filas) {
  const cel = (v) => {
    const s = String(v ?? '');
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // UTF-8 con BOM para que Excel muestre bien los acentos.
  return new Blob(['﻿' + filas.map((f) => f.map(cel).join(',')).join('\r\n')], {
    type: 'text/csv;charset=utf-8'
  });
}

/* ───────── QR ───────── */
export function qrSvg(texto, px = 220, color = '#000', fondo = '#fff') {
  const q = qrcode(0, 'M');
  q.addData(texto);
  q.make();
  const n = q.getModuleCount();
  const m = 2;
  let rects = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) rects += `<rect x="${c + m}" y="${r + m}" width="1.02" height="1.02"/>`;
    }
  }
  const t = n + m * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="Código QR"><rect width="${t}" height="${t}" fill="${fondo}"/><g fill="${color}">${rects}</g></svg>`;
}
export function qrNodo(texto, px = 220) {
  return h('div', { class: 'qr', html: qrSvg(texto, px) });
}
export function qrPng(texto, px = 900) {
  const q = qrcode(0, 'M');
  q.addData(texto);
  q.make();
  const n = q.getModuleCount();
  const m = 3;
  const cel = Math.floor(px / (n + m * 2));
  const lado = cel * (n + m * 2);
  const c = h('canvas', { width: lado, height: lado });
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, lado, lado);
  x.fillStyle = '#000';
  for (let r = 0; r < n; r++) {
    for (let k = 0; k < n; k++) {
      if (q.isDark(r, k)) x.fillRect((k + m) * cel, (r + m) * cel, cel, cel);
    }
  }
  return new Promise((ok) => c.toBlob(ok, 'image/png'));
}

/* ───────── Avisos y diálogos ───────── */
let contAvisos = null;
export function avisar(texto, tipo = 'ok') {
  if (!contAvisos) {
    contAvisos = h('div', { class: 'avisos', 'aria-live': 'polite' });
    document.body.append(contAvisos);
  }
  const a = h('div', { class: `aviso ${tipo}` }, texto);
  contAvisos.append(a);
  setTimeout(() => a.classList.add('sale'), 2600);
  setTimeout(() => a.remove(), 3100);
}

// Diálogo genérico. botones: [{texto, valor, clase}] → devuelve el valor elegido (o null).
export function dialogo({ titulo, cuerpo, botones }) {
  return new Promise((ok) => {
    const cierre = (v) => { fondo.remove(); document.removeEventListener('keydown', tecla); ok(v); };
    const tecla = (e) => { if (e.key === 'Escape') cierre(null); };
    const fondo = h('div', { class: 'modal-fondo', onclick: (e) => { if (e.target === fondo) cierre(null); } },
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
        h('h3', {}, titulo),
        typeof cuerpo === 'string' ? h('p', {}, cuerpo) : cuerpo,
        h('div', { class: 'modal-botones' },
          botones.map((b) => h('button', {
            class: `btn ${b.clase || ''}`, type: 'button', onclick: () => cierre(b.valor)
          }, b.texto)))));
    document.body.append(fondo);
    document.addEventListener('keydown', tecla);
    const primero = fondo.querySelector('.btn-peligro, .btn-primario') || fondo.querySelector('.btn');
    if (primero) primero.focus();
  });
}
export async function confirmar(titulo, texto, { si = 'Aceptar', no = 'Cancelar', peligro = false } = {}) {
  const r = await dialogo({
    titulo, cuerpo: texto,
    botones: [
      { texto: no, valor: false, clase: 'btn-suave' },
      { texto: si, valor: true, clase: peligro ? 'btn-peligro' : 'btn-primario' }
    ]
  });
  return r === true;
}

/* ───────── Banner de demostración ───────── */
export function bannerDemo() {
  if (!modoDemo || document.querySelector('.banner-demo')) return;
  document.body.prepend(h('div', { class: 'banner-demo' },
    'Modo demostración: los datos solo viven en este navegador. ',
    'Completa ', h('code', {}, 'shared/firebase-config.js'), ' para usarlo con tus alumnos.'));
}

/* ───────── Panel de QR grande (para proyectar) ───────── */
export function mostrarQrGrande(url, titulo) {
  const cuerpo = h('div', { class: 'qr-grande' },
    h('div', { class: 'qr', html: qrSvg(url, 420) }),
    h('p', { class: 'qr-url' }, url));
  return dialogo({ titulo: titulo || 'Código QR', cuerpo, botones: [{ texto: 'Cerrar', valor: true, clase: 'btn-primario' }] });
}
